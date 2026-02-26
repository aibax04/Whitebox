const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  picture: String,
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'user'],
    default: 'user'
  },
  // GitHub OAuth fields
  githubAccessToken: {
    type: String,
    default: null
  },
  githubUsername: {
    type: String,
    default: null
  },
  githubId: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('User', userSchema);