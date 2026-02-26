
const multer = require('multer');
const upload = multer();
const express = require('express');
const router = express.Router();
const { S3Client, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3'); 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const FileMetadata = require('../data_models/file');
const User = require('../data_models/roles');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME?.trim();

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // console.log('Received token:', token);
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Decoded JWT:', decoded);
    const user = await User.findById(decoded.id);
    // console.log('User found:', user);
    if (!user) return res.sendStatus(401);
    req.user = user;
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.sendStatus(403);
  }
};

// Get files shared with the current user
router.get('/shared-with-me', authMiddleware, async (req, res) => {
  try {
    // Find all sharing records where the current user is the sharedUserId
    const sharingRecords = await Sharing.find({ sharedUserId: req.user._id });
    // Get all fileIds from these records
    const fileIds = sharingRecords.map(s => s.fileId);
    // Fetch the actual files with populated user data
    const files = await FileMetadata.find({ _id: { $in: fileIds } })
      .populate('generatedBy', 'email name role picture');
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch shared files', error: err.message });
  }
});

module.exports = {
  router,
  authMiddleware
};

// Share document for approval to another user and save sharing data
const Sharing = require('../data_models/sharing');
router.post('/share-document/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email, remark } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const approver = await User.findOne({ email });
    if (!approver) return res.status(404).json({ message: 'Approver not found' });
    const file = await FileMetadata.findById(id);
    if (!file) return res.status(404).json({ message: 'File not found' });
    // Allow sharing if the current user is the owner or is in sharedUserIds
    const isOwner = String(file.generatedBy) === String(req.user._id);
    const isSharedUser = Array.isArray(file.sharedUserIds) && file.sharedUserIds.map(String).includes(String(req.user._id));
    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: 'You can only share files you own or that are shared with you' });
    }
    // Save sharing info in Sharing collection
    // Capitalize first letter of roles for hierarchy
    function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
    const sharing = new Sharing({
      filename: file.fileName,
      fileId: file._id,
      generatedBy: req.user._id,
      sharedUserId: approver._id,
      hierarchy: `${req.user.role}->${approver.role}`.toLowerCase(),
      sharingStage: approver.role === 'user' ? 1 : approver.role === 'admin' ? 2 : 3,
      status: `Pending-${cap(approver.role)}`,
      remarks: remark ? {
        role: req.user.role,
        userId: req.user._id,
        text: remark
      } : {}
    });
    await sharing.save();
    // Update file's sharedUserIds and currentStatus
    if (!Array.isArray(file.sharedUserIds)) file.sharedUserIds = [];
    if (!file.sharedUserIds.includes(approver._id)) file.sharedUserIds.push(approver._id);
    file.currentStatus = `Pending-${cap(approver.role)}`;
    file.hierarchy = `${req.user.role}->${approver.role}`.toLowerCase();
    file.currentStage = String(sharing.sharingStage);
    await file.save();
    res.json({ message: 'Document shared for approval', file, sharing });
  } catch (err) {
    console.error('Error in /share-document:', err);
    res.status(500).json({ message: 'Failed to share document', error: err.message, stack: err.stack });
  }
});

// Return a shared file to the previous user with remarks
router.post('/return-to-previous/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { remark } = req.body;
  try {
    const file = await FileMetadata.findById(id);
    if (!file) return res.status(404).json({ message: 'File not found' });
    // Find the last sharing record for this file where userId is the current user
    const allSharings = await Sharing.find({ fileId: id, sharedUserId: req.user._id }).sort({ createdAt: -1 });
    if (allSharings.length === 0) {
      return res.status(400).json({ message: 'No previous sharing record found' });
    }
    let previousUserId;
    let originalGeneratedBy;

    if (allSharings.length === 1){
      previousUserId = file.generatedBy;
      originalGeneratedBy = file.generatedBy;
    } else {
      previousUserId = allSharings[0].generatedBy; 
      originalGeneratedBy = allSharings[0].generatedBy;
    }
    
    // Update file arrays
    if (!Array.isArray(file.sharedUserIds)) file.sharedUserIds = [];
    if (!file.sharedUserIds.includes(previousUserId)) file.sharedUserIds.push(previousUserId);
    const prevUser = await User.findById(previousUserId);
    if (!prevUser) return res.status(404).json({ message: 'Previous user not found' });
    const status = `Pending-${capitalize(prevUser.role)}`;
    file.currentStatus = status;
    const hierarchy = `${req.user.role}->${prevUser.role}`.toLowerCase();
    file.hierarchy = hierarchy;
    file.currentStage = String(prevUser.role === 'user' ? 1 : prevUser.role === 'admin' ? 2 : 3);
    const sharing = new Sharing({
      filename: file.fileName,
      fileId: file._id,
      generatedBy: originalGeneratedBy,
      sharedUserId: previousUserId,
      hierarchy,
      sharingStage: prevUser.role === 'user' ? 1 : prevUser.role === 'admin' ? 2 : 3,
      status,
      remarks: {
        role: req.user.role,
        userId: req.user._id,
        text: remark
      }
    });
    await file.save();
    await sharing.save();
    res.json({ message: 'File returned to previous user', file, sharing });
  } catch (err) {
    console.error('Error in /return-to-previous:', err);
    res.status(500).json({ message: 'Failed to return file', error: err.message, stack: err.stack });
  }
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
});

