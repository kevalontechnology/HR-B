const mongoose = require('mongoose');

const NotificationTemplateSchema = new mongoose.Schema({
  eventKey: { type: String, required: true, unique: true }, // e.g. 'CANDIDATE_CHECKIN', 'CANDIDATE_ASSIGNED', 'INTERVIEW_COMPLETED'
  eventName: { type: String, required: true },
  titleTemplate: { type: String, required: true },
  bodyTemplate: { type: String, required: true },
  channels: [{ type: String, enum: ['In-App', 'Email', 'WhatsApp'], default: 'In-App' }],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('NotificationTemplate', NotificationTemplateSchema);
