const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    swimlaneId: { type: String, required: true },
    swimlaneName: { type: String },
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    color: { type: String, default: '#888888' },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: '' },
    status: { type: String, enum: ['not-started', 'in-progress', 'completed', 'blocked'], default: 'not-started' },
    assignee: { type: String, default: '' },
    attachments: { type: [String], default: [] },
    comments: { type: [String], default: [] },
    notes: { type: String, default: '' },
    labels: { type: [String], default: [] }
  },
  { _id: false }
);

const MilestoneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, default: '' }
  },
  { _id: false }
);

const SwimlaneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#888888' }
  },
  { _id: false }
);

const RoadmapSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    prdFileName: { type: String },
    title: { type: String, required: true },
    overview: { type: String, default: '' },
    projectStartDate: { type: String },
    projectEndDate: { type: String },
    timeframe: {
      startYear: { type: Number },
      endYear: { type: Number },
      quarters: [{ type: String }]
    },
    tasks: [TaskSchema],
    swimlanes: [SwimlaneSchema],
    milestones: [MilestoneSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Roadmap', RoadmapSchema);


