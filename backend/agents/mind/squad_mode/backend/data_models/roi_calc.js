const mongoose = require('mongoose');

const FactorSchema = new mongoose.Schema({
  name: String,
  scaleMin: Number,
  scaleMax: Number,
  weight: Number
});

const ROICalculatorSchema = new mongoose.Schema({
  name: String,
  userId: String,
  factors: [FactorSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ROI_Calculator', ROICalculatorSchema);
