const express = require('express');
const router = express.Router();
const Template = require('../data_models/template');
const jwt = require('jsonwebtoken');
const User = require('../data_models/roles');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const multer = require('multer');

// Configure multer to use memory storage (don't save files to disk)
const upload = multer({ storage: multer.memoryStorage() });

// Authentication middleware
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
    } catch (err) {
        console.error('JWT error:', err);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Helper function to extract text content from buffer (no file saving)
const extractTextFromBuffer = async (buffer, fileType) => {
    try {
        if (fileType === 'txt' || fileType === 'md') {
            return buffer.toString('utf8');
        } else if (fileType === 'pdf') {
            // Use pdf-parse to extract clean text content from PDF buffer
            const data = await pdfParse(buffer);
            return data.text; // Return clean, readable text
        }
        return '';
    } catch (error) {
        console.error('Error extracting text from buffer:', error);
        throw new Error('Failed to extract text from file');
    }
};

// GET /api/templates - Get all public templates and user's own templates
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { category, search, tags } = req.query;
        
        let query = {
            $or: [
                { isPublic: true },
                { createdBy: req.user._id }
            ]
        };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$and = [
                query.$or,
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
            delete query.$or;
        }

        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            query.tags = { $in: tagArray };
        }

        const templates = await Template.find(query)
            .populate('createdBy', 'name email')
            .sort({ usageCount: -1, createdAt: -1 })
            .limit(50);

        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// GET /api/templates/:id - Get a specific template
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const template = await Template.findOne({
            _id: req.params.id,
            $or: [
                { isPublic: true },
                { createdBy: req.user._id }
            ]
        }).populate('createdBy', 'name email');

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Increment usage count
        template.usageCount += 1;
        await template.save();

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// POST /api/templates - Create a new template
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, content, tags, isPublic } = req.body;

        if (!name || !description || !content) {
            return res.status(400).json({ error: 'Name, description, and content are required' });
        }

        const template = new Template({
            name,
            description,
            content,
            tags: tags || [],
            isPublic: isPublic !== undefined ? isPublic : true,
            createdBy: req.user._id,
            category: 'Uploaded by User'
        });

        await template.save();
        await template.populate('createdBy', 'name email');

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// POST /api/templates/upload - Upload a template file (memory only, no disk storage)
router.post('/upload', authMiddleware, upload.single('templateFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { name, description, tags, isPublic } = req.body;
        const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
        
        // Extract text content from the file buffer (no file saved to disk)
        const content = await extractTextFromBuffer(req.file.buffer, fileType);

        const template = new Template({
            name: name || req.file.originalname,
            description: description || 'Uploaded template file',
            content,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            isPublic: isPublic !== undefined ? isPublic : true,
            createdBy: req.user._id,
            category: 'Uploaded by User',
            fileType
        });

        await template.save();
        await template.populate('createdBy', 'name email');

        res.status(201).json(template);
    } catch (error) {
        console.error('Error uploading template:', error);
        res.status(500).json({ error: 'Failed to upload template' });
    }
});

// PUT /api/templates/:id - Update a template
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, description, content, tags, isPublic } = req.body;

        const template = await Template.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!template) {
            return res.status(404).json({ error: 'Template not found or you do not have permission to edit it' });
        }

        if (name) template.name = name;
        if (description) template.description = description;
        if (content) template.content = content;
        if (tags) template.tags = tags;
        if (isPublic !== undefined) template.isPublic = isPublic;

        await template.save();
        await template.populate('createdBy', 'name email');

        res.json(template);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// DELETE /api/templates/:id - Delete a template
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const template = await Template.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!template) {
            return res.status(404).json({ error: 'Template not found or you do not have permission to delete it' });
        }

        await Template.findByIdAndDelete(req.params.id);
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

module.exports = router;