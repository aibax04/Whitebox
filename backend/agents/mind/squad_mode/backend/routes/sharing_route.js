const express = require('express');
const router = express.Router();
const Sharing = require('../data_models/sharing');
const { authMiddleware } = require('./documents');

// Get sharing status/history for a file
router.get('/sharing-status/:fileId', authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;
    // Only show sharing status if user is involved (source or target)
    const sharingRecords = await Sharing.find({ fileId })
      .populate('generatedBy', 'email name role picture')
      .populate('sharedUserId', 'email name role picture')
      .sort({ createdAt: -1 });
    res.json(sharingRecords);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sharing status', error: err.message });
  }
});

module.exports = router;
