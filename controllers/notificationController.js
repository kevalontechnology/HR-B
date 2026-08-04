const NotificationTemplate = require('../models/NotificationTemplate');
const Notification = require('../models/Notification');

exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await NotificationTemplate.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, count: templates.length, data: templates });
  } catch (err) {
    next(err);
  }
};

exports.createTemplate = async (req, res, next) => {
  try {
    const { eventKey, eventName, titleTemplate, bodyTemplate, channels, status } = req.body;
    if (!eventKey || !eventName || !titleTemplate || !bodyTemplate) {
      return res.status(400).json({ success: false, message: 'Event key, name, title, and body templates required.' });
    }

    const template = await NotificationTemplate.create({
      eventKey,
      eventName,
      titleTemplate,
      bodyTemplate,
      channels: channels || ['In-App'],
      status: status || 'Active'
    });

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });

    Object.assign(template, req.body);
    await template.save();

    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });

    template.isDeleted = true;
    await template.save();

    res.json({ success: true, message: 'Template deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.getUserNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({ success: true, count: notifications.length, unreadCount, data: notifications });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};