router.put('/update-file/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const file = await FileMetadata.findById(id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const originalGeneratedBy = file.generatedBy;

    if (typeof updates.currentStatus === 'string') {
      file.currentStatus = updates.currentStatus;
    }
    if (Array.isArray(updates.sharedUserIds)) {
      if (!Array.isArray(file.sharedUserIds)) file.sharedUserIds = [];
      for (const uid of updates.sharedUserIds) {
        if (!file.sharedUserIds.includes(uid)) file.sharedUserIds.push(uid);
      }
    }
    if (typeof updates.hierarchy === 'string') {
      file.hierarchy = updates.hierarchy;
    }
    if (typeof updates.currentStage === 'string') {
      file.currentStage = updates.currentStage;
    }
    file.generatedBy = originalGeneratedBy;
    // console.log('Updating file metadata:', file);
    await file.save();
    res.json({ message: 'File metadata updated successfully', file });

  } catch (err) {
    console.error('Error updating file metadata:', err);
    res.status(500).json({ message: 'Failed to update file metadata', error: err.message });
  }
});


router.get('/s3-files', authMiddleware, async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET
    });
    const data = await s3Client.send(command);
    const files = (data.Contents || []).map(obj => ({
      key: obj.Key,
      lastModified: obj.LastModified,
      size: obj.Size
    }));
    res.json(files);
    // console.log('S3 files listed:', files);
    // console.log(process.env.AWS_REGION, process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.AWS_S3_BUCKET);
  } catch (err) {
    // console.log('Error listing S3 files:', err);
    res.status(500).json({ message: "Failed to list files" });
  }
});

router.get('/files', authMiddleware, async (req, res) => {
  // Only return files uploaded by the current user
  const files = await FileMetadata.find({ generatedBy: req.user._id })
    .populate('generatedBy', 'email name role picture');
  res.json(files);
});

// Get user's documents from S3 with content (for SquadBot document selection)
router.get('/s3-documents', authMiddleware, async (req, res) => {
  try {
    // Get all files uploaded by the current user
    const files = await FileMetadata.find({ generatedBy: req.user._id });
    
    // Filter for document types (text, pdf, etc.)
    const documentExtensions = ['.txt', '.md', '.pdf', '.doc', '.docx'];
    const documentFiles = files.filter(file => {
      const fileName = file.fileName.toLowerCase();
      return documentExtensions.some(ext => fileName.endsWith(ext));
    });

    // Fetch content for each document
    const documentsWithContent = await Promise.all(
      documentFiles.map(async (file) => {
        try {
          if (!file.s3Key) {
            return null;
          }

          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: file.s3Key
          });

          const response = await s3Client.send(command);
          
          // Read the content
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          
          // Convert to string (assuming text files)
          // For PDFs, we might need special handling, but for now try as text
          let content = '';
          try {
            content = buffer.toString('utf-8');
          } catch (e) {
            // If UTF-8 fails, might be binary (PDF), skip for now
            content = '[Binary file - content not readable]';
          }

          return {
            _id: file._id,
            fileName: file.fileName,
            s3Key: file.s3Key,
            content: content,
            lastModified: file.updatedAt,
            size: buffer.length
          };
        } catch (error) {
          console.error(`Error fetching content for ${file.fileName}:`, error);
          return {
            _id: file._id,
            fileName: file.fileName,
            s3Key: file.s3Key,
            content: null,
            error: 'Failed to fetch content',
            lastModified: file.updatedAt
          };
        }
      })
    );

    // Filter out nulls and return
    const validDocuments = documentsWithContent.filter(doc => doc !== null);
    res.json(validDocuments);
  } catch (error) {
    console.error('Error fetching S3 documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  }
});
// Upload a file to S3 and store metadata in MongoDB
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    // Generate S3 key: userId/timestamp_filename
    const s3Key = `${req.user._id}/${Date.now()}_${file.originalname}`;
    const putParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype
    };
    await s3Client.send(new (require('@aws-sdk/client-s3').PutObjectCommand)(putParams));

    // Determine status dynamically based on user role
    let status = '';
    if (req.user.role === 'user') status = 'Pending-User';
    else if (req.user.role === 'admin') status = 'Pending-Admin';
    else if (req.user.role === 'superadmin') status = 'Pending-Superadmin';
    else status = 'Pending-User'; // fallback

    // Save metadata in MongoDB
    let metadata = await FileMetadata.findOne({ fileName: file.originalname, generatedBy: req.user._id });
    if (!metadata) {
      metadata = new FileMetadata({
        fileName: file.originalname,
        generatedBy: req.user._id,
        sharedUserIds: [],
        currentStatus: status,
        currentStage: '',
        hierarchy: ''
      });
    } else {
      metadata.currentStatus = status;
    }
    await metadata.save();
    res.json({ message: 'File uploaded', file: metadata });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});


