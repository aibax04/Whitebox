const express = require('express');
const router = express.Router();
const Roadmap = require('../data_models/roadmap_meta');
const { authMiddleware } = require('./documents');

// Create or upsert a task within embedded roadmap tasks by client-provided id
router.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const payload = req.body;
    const { roadmapId, id } = payload;
    if (!roadmapId) return res.status(400).json({ message: 'roadmapId required' });
    if (!id) return res.status(400).json({ message: 'client task id required' });
    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });
    const existingIndex = (roadmap.tasks || []).findIndex(t => t.id === id);
    if (existingIndex >= 0) {
      Object.assign(roadmap.tasks[existingIndex], payload);
    } else {
      roadmap.tasks.push(payload);
    }
    await roadmap.save();
    res.json(roadmap.tasks.find(t => t.id === id));
  } catch (err) {
    res.status(500).json({ message: 'Failed to upsert task', error: err.message });
  }
});

// List tasks for a roadmap (embedded)
router.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const { roadmapId } = req.query;
    if (!roadmapId) return res.status(400).json({ message: 'roadmapId required' });
    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });
    res.json(roadmap.tasks || []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
});

// Update task by client-provided id (embedded)
router.put('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    const { roadmapId } = payload;
    if (!roadmapId) return res.status(400).json({ message: 'roadmapId required in payload' });
    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });
    const index = (roadmap.tasks || []).findIndex(t => t.id === id);
    if (index < 0) return res.status(404).json({ message: 'Task not found' });
    Object.assign(roadmap.tasks[index], payload);
    await roadmap.save();
    res.json(roadmap.tasks[index]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
});

// Delete task (embedded)
router.delete('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const { roadmapId } = req.query;
    if (!roadmapId) return res.status(400).json({ message: 'roadmapId required' });
    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });
    const before = roadmap.tasks.length;
    roadmap.tasks = (roadmap.tasks || []).filter(t => t.id !== id);
    if (roadmap.tasks.length === before) return res.status(404).json({ message: 'Task not found' });
    await roadmap.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task', error: err.message });
  }
});

module.exports = router;

