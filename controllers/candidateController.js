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
 * Excel Bulk Import Parser
 * Accepts exact Excel headers:
 * - Email Address
 * - Full Name
 * - Enrollment No.
 * - Contact No.
 * - Profile Applied for
 * - College Name
 * - Branch
 * - Semester
 * - Percentage in 10th
 * - Percentage in 12th
 * - Percentage in Diploma
 * - Current CPI/SPI
 * - Submit Resume
 */
exports.importCandidates = async (req, res, next) => {
  try {
    const { candidatesList } = req.body;
    if (!candidatesList || !Array.isArray(candidatesList) || candidatesList.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty candidate list.' });
    }

    const profiles = await AppliedProfile.find({ isDeleted: false });

    // Robust Applied Profile resolution helper supporting BSON $oid objects, titles, and codes
    const findProfileId = (val) => {
      if (!val) return null;
      let strVal = '';
      if (typeof val === 'object') {
        strVal = String(val.$oid || val._id || val.title || '').trim();
      } else {
        strVal = String(val).trim();
      }

      if (!strVal) return null;
      const lowerVal = strVal.toLowerCase();

      // 1. Direct MongoDB ObjectId match
      const byId = profiles.find(p => p._id.toString() === strVal || p._id.toString() === lowerVal);
      if (byId) return byId._id;

      // 2. Exact Title match (case-insensitive)
      const byTitle = profiles.find(p => p.title.toLowerCase() === lowerVal);
      if (byTitle) return byTitle._id;

      // 3. Exact Code match (e.g. PROF_PYTHON)
      const byCode = profiles.find(p => p.code.toLowerCase() === lowerVal);
      if (byCode) return byCode._id;

      // 4. Partial / Fuzzy Title match (e.g. "python" in "Python Django Developer")
      const byPartial = profiles.find(p => p.title.toLowerCase().includes(lowerVal) || lowerVal.includes(p.title.toLowerCase()));
      if (byPartial) return byPartial._id;

      return null;
    };

    const imported = [];
    const count = await Candidate.countDocuments();

    for (let i = 0; i < candidatesList.length; i++) {
      const item = candidatesList[i];
      const candidateCode = `CAND-${1000 + count + i + 1}`;

      // Map exact Excel Headers or BSON JSON keys
      const email = item['Email Address'] || item.email || `cand${Date.now()}_${i}@example.com`;
      const fullName = item['Full Name'] || item.fullName || 'Candidate';
      const enrollmentNo = item['Enrollment No.'] || item.enrollmentNo || '';
      const mobile = String(item['Contact No.'] || item.contactNo || item.mobile || '9876543210');
      
      const rawProfileInput = item['appliedProfile'] || item['appliedProfileId'] || item.appliedProfileId || item['Profile Applied for'] || item.appliedProfileName || item.profile || '';
      const matchedProfileId = findProfileId(rawProfileInput);

      const collegeName = item['College Name'] || item.collegeName || '';
      const branch = item['Branch'] || item.branch || '';
      const semester = String(item['Semester'] || item.semester || '');
      const tenthPercentage = String(item['Percentage in 10th'] || item.tenthPercentage || '');
      const twelfthPercentage = String(item['Percentage in 12th'] || item.twelfthPercentage || '');
      const diplomaPercentage = String(item['Percentage in Diploma'] || item.diplomaPercentage || '');
      const currentCpiSpi = String(item['Current CPI/SPI'] || item.currentCpiSpi || '');
      const resumeUrl = item['Submit Resume'] || item.resume || item.resumeUrl || '';

      const profileNameStr = typeof rawProfileInput === 'object' 
        ? (rawProfileInput.$oid || rawProfileInput.title || JSON.stringify(rawProfileInput)) 
        : String(rawProfileInput);

      const newCand = await Candidate.create({
        candidateCode,
        fullName,
        email: email.toLowerCase().trim(),
        mobile,
        enrollmentNo,
        collegeName,
        branch,
        semester,
        tenthPercentage,
        twelfthPercentage,
        diplomaPercentage,
        currentCpiSpi,
        appliedProfileId: matchedProfileId || (profiles[0]?._id || null),
        appliedProfileName: profileNameStr,
        resumeUrl,
        stage: 'REGISTERED',
        createdBy: req.user?._id
      });

      imported.push(newCand);
    }

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'CANDIDATE',
      action: 'IMPORT',
      description: `Bulk imported ${imported.length} campus candidates with academic performance records.`
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
