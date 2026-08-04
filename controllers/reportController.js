const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const RecruitmentDrive = require('../models/RecruitmentDrive');

/**
 * Dashboard & System Summary Metrics
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCandidates,
      todayInterviews,
      waitingQueue,
      technicalRunning,
      practicalRunning,
      hrRunning,
      selectedCount,
      holdCount,
      rejectedCount,
      totalEmployees,
      activeDrives
    ] = await Promise.all([
      Candidate.countDocuments({ isDeleted: false }),
      Candidate.countDocuments({ checkInTime: { $gte: today }, isDeleted: false }),
      Candidate.countDocuments({ stage: { $in: ['RECEPTION_WAITING', 'TECHNICAL_QUEUE', 'PRACTICAL_QUEUE', 'HR_QUEUE'] }, isDeleted: false }),
      Candidate.countDocuments({ stage: 'TECHNICAL_IN_PROGRESS', isDeleted: false }),
      Candidate.countDocuments({ stage: 'PRACTICAL_IN_PROGRESS', isDeleted: false }),
      Candidate.countDocuments({ stage: 'HR_IN_PROGRESS', isDeleted: false }),
      Candidate.countDocuments({ finalResult: 'SELECTED', isDeleted: false }),
      Candidate.countDocuments({ finalResult: 'HOLD', isDeleted: false }),
      Candidate.countDocuments({ finalResult: 'REJECTED', isDeleted: false }),
      Employee.countDocuments({ isDeleted: false, status: 'Active' }),
      RecruitmentDrive.countDocuments({ status: 'Active', isDeleted: false })
    ]);

    res.json({
      success: true,
      stats: {
        totalCandidates,
        todayInterviews,
        waitingQueue,
        technicalRunning,
        practicalRunning,
        hrRunning,
        selectedCount,
        holdCount,
        rejectedCount,
        totalEmployees,
        activeDrives
      }
    });
  } catch (err) {
    next(err);
  }
};
