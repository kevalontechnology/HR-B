const ActivityLog = require('../models/ActivityLog');

exports.getActivityLogs = async (req, res, next) => {
  try {
    const { module, action } = req.query;
    let filter = {};

    if (module) filter.module = module;
    if (action) filter.action = action;

    const logs = await ActivityLog.find(filter)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
};
