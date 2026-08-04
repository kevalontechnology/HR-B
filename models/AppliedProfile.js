const mongoose = require('mongoose');

const AppliedProfileSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true, trim: true }, // e.g. MERN Stack Developer, UI/UX Designer
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  requiredSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  minExperienceYears: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AppliedProfile', AppliedProfileSchema);
