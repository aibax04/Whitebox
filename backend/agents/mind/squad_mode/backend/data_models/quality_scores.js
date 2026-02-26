const mongoose = require('mongoose');

const QualityScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Each user should have only one document
  },
  qualityScores: [{
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
QualityScoreSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('QualityScore', QualityScoreSchema);
