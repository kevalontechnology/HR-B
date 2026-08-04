const Candidate = require('../models/Candidate');
const AppliedProfile = require('../models/AppliedProfile');
const ActivityLog = require('../models/ActivityLog');
const NotificationService = require('../services/NotificationService');
const AutoAssignService = require('../services/AutoAssignService');
const InterviewService = require('../services/InterviewService');

exports.getAllCandidates = async (req, res, next) => {
  try {
    const { search, stage, profileId, driveId, result } = req.query;
    let filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { candidateCode: { $regex: search, $options: 'i' } },
        { enrollmentNo: { $regex: search, $options: 'i' } },
        { collegeName: { $regex: search, $options: 'i' } },
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

exports.getPublicCandidateStatus = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Please enter Candidate Code, Mobile, Enrollment No, or Token No.' });
    }

    const q = query.trim();
    const candidate = await Candidate.findOne({
      isDeleted: false,
      $or: [
        { candidateCode: { $regex: `^${q}$`, $options: 'i' } },
        { tokenNumber: { $regex: `^${q}$`, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { enrollmentNo: { $regex: `^${q}$`, $options: 'i' } },
        { email: { $regex: `^${q}$`, $options: 'i' } }
      ]
    }).populate('appliedProfileId');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'No candidate record found matching the details provided.' });
    }

    let practicalTasks = [];
    if (candidate.stage.includes('PRACTICAL') || candidate.stage === 'TECHNICAL_COMPLETED') {
      practicalTasks = await InterviewService.getRandomPracticalTasks(candidate.appliedProfileId?._id, 2);
    }

    res.json({
      success: true,
      candidate: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        tokenNumber: candidate.tokenNumber || 'N/A',
        stage: candidate.stage,
        appliedProfileName: candidate.appliedProfileId?.title || candidate.appliedProfileName || 'N/A',
        collegeName: candidate.collegeName || 'N/A',
        branch: candidate.branch || 'N/A',
        checkInTime: candidate.checkInTime || null,
        finalResult: candidate.finalResult || 'PENDING'
      },
      practicalTasks: practicalTasks.map(t => ({
        taskTitle: t.taskTitle || t.title,
        taskDescription: t.taskDescription || t.problemStatement,
        maxMarks: t.maxMarks || 100,
        expectedTimeMinutes: t.expectedTimeMinutes || 45
      }))
    });
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
    const {
      fullName,
      email,
      mobile,
      enrollmentNo,
      collegeName,
      branch,
      semester,
      tenthPercentage,
      twelfthPercentage,
      diplomaPercentage,
      currentCpiSpi,
      appliedProfileId,
      skills,
      experienceYears,
      driveId,
      resumeUrl
    } = req.body;

    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, message: 'Full Name, Email, and Contact No are required.' });
    }

    const count = await Candidate.countDocuments();
    const candidateCode = `CAND-${1000 + count + 1}`;

    const candidate = await Candidate.create({
      candidateCode,
      fullName,
      email: email.toLowerCase(),
      mobile,
      enrollmentNo: enrollmentNo || '',
      collegeName: collegeName || '',
      branch: branch || '',
      semester: semester || '',
      tenthPercentage: tenthPercentage || '',
      twelfthPercentage: twelfthPercentage || '',
      diplomaPercentage: diplomaPercentage || '',
      currentCpiSpi: currentCpiSpi || '',
      appliedProfileId: appliedProfileId || null,
      skills: skills || [],
      experienceYears: experienceYears || 0,
      driveId: driveId || null,
      resumeUrl: resumeUrl || '',
      stage: 'REGISTERED',
      createdBy: req.user?._id
    });

    res.status(201).json({ success: true, data: candidate });
  } catch (err) {
    next(err);
  }
};

exports.updateCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate || candidate.isDeleted) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    Object.assign(candidate, req.body);
    await candidate.save();

    res.json({ success: true, data: candidate });
  } catch (err) {
    next(err);
  }
};

exports.manualAssignCandidate = async (req, res, next) => {
  try {
    const { candidateId, roundType, interviewerUserId, targetStage } = req.body;
    if (!candidateId || !roundType || !interviewerUserId) {
      return res.status(400).json({ success: false, message: 'Candidate ID, Round Type, and Interviewer User ID are required.' });
    }

    const User = require('../models/User');
    const targetUser = await User.findById(interviewerUserId).populate('employeeId');
    if (!targetUser) return res.status(404).json({ success: false, message: 'Target interviewer user account not found.' });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const targetEmpId = targetUser.employeeId?._id || targetUser.employeeId || interviewerUserId;

    if (roundType === 'Technical') {
      if (candidate.assignedTechnicalInterviewer) {
        await AutoAssignService.decrementQueueCount(candidate.assignedTechnicalInterviewer);
      }
      candidate.assignedTechnicalInterviewer = targetEmpId;
      candidate.stage = targetStage || 'TECHNICAL_QUEUE';
      await AutoAssignService.incrementQueueCount(targetEmpId);
    } else if (roundType === 'Practical') {
      if (candidate.assignedPracticalInterviewer) {
        await AutoAssignService.decrementQueueCount(candidate.assignedPracticalInterviewer);
      }
      candidate.assignedPracticalInterviewer = targetEmpId;
      candidate.stage = targetStage || 'PRACTICAL_QUEUE';
      await AutoAssignService.incrementQueueCount(targetEmpId);
    } else if (roundType === 'HR') {
      if (candidate.assignedHrInterviewer) {
        await AutoAssignService.decrementQueueCount(candidate.assignedHrInterviewer);
      }
      candidate.assignedHrInterviewer = targetEmpId;
      candidate.stage = targetStage || 'HR_QUEUE';
      await AutoAssignService.incrementQueueCount(targetEmpId);
    }

    await candidate.save();

    await NotificationService.sendNotification({
      eventKey: 'CANDIDATE_ASSIGNED',
      targetUserId: targetUser._id,
      params: {
        candidateName: candidate.fullName,
        candidateCode: candidate.candidateCode,
        stageName: roundType,
        interviewerName: targetUser.fullName || targetUser.username
      }
    });

    res.json({ success: true, message: `Candidate ${candidate.candidateCode} assigned to ${targetUser.fullName || targetUser.username}`, candidate });
  } catch (err) {
    next(err);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate || candidate.isDeleted) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    candidate.isDeleted = true;
    await candidate.save();

    res.json({ success: true, message: 'Candidate record soft-deleted.' });
  } catch (err) {
    next(err);
  }
};
