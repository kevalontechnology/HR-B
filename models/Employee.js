const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true, uppercase: true }, // e.g. EMP-1001
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  department: { type: String, required: true, default: 'Engineering' },
  designation: { type: String, required: true, default: 'Senior Software Engineer' },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  experienceYears: { type: Number, default: 0 },
  reportingManager: { type: String, default: 'N/A' },
  capacity: { type: Number, default: 10 }, // Max interviews per day
  availability: { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Available' },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  currentQueueCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
