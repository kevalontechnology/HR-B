const mongoose = require('mongoose');

const TechnicalQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, trim: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppliedProfile', required: true },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  expectedAnswer: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('TechnicalQuestion', TechnicalQuestionSchema);
