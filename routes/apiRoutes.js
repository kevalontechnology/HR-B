const express = require('express');
const router = express.Router();
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

const authController = require('../controllers/authController');
const employeeController = require('../controllers/employeeController');
const roleController = require('../controllers/roleController');
const permissionController = require('../controllers/permissionController');
const skillController = require('../controllers/skillController');
const profileController = require('../controllers/profileController');
const driveController = require('../controllers/driveController');
const candidateController = require('../controllers/candidateController');
const receptionController = require('../controllers/receptionController');
const panelController = require('../controllers/panelController');
const questionController = require('../controllers/questionController');
const taskController = require('../controllers/taskController');
const interviewController = require('../controllers/interviewController');
const notificationController = require('../controllers/notificationController');
const reportController = require('../controllers/reportController');
const auditController = require('../controllers/auditController');

// PUBLIC ROUTES (NO AUTH REQUIRED)
router.post('/auth/login', authController.login);
router.post('/auth/candidate-login', authController.candidateLogin);
router.get('/candidates/public-status', candidateController.getPublicCandidateStatus);

// PROTECTED ROUTES BELOW (JWT AUTH REQUIRED)
router.use(verifyToken);

router.get('/auth/profile', authController.getProfile);
router.post('/auth/reset-password', authController.resetPassword);

// DASHBOARD / REPORTS
router.get('/reports/dashboard', checkPermission('reports_view'), reportController.getDashboardStats);

// AUDIT LOGS
router.get('/audit/logs', checkPermission('audit_view'), auditController.getActivityLogs);

// EMPLOYEES CRUD
router.get('/employees', checkPermission('employees_read'), employeeController.getAllEmployees);
router.get('/employees/:id', checkPermission('employees_read'), employeeController.getEmployeeById);
router.post('/employees', checkPermission('employees_write'), employeeController.createEmployee);
router.put('/employees/:id', checkPermission('employees_write'), employeeController.updateEmployee);
router.post('/employees/:id/reset-password', checkPermission('employees_write'), employeeController.resetEmployeePassword);
router.delete('/employees/:id', checkPermission('employees_delete'), employeeController.deleteEmployee);

// ROLES & PERMISSIONS CRUD
router.get('/roles', checkPermission('roles_read'), roleController.getAllRoles);
router.post('/roles', checkPermission('roles_write'), roleController.createRole);
router.put('/roles/:id', checkPermission('roles_write'), roleController.updateRole);
router.delete('/roles/:id', checkPermission('roles_delete'), roleController.deleteRole);

router.get('/permissions', checkPermission('permissions_read'), permissionController.getAllPermissions);
router.post('/permissions', checkPermission('permissions_write'), permissionController.createPermission);
router.put('/permissions/:id', checkPermission('permissions_write'), permissionController.updatePermission);
router.delete('/permissions/:id', checkPermission('permissions_write'), permissionController.deletePermission);

// SKILLS MASTER CRUD
router.get('/skills', checkPermission('skills_read'), skillController.getAllSkills);
router.post('/skills', checkPermission('skills_write'), skillController.createSkill);
router.put('/skills/:id', checkPermission('skills_write'), skillController.updateSkill);
router.delete('/skills/:id', checkPermission('skills_write'), skillController.deleteSkill);

// APPLIED PROFILES CRUD
router.get('/profiles', checkPermission('profiles_read'), profileController.getAllProfiles);
router.post('/profiles', checkPermission('profiles_write'), profileController.createProfile);
router.put('/profiles/:id', checkPermission('profiles_write'), profileController.updateProfile);
router.delete('/profiles/:id', checkPermission('profiles_write'), profileController.deleteProfile);

// RECRUITMENT DRIVES CRUD
router.get('/drives', checkPermission('drives_read'), driveController.getAllDrives);
router.post('/drives', checkPermission('drives_write'), driveController.createDrive);
router.put('/drives/:id', checkPermission('drives_write'), driveController.updateDrive);
router.delete('/drives/:id', checkPermission('drives_write'), driveController.deleteDrive);

