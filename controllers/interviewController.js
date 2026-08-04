const Candidate = require('../models/Candidate');
const InterviewService = require('../services/InterviewService');
const AutoAssignService = require('../services/AutoAssignService');
const ActivityLog = require('../models/ActivityLog');
const NotificationService = require('../services/NotificationService');

/**
 * TECHNICAL INTERVIEW WORKSTATION
 */
exports.getTechnicalQuestionsForCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId)
      .populate('appliedProfileId')
      .populate({
        path: 'assignedTechnicalQuestions',
        populate: { path: 'skillId profileId' }
      });

    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    let questions = candidate.assignedTechnicalQuestions || [];

    // If no questions assigned yet, generate & persist them permanently on Candidate document
    if (!questions || questions.length === 0) {
      const generated = await InterviewService.getRandomTechnicalQuestions(candidate.appliedProfileId?._id, 10);
      candidate.assignedTechnicalQuestions = generated.map(q => q._id);
      candidate.stage = 'TECHNICAL_IN_PROGRESS';
      await candidate.save();
      questions = generated;
    } else {
      if (candidate.stage === 'TECHNICAL_QUEUE') {
        candidate.stage = 'TECHNICAL_IN_PROGRESS';
        await candidate.save();
      }
    }

    res.json({ success: true, candidate, questions });
  } catch (err) {
    next(err);
  }
};

exports.submitTechnicalEvaluation = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { questions, verdict, remarks } = req.body; // verdict: 'PASS' | 'HOLD' | 'FAIL'

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const passedCount = (questions || []).filter(q => q.isCorrect).length;
    const totalCount = (questions || []).length || 10;
    const scorePercentage = Math.round((passedCount / totalCount) * 100);

    candidate.technicalEvaluation = {
      score: scorePercentage,
      totalQuestions: totalCount,
      passedQuestions: passedCount,
      verdict: verdict || 'HOLD',
      remarks: remarks || '',
      evaluatedBy: req.user?.employeeId || null,
      evaluatedAt: new Date(),
      questions: questions || []
    };

    if (verdict === 'PASS') {
      candidate.stage = 'TECHNICAL_COMPLETED';
      await candidate.save();

      // Auto assign to Practical Interview Panel
      await AutoAssignService.assignCandidateToInterviewer(candidate._id, 'Practical');
    } else if (verdict === 'HOLD') {
      candidate.stage = 'HOLD';
      candidate.finalResult = 'HOLD';
      await candidate.save();
    } else {
      candidate.stage = 'REJECTED';
      candidate.finalResult = 'REJECTED';
      await candidate.save();
    }

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'INTERVIEW_TECHNICAL',
      action: 'EVALUATE',
      description: `Technical Evaluation completed for ${candidate.fullName}. Verdict: ${verdict} (${scorePercentage}%)`
    });

    await NotificationService.sendNotification({
      eventKey: 'INTERVIEW_COMPLETED',
      targetUserId: null,
      params: { candidateName: candidate.fullName, stageName: 'Technical', verdict }
    });

    res.json({ success: true, message: `Technical evaluation recorded successfully.`, candidate });
  } catch (err) {
    next(err);
  }
};

/**
 * PRACTICAL INTERVIEW WORKSTATION
 */
exports.getPracticalTasksForCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId)
      .populate('appliedProfileId')
      .populate({
        path: 'assignedPracticalTasks',
        populate: { path: 'profileId' }
      });

    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    let tasks = candidate.assignedPracticalTasks || [];

    // If no practical tasks assigned yet, generate & persist them permanently on Candidate document
    if (!tasks || tasks.length === 0) {
      const generated = await InterviewService.getRandomPracticalTasks(candidate.appliedProfileId?._id, 2);
      candidate.assignedPracticalTasks = generated.map(t => t._id);
      candidate.stage = 'PRACTICAL_IN_PROGRESS';
      await candidate.save();
      tasks = generated;
    } else {
      if (candidate.stage === 'PRACTICAL_QUEUE' || candidate.stage === 'TECHNICAL_COMPLETED') {
        candidate.stage = 'PRACTICAL_IN_PROGRESS';
        await candidate.save();
      }
    }

    res.json({ success: true, candidate, tasks });
  } catch (err) {
    next(err);
  }
};

exports.submitPracticalEvaluation = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { tasks, verdict, remarks } = req.body; // verdict: 'PASS' | 'HOLD' | 'FAIL'

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const totalMaxMarks = (tasks || []).reduce((acc, t) => acc + (t.maxMarks || 50), 0) || 100;
    const totalObtainedMarks = (tasks || []).reduce((acc, t) => acc + (Number(t.marksObtained) || 0), 0);
    const scorePercentage = Math.round((totalObtainedMarks / totalMaxMarks) * 100);

    candidate.practicalEvaluation = {
      score: scorePercentage,
      totalTasks: (tasks || []).length || 2,
      verdict: verdict || 'HOLD',
      remarks: remarks || '',
      evaluatedBy: req.user?.employeeId || null,
      evaluatedAt: new Date(),
      tasks: tasks || []
    };

    if (verdict === 'PASS') {
      candidate.stage = 'PRACTICAL_COMPLETED';
      await candidate.save();

      // Auto assign to HR Evaluation Panel
      await AutoAssignService.assignCandidateToInterviewer(candidate._id, 'HR');
    } else if (verdict === 'HOLD') {
      candidate.stage = 'HOLD';
      candidate.finalResult = 'HOLD';
      await candidate.save();
    } else {
      candidate.stage = 'REJECTED';
      candidate.finalResult = 'REJECTED';
      await candidate.save();
    }

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'INTERVIEW_PRACTICAL',
      action: 'EVALUATE',
      description: `Practical Evaluation completed for ${candidate.fullName}. Verdict: ${verdict} (${scorePercentage}%)`
    });

    await NotificationService.sendNotification({
      eventKey: 'INTERVIEW_COMPLETED',
      targetUserId: null,
      params: { candidateName: candidate.fullName, stageName: 'Practical', verdict }
    });

    res.json({ success: true, message: `Practical evaluation recorded successfully.`, candidate });
  } catch (err) {
    next(err);
  }
};

/**
 * HR EVALUATION WORKSTATION
 */
exports.submitHrEvaluation = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { communicationScore, behaviorScore, confidenceScore, verdict, remarks } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    candidate.hrEvaluation = {
      communicationScore: Number(communicationScore) || 0,
      behaviorScore: Number(behaviorScore) || 0,
      confidenceScore: Number(confidenceScore) || 0,
      verdict: verdict || 'HOLD',
      remarks: remarks || '',
      evaluatedBy: req.user?.employeeId || null,
      evaluatedAt: new Date()
    };

    if (verdict === 'SELECTED') {
      candidate.stage = 'SELECTED';
      candidate.finalResult = 'SELECTED';
    } else if (verdict === 'HOLD') {
      candidate.stage = 'HOLD';
      candidate.finalResult = 'HOLD';
    } else {
      candidate.stage = 'REJECTED';
      candidate.finalResult = 'REJECTED';
    }

    await candidate.save();

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'INTERVIEW_HR',
      action: 'EVALUATE',
      description: `HR Evaluation completed for ${candidate.fullName}. Verdict: ${verdict}`
    });

    await NotificationService.sendNotification({
      eventKey: 'CANDIDATE_HIRED',
      targetUserId: null,
      params: { candidateName: candidate.fullName, verdict }
    });

    res.json({ success: true, message: `HR Evaluation recorded. Candidate status: ${verdict}`, candidate });
  } catch (err) {
    next(err);
  }
};
