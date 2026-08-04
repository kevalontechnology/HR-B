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
    }).populate('appliedProfileId assignedTechnicalInterviewer assignedPracticalInterviewer assignedHrInterviewer');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'No candidate record found matching the details provided.' });
    }

    let interviewerName = 'Pending Auto-Assignment';
    if (candidate.stage.includes('TECHNICAL') || candidate.stage === 'RECEPTION_WAITING' || candidate.stage === 'REGISTERED') {
      if (candidate.assignedTechnicalInterviewer) {
        interviewerName = candidate.assignedTechnicalInterviewer.fullName || candidate.assignedTechnicalInterviewer.username || 'Technical Panel';
      }
    } else if (candidate.stage.includes('PRACTICAL') || candidate.stage === 'TECHNICAL_COMPLETED') {
      if (candidate.assignedPracticalInterviewer) {
        interviewerName = candidate.assignedPracticalInterviewer.fullName || candidate.assignedPracticalInterviewer.username || 'Practical Task Evaluator';
      } else if (candidate.assignedTechnicalInterviewer) {
        interviewerName = candidate.assignedTechnicalInterviewer.fullName;
      }
    } else if (candidate.stage.includes('HR') || candidate.stage === 'PRACTICAL_COMPLETED') {
      if (candidate.assignedHrInterviewer) {
        interviewerName = candidate.assignedHrInterviewer.fullName || candidate.assignedHrInterviewer.username || 'HR Panel';
      }
    }

    if (interviewerName === 'Pending Auto-Assignment') {
      const anyEmp = candidate.assignedTechnicalInterviewer || candidate.assignedPracticalInterviewer || candidate.assignedHrInterviewer;
      if (anyEmp) {
        interviewerName = anyEmp.fullName || anyEmp.username;
      }
    }

    let practicalTasks = [];
    if (candidate.stage.includes('PRACTICAL') || candidate.stage === 'TECHNICAL_COMPLETED') {
      if (candidate.assignedPracticalTasks && candidate.assignedPracticalTasks.length > 0) {
        const populatedCand = await Candidate.findById(candidate._id).populate({
          path: 'assignedPracticalTasks',
          populate: { path: 'profileId' }
        });
        practicalTasks = populatedCand.assignedPracticalTasks || [];
      } else {
        practicalTasks = await InterviewService.getRandomPracticalTasks(candidate.appliedProfileId?._id, 2);
        candidate.assignedPracticalTasks = practicalTasks.map(t => t._id);
        await candidate.save();
      }
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
        finalResult: candidate.finalResult || 'PENDING',
        assignedInterviewerName: interviewerName
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

    if (!fullName || (!email && !mobile)) {
      return res.status(400).json({ success: false, message: 'Full Name and Email or Contact No are required.' });
    }

    const count = await Candidate.countDocuments();
    const candidateCode = `CAND-${1000 + count + 1}`;

    const candidate = await Candidate.create({
      candidateCode,
      fullName,
      email: (email || `${fullName.toLowerCase().replace(/\s+/g, '')}@campus.com`).toLowerCase(),
      mobile: mobile || '0000000000',
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

exports.importCandidates = async (req, res, next) => {
  try {
    const { candidates } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: 'No candidates array provided for import.' });
    }

    const profiles = await AppliedProfile.find({ isDeleted: false });

    const findProfileId = (val) => {
      if (!val) return null;
      const oid = typeof val === 'object' && val !== null ? (val.$oid || val._id || val) : val;
      const strVal = String(oid).trim();

      const byId = profiles.find(p => p._id.toString() === strVal);
      if (byId) return byId._id;

      const byTitle = profiles.find(p => p.title.toLowerCase() === strVal.toLowerCase());
      if (byTitle) return byTitle._id;

      const byCode = profiles.find(p => p.code && p.code.toLowerCase() === strVal.toLowerCase());
      if (byCode) return byCode._id;

      const byPartial = profiles.find(p => p.title.toLowerCase().includes(strVal.toLowerCase()) || strVal.toLowerCase().includes(p.title.toLowerCase()));
      if (byPartial) return byPartial._id;

      return profiles[0]?._id || null;
    };

    let importedCount = 0;
    const count = await Candidate.countDocuments();

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!c.fullName || (!c.email && !c.mobile && !c.contactNo)) continue;

      const candidateCode = `CAND-${1000 + count + i + 1}`;
      const profileId = findProfileId(c.appliedProfile || c.appliedProfileId || c.profile);

      await Candidate.create({
        candidateCode,
        fullName: c.fullName,
        email: (c.email || `${c.fullName.toLowerCase().replace(/\s+/g, '')}@campus.com`).toLowerCase(),
        mobile: c.contactNo || c.mobile || '0000000000',
        enrollmentNo: c.enrollmentNo || '',
        collegeName: c.collegeName || '',
        branch: c.branch || '',
        semester: Number(c.semester) || 1,
        tenthPercentage: String(c.tenthPercentage || ''),
        twelfthPercentage: String(c.twelfthPercentage || ''),
        diplomaPercentage: String(c.diplomaPercentage || ''),
        currentCpiSpi: String(c.currentCpiSpi || ''),
        appliedProfileId: profileId,
        resumeUrl: c.resume || c.resumeUrl || '',
        stage: 'REGISTERED',
        createdBy: req.user?._id
      });

      importedCount++;
    }

    res.status(201).json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} candidates.` });
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
    const candidateId = req.body.candidateId;
    const roundType = req.body.roundType || req.body.stageType || req.body.stage || 'Technical';
    const rawInterviewerId = req.body.interviewerUserId || req.body.interviewerId || req.body.employeeId;
    const targetStage = req.body.targetStage;

    if (!candidateId || !roundType || !rawInterviewerId) {
      return res.status(400).json({ success: false, message: 'Candidate ID, Round Type, and Interviewer ID are required.' });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const Employee = require('../models/Employee');
    const User = require('../models/User');

    let empObj = await Employee.findById(rawInterviewerId);
    let userObj = null;

    if (empObj) {
      userObj = await User.findOne({ employeeId: empObj._id });
    } else {
      userObj = await User.findById(rawInterviewerId).populate('employeeId');
      if (userObj) {
        empObj = userObj.employeeId;
      }
    }

    const targetEmpId = empObj?._id || rawInterviewerId;
    const interviewerName = empObj?.fullName || userObj?.fullName || userObj?.username || 'Interviewer';

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

    if (userObj) {
      await NotificationService.sendNotification({
        eventKey: 'CANDIDATE_ASSIGNED',
        targetUserId: userObj._id,
        params: {
          candidateName: candidate.fullName,
          candidateCode: candidate.candidateCode,
          stageName: roundType,
          interviewerName
        }
      });
    }

    res.json({ success: true, message: `Candidate ${candidate.candidateCode} reassigned to ${interviewerName}`, candidate });
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
