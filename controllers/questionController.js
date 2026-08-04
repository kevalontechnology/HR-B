const TechnicalQuestion = require('../models/TechnicalQuestion');

exports.getAllQuestions = async (req, res, next) => {
  try {
    const { profileId, skillId, difficulty } = req.query;
    let filter = { isDeleted: false };

    if (profileId) filter.profileId = profileId;
    if (skillId) filter.skillId = skillId;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await TechnicalQuestion.find(filter)
      .populate('profileId skillId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: questions.length, data: questions });
  } catch (err) {
    next(err);
  }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const { questionText, profileId, skillId, difficulty, expectedAnswer, status } = req.body;
    if (!questionText || !profileId || !skillId) {
      return res.status(400).json({ success: false, message: 'Question text, profile, and skill are required.' });
    }

    const question = await TechnicalQuestion.create({
      questionText,
      profileId,
      skillId,
      difficulty: difficulty || 'Medium',
      expectedAnswer: expectedAnswer || '',
      status: status || 'Active',
      createdBy: req.user?._id
    });

    const populated = await TechnicalQuestion.findById(question._id).populate('profileId skillId');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await TechnicalQuestion.findById(req.params.id);
    if (!question || question.isDeleted) return res.status(404).json({ success: false, message: 'Question not found.' });

    Object.assign(question, req.body);
    await question.save();

    const populated = await TechnicalQuestion.findById(question._id).populate('profileId skillId');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdateQuestions = async (req, res, next) => {
  try {
    const { ids, updateData } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Question IDs required for bulk update.' });
    }

    await TechnicalQuestion.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );

    res.json({ success: true, message: `Successfully bulk updated ${ids.length} questions.` });
  } catch (err) {
    next(err);
  }
};

exports.bulkDeleteQuestions = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Question IDs required for bulk delete.' });
    }

    await TechnicalQuestion.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    );

    res.json({ success: true, message: `Successfully deleted ${ids.length} questions.` });
  } catch (err) {
    next(err);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await TechnicalQuestion.findById(req.params.id);
    if (!question || question.isDeleted) return res.status(404).json({ success: false, message: 'Question not found.' });

    question.isDeleted = true;
    await question.save();

    res.json({ success: true, message: 'Question deleted.' });
  } catch (err) {
    next(err);
  }
};
