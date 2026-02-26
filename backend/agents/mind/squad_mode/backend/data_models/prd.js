const mongoose = require('mongoose');

const PRDSchema = new mongoose.Schema({
  name: String,
  userId: String,
  calculatorId: String,
  scores: { type: Map, of: Number },
  finalScore: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PRD', PRDSchema);
