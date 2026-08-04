const Candidate = require('../models/Candidate');
const ActivityLog = require('../models/ActivityLog');
const AutoAssignService = require('../services/AutoAssignService');
const NotificationService = require('../services/NotificationService');

/**
 * Candidate Check-in at Reception
 */
exports.checkInCandidate = async (req, res, next) => {
  try {
    const { candidateId } = req.body;
    if (!candidateId) return res.status(400).json({ success: false, message: 'Candidate ID is required.' });

    const candidate = await Candidate.findById(candidateId).populate('appliedProfileId');
    if (!candidate || candidate.isDeleted) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    // Generate Token Number
    const countCheckedIn = await Candidate.countDocuments({ checkInTime: { $ne: null } });
    const tokenNumber = `TK-${100 + countCheckedIn + 1}`;

    candidate.tokenNumber = tokenNumber;
    candidate.checkInTime = new Date();
    candidate.stage = 'RECEPTION_WAITING';
    await candidate.save();

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'RECEPTION',
      action: 'CHECK_IN',
      description: `Candidate ${candidate.fullName} checked in at reception. Assigned Token: ${tokenNumber}`
    });

    await NotificationService.sendNotification({
      eventKey: 'CANDIDATE_CHECKIN',
      targetUserId: null,
      params: { candidateName: candidate.fullName, tokenNumber }
    });

    // Auto assign candidate to Technical Interview Panel
    const assignResult = await AutoAssignService.assignCandidateToInterviewer(candidate._id, 'Technical');

    res.json({
      success: true,
      message: `Candidate checked in successfully. Assigned Token: ${tokenNumber}`,
      tokenNumber,
      candidate,
      autoAssignment: assignResult
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current reception waiting queue & live status
 */
exports.getWaitingQueue = async (req, res, next) => {
  try {
    const queue = await Candidate.find({
      stage: { $in: ['RECEPTION_WAITING', 'TECHNICAL_QUEUE', 'PRACTICAL_QUEUE', 'HR_QUEUE'] },
      isDeleted: false
    })
    .populate('appliedProfileId assignedTechnicalInterviewer assignedPracticalInterviewer assignedHrInterviewer')
    .sort({ checkInTime: 1 });

    res.json({ success: true, count: queue.length, data: queue });
  } catch (err) {
    next(err);
  }
};
