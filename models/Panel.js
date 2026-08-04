const mongoose = require('mongoose');

const PanelSchema = new mongoose.Schema({
  panelName: { type: String, required: true, trim: true },
  panelType: { type: String, enum: ['Technical', 'Practical', 'HR'], required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  targetSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  appliedProfiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AppliedProfile' }],
  maxCapacityPerInterviewer: { type: Number, default: 10 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Panel', PanelSchema);
