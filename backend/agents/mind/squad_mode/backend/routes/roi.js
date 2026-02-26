const express = require('express');
const router = express.Router();
const ROICalculator = require('../data_models/roi_calc');
const PRD = require('../data_models/prd');
const jwt = require('jsonwebtoken');
const User = require('../data_models/roles');

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

// Create a new ROI calculator
router.post('/calculator', authMiddleware, async (req, res) => {
  try {
    // Ensure the calculator is created for the authenticated user
    const calculator = new ROICalculator({
      ...req.body,
      userId: req.user._id.toString()
    });
    await calculator.save();
    res.status(201).json(calculator);
  } catch (error) {
    console.error('Error creating ROI calculator:', error);
    res.status(500).json({ error: 'Failed to create ROI calculator' });
  }
});

// Get all calculators for the authenticated user
router.get('/calculators', authMiddleware, async (req, res) => {
  try {
    const calculators = await ROICalculator.find({ userId: req.user._id.toString() });
    res.json(calculators);
  } catch (error) {
    console.error('Error fetching calculators:', error);
    res.status(500).json({ error: 'Failed to fetch calculators' });
  }
});

// Submit scores and create PRD
router.post('/submit-scores', authMiddleware, async (req, res) => {
  try {
    const { prdName, fileUrl, calculatorId, scores } = req.body;
    
    // Validate required fields
    if (!prdName || !calculatorId || !scores) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const calculator = await ROICalculator.findById(calculatorId);
    if (!calculator) {
      return res.status(404).json({ error: 'Calculator not found' });
    }

    // Ensure the calculator belongs to the authenticated user
    if (calculator.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. Calculator does not belong to you.' });
    }

    // Calculate final score using scaleMin/scaleMax
    let finalScore = 0;
    calculator.factors.forEach(factor => {
      const score = scores[factor.name] || 0;
      // Use scaleMax for denominator, fallback to 1 if invalid
      let scale = factor.scaleMax || 1;
      // Prevent division by zero
      if (typeof scale !== 'number' || isNaN(scale) || scale <= 0) scale = 1;
      finalScore += (score / scale) * factor.weight;
    });
    // Prevent NaN
    if (isNaN(finalScore)) finalScore = 0;

    const prd = new PRD({
      name: prdName,
      fileUrl,
      userId: req.user._id.toString(),
      calculatorId,
      scores,
      finalScore
    });

    await prd.save();
    res.status(201).json(prd);
  } catch (error) {
    console.error('Error submitting scores:', error);
    res.status(500).json({ error: 'Failed to submit scores' });
  }
});

// Get all PRDs for the authenticated user
router.get('/prds', authMiddleware, async (req, res) => {
  try {
    const prds = await PRD.find({ userId: req.user._id.toString() });
    res.json(prds);
  } catch (error) {
    console.error('Error fetching PRDs:', error);
    res.status(500).json({ error: 'Failed to fetch PRDs' });
  }
});
// Save PRD metadata only (no file upload)
router.post('/save-prd-metadata', authMiddleware, async (req, res) => {
  try {
    const { prdName, fileType, size } = req.body;
    if (!prdName) return res.status(400).json({ error: 'PRD name required' });
    // Save metadata in PRD collection
    const PRD = require('../data_models/prd');
    const prd = new PRD({
      name: prdName,
      userId: req.user._id.toString(),
      fileType,
      size,
      calculatorId: '',
      scores: {},
      finalScore: 0
    });
    await prd.save();
    res.status(201).json({ prdId: prd._id, fileUrl: prdName });
  } catch (error) {
    console.error('Error saving PRD metadata:', error);
    res.status(500).json({ error: 'Failed to save PRD metadata' });
  }
});
// Get a specific PRD by ID
router.get('/prd/:prdId', authMiddleware, async (req, res) => {
  try {
    const prd = await PRD.findById(req.params.prdId);
    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }
    
    // Ensure the PRD belongs to the authenticated user
    if (prd.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. PRD does not belong to you.' });
    }
    
    res.json(prd);
  } catch (error) {
    console.error('Error fetching PRD:', error);
    res.status(500).json({ error: 'Failed to fetch PRD' });
  }
});

// Get a specific calculator by ID
router.get('/calculator/:calculatorId', authMiddleware, async (req, res) => {
  try {
    const calculator = await ROICalculator.findById(req.params.calculatorId);
    if (!calculator) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    // Ensure the calculator belongs to the authenticated user
    if (calculator.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. Calculator does not belong to you.' });
    }
    
    res.json(calculator);
  } catch (error) {
    console.error('Error fetching calculator:', error);
    res.status(500).json({ error: 'Failed to fetch calculator' });
  }
});

// Update a calculator
router.put('/calculator/:calculatorId', authMiddleware, async (req, res) => {
  try {
    const calculator = await ROICalculator.findById(req.params.calculatorId);
    if (!calculator) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    // Ensure the calculator belongs to the authenticated user
    if (calculator.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. Calculator does not belong to you.' });
    }
    
    const updatedCalculator = await ROICalculator.findByIdAndUpdate(
      req.params.calculatorId,
      req.body,
      { new: true }
    );
    res.json(updatedCalculator);
  } catch (error) {
    console.error('Error updating calculator:', error);
    res.status(500).json({ error: 'Failed to update calculator' });
  }
});

// Delete a calculator
router.delete('/calculator/:calculatorId', authMiddleware, async (req, res) => {
  try {
    const calculator = await ROICalculator.findById(req.params.calculatorId);
    if (!calculator) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    // Ensure the calculator belongs to the authenticated user
    if (calculator.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. Calculator does not belong to you.' });
    }
    
    await ROICalculator.findByIdAndDelete(req.params.calculatorId);
    res.json({ message: 'Calculator deleted successfully' });
  } catch (error) {
    console.error('Error deleting calculator:', error);
    res.status(500).json({ error: 'Failed to delete calculator' });
  }
});

// Delete a PRD
router.delete('/prd/:prdId', authMiddleware, async (req, res) => {
  try {
    const prd = await PRD.findById(req.params.prdId);
    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }
    
    // Ensure the PRD belongs to the authenticated user
    if (prd.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. PRD does not belong to you.' });
    }
    
    await PRD.findByIdAndDelete(req.params.prdId);
    res.json({ message: 'PRD deleted successfully' });
  } catch (error) {
    console.error('Error deleting PRD:', error);
    res.status(500).json({ error: 'Failed to delete PRD' });
  }
});

module.exports = router;
