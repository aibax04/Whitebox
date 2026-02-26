const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Predefined', 'Uploaded by User'],
    default: 'Uploaded by User'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    default: 'System-Generated'
  },
  tags: [{
    type: String,
    trim: true
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  fileType: {
    type: String,
    enum: ['txt', 'md', 'doc', 'docx', 'pdf'],
    default: 'txt'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
TemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
TemplateSchema.index({ category: 1, isPublic: 1, createdBy: 1 });
TemplateSchema.index({ createdBy: 1 });
TemplateSchema.index({ tags: 1 });

module.exports = mongoose.model('Template', TemplateSchema);
