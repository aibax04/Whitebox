const express = require('express');
const jwt = require('jsonwebtoken');
const FileMetadata = require('../data_models/file');
const PRD = require('../data_models/prd');
const Roadmap = require('../data_models/roadmap_meta');
const ROICalculator = require('../data_models/roi_calc');
const User = require('../data_models/roles');
const router = express.Router();

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get dashboard statistics
router.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Count documents generated (files created by user)
    const docsGenerated = await FileMetadata.countDocuments({
      generatedBy: userId
    });

    // Count roadmaps created
    const roadmapsCreated = await Roadmap.countDocuments({
      userId: userId
    });

    // Count files shared (files where user is in sharedUserIds)
    const filesShared = await FileMetadata.countDocuments({
      sharedUserIds: userId
    });

    // Count ROI calculations (PRDs that have been calculated)
    const roisCalculated = await PRD.countDocuments({
      userId: userId.toString(),
      $or: [
        { finalScore: { $exists: true, $ne: null } },
        { calculatorId: { $exists: true, $ne: null } }
      ]
    });

    res.json({
      docsGenerated,
      roadmapsCreated,
      filesShared,
      roisCalculated
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get historical data for the last 7 days
router.get('/dashboard/historical', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const historicalData = [];

    // Get data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Count documents created on this day
      const docsGenerated = await FileMetadata.countDocuments({
        generatedBy: userId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      // Count roadmaps created on this day
      const roadmapsCreated = await Roadmap.countDocuments({
        userId: userId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      // Count files shared on this day
      const filesShared = await FileMetadata.countDocuments({
        sharedUserIds: userId,
        updatedAt: { $gte: startOfDay, $lte: endOfDay }
      });

      // Count ROIs calculated on this day
      const roisCalculated = await PRD.countDocuments({
        userId: userId.toString(),
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        $or: [
          { finalScore: { $exists: true, $ne: null } },
          { calculatorId: { $exists: true, $ne: null } }
        ]
      });

      historicalData.push({
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        docsGenerated,
        roadmapsCreated,
        filesShared,
        roisCalculated
      });
    }

    res.json(historicalData);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Get recent activities
router.get('/dashboard/activities', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const activities = [];

    // Get recent file activities
    const recentFiles = await FileMetadata.find({
      $or: [
        { generatedBy: userId },
        { sharedUserIds: userId }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .populate('generatedBy', 'name');

    recentFiles.forEach(file => {
      const isOwner = file.generatedBy._id.equals(userId);
      const message = isOwner 
        ? `You created a document: ${file.fileName}`
        : `A document was shared with you: ${file.fileName}`;
      
      activities.push({
        id: file._id.toString(),
        message,
        timestamp: file.updatedAt,
        type: 'document'
      });
    });

    // Get recent PRD activities
    const recentPRDs = await PRD.find({
      userId: userId.toString()
    })
    .sort({ createdAt: -1 })
    .limit(5);

    recentPRDs.forEach(prd => {
      activities.push({
        id: prd._id.toString(),
        message: `You generated a PRD: ${prd.name}`,
        timestamp: prd.createdAt,
        type: 'document'
      });
    });

    // Get recent roadmap activities
    const recentRoadmaps = await Roadmap.find({
      userId: userId
    })
    .sort({ createdAt: -1 })
    .limit(5);

    recentRoadmaps.forEach(roadmap => {
      activities.push({
        id: roadmap._id.toString(),
        message: `You created a roadmap: ${roadmap.title}`,
        timestamp: roadmap.createdAt,
        type: 'document'
      });
    });

    // Get recent ROI activities (from PRDs that have ROI calculations)
    const recentROIs = await PRD.find({
      userId: userId.toString(),
      $or: [
        { finalScore: { $exists: true, $ne: null } },
        { calculatorId: { $exists: true, $ne: null } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5);

    recentROIs.forEach(prd => {
      activities.push({
        id: prd._id.toString(),
        message: `You calculated ROI for PRD: ${prd.name}`,
        timestamp: prd.createdAt,
        type: 'roi'
      });
    });

    // Sort all activities by timestamp and limit to 20 most recent
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    res.json(sortedActivities);
  } catch (error) {
    console.error('Error fetching dashboard activities:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

module.exports = router;