router.get('/file-url/:key', authMiddleware, async (req, res) => {
  const { key } = req.params;
  if (!key) return res.status(400).json({ message: 'File key required' });
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get file URL' });
  }
});


// Approve or reject a file (sharing is a separate action)
router.post('/file-action/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { action, remark } = req.body;
  const user = req.user;
  const file = await FileMetadata.findById(id);
  if (!file) return res.status(404).json({ message: 'File not found' });
  // Approval logic
  if (user.role === 'user') {
    if (action === 'approve') {
      file.currentStatus = 'Approved-User';
    } else if (action === 'reject') {
      file.currentStatus = 'Rejected-User';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  }
  if (user.role === 'admin') {
    if (action === 'approve') {
      file.currentStatus = 'Approved-Admin';
    } else if (action === 'reject') {
      file.currentStatus = 'Rejected-Admin';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  }
  if (user.role === 'superadmin') {
    if (action === 'approve') {
      file.currentStatus = 'Approved-Superadmin';
    } else if (action === 'reject') {
      file.currentStatus = 'Rejected-Superadmin';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  }
  await file.save();

  // Save return/approval/reject action in Sharing collection
  // Find the last sharing record for this file where sharedUserId is the current user
  const lastSharing = await Sharing.findOne({ fileId: id, sharedUserId: user._id }).sort({ createdAt: -1 });
  // Determine previous user (who shared the file to this user)
  let previousUserId = file.generatedBy;
  let hierarchy = `${user.role}->${user.role}`;
  if (lastSharing && lastSharing.generatedBy) {
    previousUserId = lastSharing.generatedBy;
    hierarchy = `${user.role}->${lastSharing.generatedBy?.role || 'user'}`;
  }
  // Save sharing/return record
  const sharing = new Sharing({
    filename: file.fileName,
    fileId: file._id,
    generatedBy: user._id, // The user taking the action
    sharedUserId: previousUserId, // The user to whom the file is returned (or just the same user for approval)
    hierarchy,
    sharingStage: user.role === 'user' ? 1 : user.role === 'admin' ? 2 : 3,
    status: file.currentStatus,
    remarks: remark ? {
      role: user.role,
      userId: user._id,
      text: remark
    } : {}
  });
  await sharing.save();

  res.json({ message: `File ${action}d by ${user.role}`, file });
});

// Rename a file (update fileName and s3Key)
router.put('/rename-file/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { newFileName } = req.body;
  
  if (!newFileName || newFileName.trim() === '') {
    return res.status(400).json({ message: 'New file name is required' });
  }

  try {
    const file = await FileMetadata.findById(id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if the current user is the owner of the file
    if (String(file.generatedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only rename your own files' });
    }

    // Check if a file with the new name already exists for this user
    const existingFile = await FileMetadata.findOne({ 
      fileName: newFileName.trim(), 
      generatedBy: req.user._id,
      _id: { $ne: id }
    });
    if (existingFile) {
      return res.status(400).json({ message: 'A file with this name already exists' });
    }

    const oldS3Key = file.s3Key;
    const newS3Key = newFileName.trim();

    // If the S3 key exists and is different, copy the object to the new key
    if (oldS3Key && oldS3Key !== newS3Key) {
      try {
        // Copy object to new key
        const copyCommand = new CopyObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          CopySource: `${process.env.AWS_S3_BUCKET}/${oldS3Key}`,
          Key: newS3Key
        });
        await s3Client.send(copyCommand);

        // Delete old object
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: oldS3Key
        });
        await s3Client.send(deleteCommand);
      } catch (s3Error) {
        console.error('Error renaming file in S3:', s3Error);
        return res.status(500).json({ message: 'Failed to rename file in S3', error: s3Error.message });
      }
    }

    // Update MongoDB metadata
    file.fileName = newFileName.trim();
    file.s3Key = newS3Key;
    await file.save();

    res.json({ message: 'File renamed successfully', file });
  } catch (err) {
    console.error('Error renaming file:', err);
    res.status(500).json({ message: 'Failed to rename file', error: err.message });
  }
});

// Delete a file from both S3 and MongoDB
router.delete('/delete-file/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const file = await FileMetadata.findById(id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if the current user is the owner of the file
    if (String(file.generatedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own files' });
    }

    // Delete from S3 if s3Key exists
    if (file.s3Key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: file.s3Key
        });
        await s3Client.send(deleteCommand);
      } catch (s3Error) {
        console.error('Error deleting from S3:', s3Error);
        // Continue with MongoDB deletion even if S3 deletion fails
      }
    }

    // Delete from MongoDB
    await FileMetadata.findByIdAndDelete(id);

    // Also delete any sharing records for this file
    const Sharing = require('../data_models/sharing');
    await Sharing.deleteMany({ fileId: id });

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ message: 'Failed to delete file', error: err.message });
  }
});

module.exports = { router, authMiddleware };
