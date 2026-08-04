const Skill = require('../models/Skill');

exports.getAllSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find({ isDeleted: false }).sort({ name: 1 });
    res.json({ success: true, count: skills.length, data: skills });
  } catch (err) {
    next(err);
  }
};

exports.createSkill = async (req, res, next) => {
  try {
    const { name, category, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Skill name is required.' });

    const existing = await Skill.findOne({ name: { $regex: `^${name}$`, $options: 'i' }, isDeleted: false });
    if (existing) return res.status(400).json({ success: false, message: 'Skill already exists.' });

    const skill = await Skill.create({
      name,
      category: category || 'Engineering',
      description,
      createdBy: req.user?._id
    });

    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

exports.updateSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill || skill.isDeleted) return res.status(404).json({ success: false, message: 'Skill not found.' });

    Object.assign(skill, req.body);
    await skill.save();

    res.json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

exports.deleteSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill || skill.isDeleted) return res.status(404).json({ success: false, message: 'Skill not found.' });

    skill.isDeleted = true;
    await skill.save();

    res.json({ success: true, message: 'Skill deleted.' });
  } catch (err) {
    next(err);
  }
};
