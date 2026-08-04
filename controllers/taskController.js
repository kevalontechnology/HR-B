const PracticalTask = require('../models/PracticalTask');

exports.getAllTasks = async (req, res, next) => {
  try {
    const { profileId, difficulty } = req.query;
    let filter = { isDeleted: false };

    if (profileId) filter.profileId = profileId;
    if (difficulty) filter.difficulty = difficulty;

    const tasks = await PracticalTask.find(filter)
      .populate('profileId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { taskTitle, taskDescription, profileId, difficulty, expectedTimeMinutes, maxMarks, status } = req.body;
    if (!taskTitle || !taskDescription || !profileId) {
      return res.status(400).json({ success: false, message: 'Task Title, Description, and Profile are required.' });
    }

    const task = await PracticalTask.create({
      taskTitle,
      taskDescription,
      profileId,
      difficulty: difficulty || 'Medium',
      expectedTimeMinutes: expectedTimeMinutes || 45,
      maxMarks: maxMarks || 100,
      status: status || 'Active',
      createdBy: req.user?._id
    });

    const populated = await PracticalTask.findById(task._id).populate('profileId');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await PracticalTask.findById(req.params.id);
    if (!task || task.isDeleted) return res.status(404).json({ success: false, message: 'Task not found.' });

    Object.assign(task, req.body);
    await task.save();

    const populated = await PracticalTask.findById(task._id).populate('profileId');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdateTasks = async (req, res, next) => {
  try {
    const { ids, updateData } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Task IDs required for bulk update.' });
    }

    await PracticalTask.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );

    res.json({ success: true, message: `Successfully bulk updated ${ids.length} tasks.` });
  } catch (err) {
    next(err);
  }
};

exports.bulkDeleteTasks = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Task IDs required for bulk delete.' });
    }

    await PracticalTask.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    );

    res.json({ success: true, message: `Successfully deleted ${ids.length} tasks.` });
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await PracticalTask.findById(req.params.id);
    if (!task || task.isDeleted) return res.status(404).json({ success: false, message: 'Task not found.' });

    task.isDeleted = true;
    await task.save();

    res.json({ success: true, message: 'Practical Task deleted.' });
  } catch (err) {
    next(err);
  }
};
