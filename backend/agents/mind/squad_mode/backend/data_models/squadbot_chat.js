const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const documentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['business_requirement', 'technical_overview', 'code_completeness', 'product_requirement', 'other'],
    default: 'other'
  },
  content: {
    type: String,
    required: true
  },
  analysis: {
    type: String,
    default: ''
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const squadbotChatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repoUrl: {
    type: String,
    required: true
  },
  repoName: {
    type: String,
    default: ''
  },
  embeddingPklFile: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: 'New SquadBot Chat'
  },
  messages: [messageSchema],
  documents: [documentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
squadbotChatSessionSchema.index({ userId: 1, repoUrl: 1 });
squadbotChatSessionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('SquadBotChat', squadbotChatSessionSchema);

