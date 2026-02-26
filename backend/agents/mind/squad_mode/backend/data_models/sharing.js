const mongoose = require('mongoose');

const sharingSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: {
    role: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String }
  },
  status: { 
    type: String, 
    enum: ['Pending-User', 'Approved-User', 'Rejected-User', 'Pending-Admin', 'Approved-Admin', 'Rejected-Admin', 'Pending-Superadmin', 'Approved-Superadmin', 'Rejected-Superadmin']
  },
  hierarchy: {
    type: String,
    enum: ['user->user', 'user->admin', 'user->superadmin', 'admin->admin', 'admin->superadmin', 'admin->user', 'superadmin->admin', 'superadmin->user']
  },
  sharingStage: { type: Number }, // 1 for user, 2 for admin, 3 for superadmin
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sharing', sharingSchema);
