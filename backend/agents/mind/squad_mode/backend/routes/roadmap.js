const express = require('express');
const router = express.Router();
const Roadmap = require('../data_models/roadmap_meta');
const { authMiddleware } = require('./documents');

// Create or update a roadmap (upsert)
router.post('/roadmaps', authMiddleware, async (req, res) => {
  try {
    const { _id, ...payload } = req.body || {};
    const filter = _id ? { _id, userId: req.user._id } : { userId: req.user._id, title: payload.title };
    const update = { ...payload, userId: req.user._id };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const roadmap = await Roadmap.findOneAndUpdate(filter, update, options);
    res.json(roadmap);
  } catch (err) {
    console.error('Error upserting roadmap:', err);
    res.status(500).json({ message: 'Failed to save roadmap', error: err.message });
  }
});

// Get all roadmaps for current user
router.get('/roadmaps', authMiddleware, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(roadmaps);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch roadmaps', error: err.message });
  }
});

// Get single roadmap with embedded tasks
router.get('/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'Not found' });
    res.json({ roadmap });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch roadmap', error: err.message });
  }
});

// Delete roadmap (tasks are embedded)
router.delete('/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete', error: err.message });
  }
});

module.exports = router;


