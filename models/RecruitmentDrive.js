const mongoose = require('mongoose');

const RecruitmentDriveSchema = new mongoose.Schema({
  driveName: { type: String, required: true, trim: true },
  driveCode: { type: String, required: true, unique: true, uppercase: true },
  campusLocation: { type: String, required: true, trim: true },
  driveDate: { type: Date, required: true },
  status: { type: String, enum: ['Scheduled', 'Active', 'Completed', 'Cancelled'], default: 'Active' },
  description: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('RecruitmentDrive', RecruitmentDriveSchema);
