const AppliedProfile = require('../models/AppliedProfile');

exports.getAllProfiles = async (req, res, next) => {
  try {
    const profiles = await AppliedProfile.find({ isDeleted: false })
      .populate('requiredSkills')
      .sort({ title: 1 });

    res.json({ success: true, count: profiles.length, data: profiles });
  } catch (err) {
    next(err);
  }
};

exports.createProfile = async (req, res, next) => {
  try {
    const { title, code, description, requiredSkills, minExperienceYears } = req.body;
    if (!title || !code) {
      return res.status(400).json({ success: false, message: 'Profile title and unique code are required.' });
    }

    const profile = await AppliedProfile.create({
      title,
      code: code.toUpperCase(),
      description,
      requiredSkills: requiredSkills || [],
      minExperienceYears: minExperienceYears || 0,
      createdBy: req.user?._id
    });

    const populated = await AppliedProfile.findById(profile._id).populate('requiredSkills');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await AppliedProfile.findById(req.params.id);
    if (!profile || profile.isDeleted) return res.status(404).json({ success: false, message: 'Profile not found.' });

    Object.assign(profile, req.body);
    await profile.save();

    const populated = await AppliedProfile.findById(profile._id).populate('requiredSkills');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.deleteProfile = async (req, res, next) => {
  try {
    const profile = await AppliedProfile.findById(req.params.id);
    if (!profile || profile.isDeleted) return res.status(404).json({ success: false, message: 'Profile not found.' });

    profile.isDeleted = true;
    await profile.save();

    res.json({ success: true, message: 'Applied Profile deleted.' });
  } catch (err) {
    next(err);
  }
};
