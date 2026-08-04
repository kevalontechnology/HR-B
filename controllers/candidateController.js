const Candidate = require('../models/Candidate');
const AppliedProfile = require('../models/AppliedProfile');
const ActivityLog = require('../models/ActivityLog');
const NotificationService = require('../services/NotificationService');
const AutoAssignService = require('../services/AutoAssignService');

exports.getAllCandidates = async (req, res, next) => {
  try {
    const { search, stage, profileId, driveId, result } = req.query;
    let filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { candidateCode: { $regex: search, $options: 'i' } },
        { tokenNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (stage) filter.stage = stage;
    if (profileId) filter.appliedProfileId = profileId;
    if (driveId) filter.driveId = driveId;
    if (result) filter.finalResult = result;

    const candidates = await Candidate.find(filter)
      .populate('appliedProfileId skills driveId assignedTechnicalInterviewer assignedPracticalInterviewer assignedHrInterviewer')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: candidates.length, data: candidates });
  } catch (err) {
    next(err);
  }
};

exports.getCandidateById = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('appliedProfileId skills driveId assignedTechnicalInterviewer assignedPracticalInterviewer assignedHrInterviewer technicalEvaluation.evaluatedBy practicalEvaluation.evaluatedBy hrEvaluation.evaluatedBy');

    if (!candidate || candidate.isDeleted) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    res.json({ success: true, data: candidate });
  } catch (err) {
    next(err);
  }
};

exports.createCandidate = async (req, res, next) => {
  try {
    const { fullName, email, mobile, appliedProfileId, skills, experienceYears, driveId, resumeUrl } = req.body;
    if (!fullName || !email || !mobile || !appliedProfileId) {
      return res.status(400).json({ success: false, message: 'Full Name, Email, Mobile, and Applied Profile are required.' });
    }

    const count = await Candidate.countDocuments();
    const candidateCode = `CAND-${1000 + count + 1}`;

    const candidate = await Candidate.create({
      candidateCode,
      fullName,
      email: email.toLowerCase(),
      mobile,
      appliedProfileId,
      skills: skills || [],
      experienceYears: experienceYears || 0,
      driveId: driveId || null,
      resumeUrl: resumeUrl || '',
      stage: 'REGISTERED',
      createdBy: req.user?._id
    });

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'CANDIDATE',
      action: 'CREATE',
      description: `Registered Candidate ${fullName} (${candidateCode})`
    });

    const populated = await Candidate.findById(candidate._id).populate('appliedProfileId skills driveId');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate || candidate.isDeleted) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    Object.assign(candidate, req.body, { updatedBy: req.user?._id });
    await candidate.save();

    const populated = await Candidate.findById(candidate._id).populate('appliedProfileId skills driveId assignedTechnicalInterviewer assignedPracticalInterviewer assignedHrInterviewer');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate || candidate.isDeleted) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    candidate.isDeleted = true;
    await candidate.save();

    res.json({ success: true, message: 'Candidate deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Excel Bulk Import Simulation
 */
exports.importCandidates = async (req, res, next) => {
  try {
    const { candidatesList } = req.body;
    if (!candidatesList || !Array.isArray(candidatesList) || candidatesList.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty candidate list.' });
    }

    const imported = [];
    const count = await Candidate.countDocuments();

    for (let i = 0; i < candidatesList.length; i++) {
      const item = candidatesList[i];
      const candidateCode = `CAND-${1000 + count + i + 1}`;

      const newCand = await Candidate.create({
        candidateCode,
        fullName: item.fullName,
        email: (item.email || `cand${Date.now()}@example.com`).toLowerCase(),
        mobile: item.mobile || '9876543210',
        appliedProfileId: item.appliedProfileId,
        skills: item.skills || [],
        experienceYears: item.experienceYears || 0,
        driveId: item.driveId || null,
        stage: 'REGISTERED',
        createdBy: req.user?._id
      });
      imported.push(newCand);
    }

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'CANDIDATE',
      action: 'IMPORT',
      description: `Bulk imported ${imported.length} candidates via Excel parser.`
    });

    await NotificationService.sendNotification({
      eventKey: 'CANDIDATE_IMPORTED',
      targetUserId: null,
      params: { count: imported.length }
    });

    res.json({ success: true, message: `Successfully imported ${imported.length} candidates.`, count: imported.length });
  } catch (err) {
    next(err);
  }
};

/**
 * Manual Assignment Override Endpoint
 */
exports.manualAssignCandidate = async (req, res, next) => {
  try {
    const { candidateId, stageType, interviewerId } = req.body;
    if (!candidateId || !stageType || !interviewerId) {
      return res.status(400).json({ success: false, message: 'Candidate ID, stage type, and interviewer ID required.' });
    }

    const result = await AutoAssignService.assignCandidateToInterviewer(candidateId, stageType, interviewerId);
    res.json({ success: true, message: `Candidate manually assigned to interviewer.`, data: result });
  } catch (err) {
    next(err);
  }
};
