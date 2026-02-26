const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot']
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

const uploadedFileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        default: ''
    },
    fileType: {
        type: String,
        default: ''
    }
});

const uploadedTemplateSchema = new mongoose.Schema({
    fileName: {
        type: String,
        default: ''
    },
    fileType: {
        type: String,
        default: ''
    }
});

const chatSessionSchema = new mongoose.Schema({
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
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [messageSchema],
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    aspectQuestionCounts: {type: Object, default: {
        'Product vision and goals': 0,
        'User needs and requirements': 0,
        'Target users and use cases': 0,
        'Key features and functionality': 0,
        'Success metrics and KPIs': 0,
        'Technical requirements': 0,
        'Business constraints': 0,
        'Timeline and priorities': 0
    }},
    uploadedFile: uploadedFileSchema,
    uploadedTemplate: uploadedTemplateSchema,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('prdChats', chatSessionSchema);