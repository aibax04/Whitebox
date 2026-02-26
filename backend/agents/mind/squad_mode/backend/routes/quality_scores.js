const express = require('express');
const jwt = require('jsonwebtoken');
const QualityScore = require('../data_models/quality_scores');
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

// Save quality score
router.post('/quality-scores', authMiddleware, async (req, res) => {
  try {
    const { qualityScore } = req.body;
    const userId = req.user._id;

    // Validate quality score
    if (typeof qualityScore !== 'number' || qualityScore < 0 || qualityScore > 100) {
      return res.status(400).json({ error: 'Quality score must be a number between 0 and 100' });
    }

    // Find existing quality score document for user or create new one
    let qualityScoreRecord = await QualityScore.findOne({ user: userId });
    
    if (!qualityScoreRecord) {
      // Create new document for user
      qualityScoreRecord = new QualityScore({
        user: userId,
        qualityScores: [{
          score: qualityScore,
          createdAt: new Date()
        }]
      });
    } else {
      // Append new score to existing array
      qualityScoreRecord.qualityScores.push({
        score: qualityScore,
        createdAt: new Date()
      });
    }

    await qualityScoreRecord.save();

    res.status(201).json({
      message: 'Quality score saved successfully',
      qualityScore: qualityScoreRecord
    });
  } catch (error) {
    console.error('Error saving quality score:', error);
    res.status(500).json({ error: 'Failed to save quality score' });
  }
});

// Get quality scores for dashboard
router.get('/quality-scores', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    // Get quality score document for user
    const qualityScoreRecord = await QualityScore.findOne({ user: userId });

    if (!qualityScoreRecord || !qualityScoreRecord.qualityScores.length) {
      return res.json({
        qualityScores: [],
        averageScore: 0,
        latestScore: 0,
        totalAnalyses: 0
      });
    }

    // Sort scores by creation date (newest first) and limit
    const sortedScores = qualityScoreRecord.qualityScores
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    // Calculate average score
    const allScores = qualityScoreRecord.qualityScores.map(item => item.score);
    const averageScore = allScores.length > 0 
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

    // Get latest score
    const latestScore = sortedScores.length > 0 ? sortedScores[0].score : 0;

    res.json({
      qualityScores: sortedScores.map(score => ({
        id: score._id || score.createdAt.getTime().toString(),
        qualityScore: score.score,
        createdAt: score.createdAt
      })),
      averageScore,
      latestScore,
      totalAnalyses: allScores.length
    });
  } catch (error) {
    console.error('Error fetching quality scores:', error);
    res.status(500).json({ error: 'Failed to fetch quality scores' });
  }
});

// Get quality scores for chart data (last 30 days)
router.get('/quality-scores/chart', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get quality score document for user
    const qualityScoreRecord = await QualityScore.findOne({ user: userId });

    if (!qualityScoreRecord || !qualityScoreRecord.qualityScores.length) {
      return res.json([]);
    }

    // Filter scores from the last 30 days
    const recentScores = qualityScoreRecord.qualityScores.filter(score => 
      new Date(score.createdAt) >= thirtyDaysAgo
    );

    // Group by date and calculate average for each day
    const chartData = [];
    const scoresByDate = {};

    recentScores.forEach(score => {
      const date = new Date(score.createdAt).toISOString().split('T')[0];
      if (!scoresByDate[date]) {
        scoresByDate[date] = [];
      }
      scoresByDate[date].push(score.score);
    });

    // Calculate average for each day
    Object.keys(scoresByDate).forEach(date => {
      const scores = scoresByDate[date];
      const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      chartData.push({
        date,
        qualityScore: average
      });
    });

    // Sort by date
    chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching quality scores chart data:', error);
    res.status(500).json({ error: 'Failed to fetch quality scores chart data' });
  }
});

module.exports = router;
