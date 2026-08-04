const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase(), isDeleted: false })
      .populate({
        path: 'roleId',
        populate: { path: 'permissions' }
      })
      .populate('employeeId');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'User account is inactive.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.roleId?.code },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.roleId,
        employee: user.employeeId
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.candidateLogin = async (req, res, next) => {
  try {
    const { email, mobile } = req.body;
    if (!email || !mobile) {
      return res.status(400).json({ success: false, message: 'Both Email Address AND Mobile Number are strictly required for Candidate Login.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    const Candidate = require('../models/Candidate');
    const candidate = await Candidate.findOne({
      email: cleanEmail,
      mobile: cleanMobile,
      isDeleted: false
    })
    .populate('appliedProfileId assignedTechnicalInterviewer assignedPracticalInterviewer assignedHrInterviewer')
    .populate({
      path: 'assignedPracticalTasks',
      populate: { path: 'profileId' }
    });

    if (!candidate) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials. Both Mobile Number and Email ID must match your registered record.' 
      });
    }

    let interviewerName = 'Pending Auto-Assignment';
    if (candidate.stage.includes('TECHNICAL') || candidate.stage === 'RECEPTION_WAITING' || candidate.stage === 'REGISTERED') {
      if (candidate.assignedTechnicalInterviewer) {
        interviewerName = candidate.assignedTechnicalInterviewer.fullName || candidate.assignedTechnicalInterviewer.username;
      }
    } else if (candidate.stage.includes('PRACTICAL') || candidate.stage === 'TECHNICAL_COMPLETED') {
      if (candidate.assignedPracticalInterviewer) {
        interviewerName = candidate.assignedPracticalInterviewer.fullName || candidate.assignedPracticalInterviewer.username;
      } else if (candidate.assignedTechnicalInterviewer) {
        interviewerName = candidate.assignedTechnicalInterviewer.fullName;
      }
    } else if (candidate.stage.includes('HR') || candidate.stage === 'PRACTICAL_COMPLETED') {
      if (candidate.assignedHrInterviewer) {
        interviewerName = candidate.assignedHrInterviewer.fullName || candidate.assignedHrInterviewer.username;
      }
    }

    const token = jwt.sign(
      { id: candidate._id, candidateCode: candidate.candidateCode, type: 'CANDIDATE' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      candidate: {
        _id: candidate._id,
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        email: candidate.email,
        mobile: candidate.mobile,
        enrollmentNo: candidate.enrollmentNo || 'N/A',
        collegeName: candidate.collegeName || 'N/A',
        branch: candidate.branch || 'N/A',
        semester: candidate.semester || 'N/A',
        tenthPercentage: candidate.tenthPercentage || 'N/A',
        twelfthPercentage: candidate.twelfthPercentage || 'N/A',
        diplomaPercentage: candidate.diplomaPercentage || 'N/A',
        currentCpiSpi: candidate.currentCpiSpi || 'N/A',
        tokenNumber: candidate.tokenNumber || 'N/A',
        stage: candidate.stage,
        appliedProfileName: candidate.appliedProfileId?.title || candidate.appliedProfileName || 'N/A',
        assignedInterviewerName: interviewerName,
        technicalEvaluation: candidate.technicalEvaluation,
        practicalEvaluation: candidate.practicalEvaluation,
        hrEvaluation: candidate.hrEvaluation,
        finalResult: candidate.finalResult,
        assignedPracticalTasks: (candidate.assignedPracticalTasks || []).map(t => ({
          taskTitle: t.taskTitle || t.title,
          taskDescription: t.taskDescription || t.problemStatement,
          maxMarks: t.maxMarks || 100,
          expectedTimeMinutes: t.expectedTimeMinutes || 45
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('roleId')
      .populate('employeeId');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};
