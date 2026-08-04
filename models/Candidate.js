const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  candidateCode: { type: String, required: true, unique: true, uppercase: true }, // e.g. CAND-1001
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  
  // Academic & Campus Details
  enrollmentNo: { type: String, default: '' },
  collegeName: { type: String, default: '' },
  branch: { type: String, default: '' },
  semester: { type: String, default: '' },
  tenthPercentage: { type: String, default: '' },
  twelfthPercentage: { type: String, default: '' },
  diplomaPercentage: { type: String, default: '' },
  currentCpiSpi: { type: String, default: '' },
  
  appliedProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppliedProfile' },
  appliedProfileName: { type: String, default: '' }, // Fallback string if importing via profile title
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  experienceYears: { type: Number, default: 0 },
  driveId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruitmentDrive' },
  resumeUrl: { type: String, default: '' },
  tokenNumber: { type: String, default: '' },
  
  // Pipeline Stages
  stage: { 
    type: String, 
    enum: [
      'REGISTERED', 
      'RECEPTION_WAITING', 
      'TECHNICAL_QUEUE', 
      'TECHNICAL_IN_PROGRESS', 
      'TECHNICAL_COMPLETED',
      'PRACTICAL_QUEUE', 
      'PRACTICAL_IN_PROGRESS', 
      'PRACTICAL_COMPLETED',
      'HR_QUEUE', 
      'HR_IN_PROGRESS', 
      'SELECTED', 
      'HOLD', 
      'REJECTED'
    ], 
    default: 'REGISTERED' 
  },
  
  checkInTime: { type: Date },
  
  // Assigned Interviewers / Panels
  assignedTechnicalInterviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  assignedPracticalInterviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  assignedHrInterviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  
  // Evaluation Scores & Statuses
  technicalEvaluation: {
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 10 },
    passedQuestions: { type: Number, default: 0 },
    verdict: { type: String, enum: ['PENDING', 'PASS', 'HOLD', 'FAIL'], default: 'PENDING' },
    remarks: { type: String, default: '' },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    evaluatedAt: { type: Date },
    questions: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TechnicalQuestion' },
      questionText: String,
      skillName: String,
      isCorrect: Boolean,
      remarks: String
    }]
  },

  practicalEvaluation: {
    score: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 2 },
    verdict: { type: String, enum: ['PENDING', 'PASS', 'HOLD', 'FAIL'], default: 'PENDING' },
    remarks: { type: String, default: '' },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    evaluatedAt: { type: Date },
    tasks: [{
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticalTask' },
      taskTitle: String,
      maxMarks: Number,
      marksObtained: Number,
      remarks: String
    }]
  },

  hrEvaluation: {
    communicationScore: { type: Number, default: 0 },
    behaviorScore: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    verdict: { type: String, enum: ['PENDING', 'SELECTED', 'HOLD', 'REJECTED'], default: 'PENDING' },
    remarks: { type: String, default: '' },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    evaluatedAt: { type: Date }
  },

  finalResult: { type: String, enum: ['IN_PROCESS', 'SELECTED', 'HOLD', 'REJECTED'], default: 'IN_PROCESS' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Candidate', CandidateSchema);
