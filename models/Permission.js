const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  module: { type: String, required: true, trim: true }, // e.g., 'candidates', 'employees', 'panels'
  name: { type: String, required: true, trim: true },   // e.g., 'View Candidates', 'Create Candidate'
  code: { type: String, required: true, unique: true, trim: true }, // e.g., 'candidates_read', 'candidates_create'
  description: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Permission', PermissionSchema);
