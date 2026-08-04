const mongoose = require('mongoose');

const PracticalTaskSchema = new mongoose.Schema({
  taskTitle: { type: String, required: true, trim: true },
  taskDescription: { type: String, required: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppliedProfile', required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  expectedTimeMinutes: { type: Number, default: 45 },
  maxMarks: { type: Number, default: 100 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('PracticalTask', PracticalTaskSchema);
