const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  s3Key: { type: String, required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentStatus: {
    type: String,
    enum: ['Pending-User', 'Approved-User', 'Rejected-User', 'Pending-Admin', 'Approved-Admin',  'Rejected-Admin','Pending-Superadmin', 'Approved-Superadmin', 'Rejected-Superadmin']
  },
  currentStage: { type: String },
  hierarchy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