// CANDIDATES CRUD & IMPORT & ASSIGNMENT
router.get('/candidates', checkPermission('candidates_read'), candidateController.getAllCandidates);
router.post('/candidates/import', checkPermission('candidates_import'), candidateController.importCandidates);
router.post('/candidates/assign', checkPermission('candidates_write'), candidateController.manualAssignCandidate);
router.post('/candidates/manual-assign', checkPermission('candidates_write'), candidateController.manualAssignCandidate);
router.get('/candidates/:id', checkPermission('candidates_read'), candidateController.getCandidateById);
router.post('/candidates', checkPermission('candidates_write'), candidateController.createCandidate);
router.put('/candidates/:id', checkPermission('candidates_write'), candidateController.updateCandidate);
router.delete('/candidates/:id', checkPermission('candidates_delete'), candidateController.deleteCandidate);

// RECEPTION MODULE
router.post('/reception/check-in', checkPermission('reception_access'), receptionController.checkInCandidate);
router.get('/reception/queue', checkPermission('reception_access'), receptionController.getWaitingQueue);

// PANELS CRUD
router.get('/panels', checkPermission('panels_read'), panelController.getAllPanels);
router.post('/panels', checkPermission('panels_write'), panelController.createPanel);
router.put('/panels/:id', checkPermission('panels_write'), panelController.updatePanel);
router.delete('/panels/:id', checkPermission('panels_write'), panelController.deletePanel);

// QUESTION BANK CRUD & BULK ACTIONS
router.get('/questions', checkPermission('questions_read'), questionController.getAllQuestions);
router.post('/questions', checkPermission('questions_write'), questionController.createQuestion);
router.put('/questions/:id', checkPermission('questions_write'), questionController.updateQuestion);
router.post('/questions/bulk-update', checkPermission('questions_write'), questionController.bulkUpdateQuestions);
router.post('/questions/bulk-delete', checkPermission('questions_write'), questionController.bulkDeleteQuestions);
router.delete('/questions/:id', checkPermission('questions_write'), questionController.deleteQuestion);

// TASK BANK CRUD & BULK ACTIONS
router.get('/tasks', checkPermission('tasks_read'), taskController.getAllTasks);
router.post('/tasks', checkPermission('tasks_write'), taskController.createTask);
router.put('/tasks/:id', checkPermission('tasks_write'), taskController.updateTask);
router.post('/tasks/bulk-update', checkPermission('tasks_write'), taskController.bulkUpdateTasks);
router.post('/tasks/bulk-delete', checkPermission('tasks_write'), taskController.bulkDeleteTasks);
router.delete('/tasks/:id', checkPermission('tasks_write'), taskController.deleteTask);

// INTERVIEW WORKSTATIONS (Supports both /submit and /:candidateId/evaluate)
router.get('/interviews/technical/:candidateId/questions', checkPermission('interviews_execute'), interviewController.getTechnicalQuestionsForCandidate);
router.post('/interviews/technical/submit', checkPermission('interviews_execute'), interviewController.submitTechnicalEvaluation);
router.post('/interviews/technical/:candidateId/evaluate', checkPermission('interviews_execute'), interviewController.submitTechnicalEvaluation);

router.get('/interviews/practical/:candidateId/tasks', checkPermission('interviews_execute'), interviewController.getPracticalTasksForCandidate);
router.post('/interviews/practical/submit', checkPermission('interviews_execute'), interviewController.submitPracticalEvaluation);
router.post('/interviews/practical/:candidateId/evaluate', checkPermission('interviews_execute'), interviewController.submitPracticalEvaluation);

router.post('/interviews/hr/submit', checkPermission('interviews_execute'), interviewController.submitHrEvaluation);
router.post('/interviews/hr/:candidateId/evaluate', checkPermission('interviews_execute'), interviewController.submitHrEvaluation);

// NOTIFICATIONS & TEMPLATES
router.get('/notifications/templates', checkPermission('notifications_write'), notificationController.getTemplates);
router.post('/notifications/templates', checkPermission('notifications_write'), notificationController.createTemplate);
router.put('/notifications/templates/:id', checkPermission('notifications_write'), notificationController.updateTemplate);
router.delete('/notifications/templates/:id', checkPermission('notifications_write'), notificationController.deleteTemplate);

router.get('/notifications/my', notificationController.getUserNotifications);
router.put('/notifications/:id/read', notificationController.markNotificationRead);

module.exports = router;
