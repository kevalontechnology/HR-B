const Panel = require('../models/Panel');
const ActivityLog = require('../models/ActivityLog');

exports.getAllPanels = async (req, res, next) => {
  try {
    const panels = await Panel.find({ isDeleted: false })
      .populate({
        path: 'members',
        populate: { path: 'skills roleId' }
      })
      .populate('targetSkills appliedProfiles')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: panels.length, data: panels });
  } catch (err) {
    next(err);
  }
};

exports.createPanel = async (req, res, next) => {
  try {
    const { panelName, panelType, members, targetSkills, appliedProfiles, maxCapacityPerInterviewer, status } = req.body;
    if (!panelName || !panelType) {
      return res.status(400).json({ success: false, message: 'Panel Name and Panel Type are required.' });
    }

    const panel = await Panel.create({
      panelName,
      panelType,
      members: members || [],
      targetSkills: targetSkills || [],
      appliedProfiles: appliedProfiles || [],
      maxCapacityPerInterviewer: maxCapacityPerInterviewer || 10,
      status: status || 'Active',
      createdBy: req.user?._id
    });

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'PANEL',
      action: 'CREATE',
      description: `Created Panel: ${panelName} (${panelType})`
    });

    const populated = await Panel.findById(panel._id).populate('members targetSkills appliedProfiles');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updatePanel = async (req, res, next) => {
  try {
    const panel = await Panel.findById(req.params.id);
    if (!panel || panel.isDeleted) return res.status(404).json({ success: false, message: 'Panel not found.' });

    Object.assign(panel, req.body, { updatedBy: req.user?._id });
    await panel.save();

    const populated = await Panel.findById(panel._id).populate('members targetSkills appliedProfiles');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.deletePanel = async (req, res, next) => {
  try {
    const panel = await Panel.findById(req.params.id);
    if (!panel || panel.isDeleted) return res.status(404).json({ success: false, message: 'Panel not found.' });

    panel.isDeleted = true;
    await panel.save();

    res.json({ success: true, message: 'Panel deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
