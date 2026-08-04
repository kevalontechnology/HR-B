const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, default: 'System' },
  module: { type: String, required: true },
  action: { type: String, required: true }, // e.g. 'CREATE', 'UPDATE', 'DELETE', 'CHECKIN', 'AUTO_ASSIGN'
  description: { type: String, required: true },
  ipAddress: { type: String, default: '127.0.0.1' },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
