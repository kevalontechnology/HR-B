require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const Permission = require('../models/Permission');
const Role = require('../models/Role');
const Skill = require('../models/Skill');
const AppliedProfile = require('../models/AppliedProfile');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Panel = require('../models/Panel');
const TechnicalQuestion = require('../models/TechnicalQuestion');
const PracticalTask = require('../models/PracticalTask');
const RecruitmentDrive = require('../models/RecruitmentDrive');
const Candidate = require('../models/Candidate');
const NotificationTemplate = require('../models/NotificationTemplate');

const permissionsData = [
  { module: 'reports', name: 'View Dashboard & Reports', code: 'reports_view' },
  { module: 'audit', name: 'View Audit & Activity Logs', code: 'audit_view' },
  { module: 'employees', name: 'View Employees', code: 'employees_read' },
  { module: 'employees', name: 'Create/Edit Employees', code: 'employees_write' },
  { module: 'employees', name: 'Delete Employees', code: 'employees_delete' },
  { module: 'roles', name: 'View Roles', code: 'roles_read' },
  { module: 'roles', name: 'Create/Edit Roles', code: 'roles_write' },
  { module: 'roles', name: 'Delete Roles', code: 'roles_delete' },
  { module: 'permissions', name: 'View Permissions', code: 'permissions_read' },
  { module: 'permissions', name: 'Manage Permissions', code: 'permissions_write' },
  { module: 'skills', name: 'View Skills', code: 'skills_read' },
  { module: 'skills', name: 'Manage Skills', code: 'skills_write' },
  { module: 'profiles', name: 'View Profiles', code: 'profiles_read' },
  { module: 'profiles', name: 'Manage Profiles', code: 'profiles_write' },
  { module: 'drives', name: 'View Recruitment Drives', code: 'drives_read' },
  { module: 'drives', name: 'Manage Recruitment Drives', code: 'drives_write' },
  { module: 'candidates', name: 'View Candidates', code: 'candidates_read' },
  { module: 'candidates', name: 'Create/Edit Candidates', code: 'candidates_write' },
  { module: 'candidates', name: 'Delete Candidates', code: 'candidates_delete' },
  { module: 'candidates', name: 'Import Candidates', code: 'candidates_import' },
  { module: 'reception', name: 'Reception Check-In Access', code: 'reception_access' },
  { module: 'panels', name: 'View Panels', code: 'panels_read' },
  { module: 'panels', name: 'Manage Panels', code: 'panels_write' },
  { module: 'questions', name: 'View Technical Question Bank', code: 'questions_read' },
  { module: 'questions', name: 'Manage Technical Question Bank', code: 'questions_write' },
  { module: 'tasks', name: 'View Practical Task Bank', code: 'tasks_read' },
  { module: 'tasks', name: 'Manage Practical Task Bank', code: 'tasks_write' },
  { module: 'interviews', name: 'Execute Candidate Interviews', code: 'interviews_execute' },
  { module: 'notifications', name: 'Manage Notification Templates', code: 'notifications_write' }
];

const seed = async () => {
  try {
    await connectDB();
    console.log('[Seeder] Clearing existing database records...');

    await Promise.all([
      Permission.deleteMany({}),
      Role.deleteMany({}),
      Skill.deleteMany({}),
      AppliedProfile.deleteMany({}),
      Employee.deleteMany({}),
      User.deleteMany({}),
      Panel.deleteMany({}),
      TechnicalQuestion.deleteMany({}),
      PracticalTask.deleteMany({}),
      RecruitmentDrive.deleteMany({}),
      Candidate.deleteMany({}),
      NotificationTemplate.deleteMany({})
    ]);

    console.log('[Seeder] Seeding Permissions...');
    const createdPermissions = await Permission.insertMany(permissionsData);
    const permMap = {};
    createdPermissions.forEach(p => { permMap[p.code] = p._id; });

    console.log('[Seeder] Seeding Roles...');
    const superAdminRole = await Role.create({
      name: 'Super Admin',
      code: 'SUPER_ADMIN',
      description: 'Full Unrestricted System Access',
      permissions: Object.values(permMap),
      isSystemRole: true
    });

    const hrAdminRole = await Role.create({
      name: 'HR Admin',
      code: 'HR_ADMIN',
      description: 'HR Administration and Candidate Workflow Management',
      permissions: [
        permMap['reports_view'], permMap['audit_view'],
        permMap['candidates_read'], permMap['candidates_write'], permMap['candidates_import'],
        permMap['employees_read'], permMap['employees_write'],
        permMap['drives_read'], permMap['drives_write'],
        permMap['panels_read'], permMap['panels_write'],
        permMap['reception_access'], permMap['interviews_execute']
      ]
    });

    const techInterviewerRole = await Role.create({
      name: 'Technical Interviewer',
      code: 'TECH_INTERVIEWER',
      description: 'Conduct Technical Candidate Evaluations',
      permissions: [
        permMap['reports_view'],
        permMap['candidates_read'],
        permMap['questions_read'],
        permMap['interviews_execute']
      ]
    });

    const receptionRole = await Role.create({
      name: 'Receptionist',
      code: 'RECEPTIONIST',
      description: 'Candidate Reception Check-In and Token Issuance',
      permissions: [
        permMap['reception_access'],
        permMap['candidates_read'],
        permMap['candidates_write']
      ]
    });

    console.log('[Seeder] Seeding Skills Master...');
    const skillsList = [
      { name: 'MERN', category: 'Fullstack' },
      { name: 'React.js', category: 'Frontend' },
      { name: 'Node.js', category: 'Backend' },
      { name: 'MongoDB', category: 'Database' },
      { name: 'Python', category: 'Backend' },
      { name: 'Django', category: 'Backend' },
      { name: 'Java', category: 'Backend' },
      { name: 'Flutter', category: 'Mobile' },
      { name: 'UI/UX Design', category: 'Design' },
      { name: 'Digital Marketing', category: 'Marketing' }
    ];

    const createdSkills = await Skill.insertMany(skillsList);
    const skillMap = {};
    createdSkills.forEach(s => { skillMap[s.name] = s._id; });

    console.log('[Seeder] Seeding Applied Profiles Master...');
    const profilesList = [
      {
        title: 'MERN Stack Developer',
        code: 'PROF_MERN',
        description: 'Fullstack Engineer proficient in React, Node, Express, MongoDB',
        requiredSkills: [skillMap['MERN'], skillMap['React.js'], skillMap['Node.js'], skillMap['MongoDB']],
        minExperienceYears: 2
      },
      {
        title: 'Flutter Mobile Developer',
        code: 'PROF_FLUTTER',
        description: 'Mobile App Developer skilled in Flutter & Dart',
        requiredSkills: [skillMap['Flutter']],
        minExperienceYears: 1
      },
      {
        title: 'Python Django Developer',
        code: 'PROF_PYTHON',
        description: 'Backend Developer proficient in Python & Django REST Framework',
        requiredSkills: [skillMap['Python'], skillMap['Django']],
        minExperienceYears: 2
      },
      {
        title: 'UI/UX Designer',
        code: 'PROF_UIUX',
        description: 'Product designer specializing in web & mobile interfaces',
        requiredSkills: [skillMap['UI/UX Design']],
        minExperienceYears: 1
      }
    ];

    const createdProfiles = await AppliedProfile.insertMany(profilesList);
    const profileMap = {};
    createdProfiles.forEach(p => { profileMap[p.title] = p._id; });

    console.log('[Seeder] Seeding Super Admin & Sample Employees...');
    const adminEmployee = await Employee.create({
      employeeCode: 'EMP-1000',
      fullName: 'System Administrator',
      email: 'admin@kevalon.com',
      mobile: '9876543210',
      department: 'IT & Operations',
      designation: 'VP of Technology',
      roleId: superAdminRole._id,
      skills: Object.values(skillMap),
      experienceYears: 12,
      capacity: 20,
      availability: 'Available',
      status: 'Active'
    });

    const hashedAdminPassword = await bcrypt.hash('Admin@123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@kevalon.com',
      password: hashedAdminPassword,
      employeeId: adminEmployee._id,
      roleId: superAdminRole._id,
      status: 'Active'
    });

    const techInterviewerEmp = await Employee.create({
      employeeCode: 'EMP-1001',
      fullName: 'Vikram Sharma',
      email: 'vikram.tech@kevalon.com',
      mobile: '9876543211',
      department: 'Engineering',
      designation: 'Senior Lead Architect',
      roleId: techInterviewerRole._id,
      skills: [skillMap['MERN'], skillMap['React.js'], skillMap['Node.js'], skillMap['MongoDB']],
      experienceYears: 8,
      capacity: 8,
      availability: 'Available',
      status: 'Active'
    });

    const hashedTechPassword = await bcrypt.hash('Tech@123', 10);
    await User.create({
      username: 'vikram.tech',
      email: 'vikram.tech@kevalon.com',
      password: hashedTechPassword,
      employeeId: techInterviewerEmp._id,
      roleId: techInterviewerRole._id,
      status: 'Active'
    });

    const receptionEmp = await Employee.create({
      employeeCode: 'EMP-1002',
      fullName: 'Pooja Patel',
      email: 'pooja.reception@kevalon.com',
      mobile: '9876543212',
      department: 'Human Resources',
      designation: 'Reception Officer',
      roleId: receptionRole._id,
      skills: [],
      experienceYears: 3,
      capacity: 50,
      availability: 'Available',
      status: 'Active'
    });

    const hashedRecPassword = await bcrypt.hash('Pooja@123', 10);
    await User.create({
      username: 'pooja.reception',
      email: 'pooja.reception@kevalon.com',
      password: hashedRecPassword,
      employeeId: receptionEmp._id,
      roleId: receptionRole._id,
      status: 'Active'
    });

    console.log('[Seeder] Seeding Interview Panels...');
    await Panel.create({
      panelName: 'MERN Technical Core Panel',
      panelType: 'Technical',
      members: [techInterviewerEmp._id],
      targetSkills: [skillMap['MERN'], skillMap['React.js'], skillMap['Node.js']],
      appliedProfiles: [profileMap['MERN Stack Developer']],
      maxCapacityPerInterviewer: 8,
      status: 'Active'
    });

    console.log('[Seeder] Seeding Technical Question Bank...');
    const questions = [
      {
        questionText: 'What is the Virtual DOM in React and how does reconciliation work?',
        profileId: profileMap['MERN Stack Developer'],
        skillId: skillMap['React.js'],
        difficulty: 'Medium',
        expectedAnswer: 'The Virtual DOM is an in-memory representation of real DOM elements. Reconciliation diffs state changes and updates only modified elements.'
      },
      {
        questionText: 'Explain Node.js Event Loop phases (Timers, Poll, Check).',
        profileId: profileMap['MERN Stack Developer'],
        skillId: skillMap['Node.js'],
        difficulty: 'Hard',
        expectedAnswer: 'The event loop processes asynchronous callbacks through distinct phases: timers, pending callbacks, idle/prepare, poll, check (setImmediate), and close callbacks.'
      },
      {
        questionText: 'Difference between SQL and NoSQL indexing strategy in MongoDB?',
        profileId: profileMap['MERN Stack Developer'],
        skillId: skillMap['MongoDB'],
        difficulty: 'Medium',
        expectedAnswer: 'MongoDB uses B-Trees for compound, single field, and text indexes without strict schema constraints.'
      },
      {
        questionText: 'What are React Hooks rules and how does useEffect cleanup run?',
        profileId: profileMap['MERN Stack Developer'],
        skillId: skillMap['React.js'],
        difficulty: 'Easy',
        expectedAnswer: 'Hooks must be called at top level. Cleanups run before component unmounts or before re-running effect on dependency change.'
      },
      {
        questionText: 'Explain Express middleware chain and error handling middleware parameters.',
        profileId: profileMap['MERN Stack Developer'],
        skillId: skillMap['Node.js'],
        difficulty: 'Easy',
        expectedAnswer: 'Error handling middleware requires 4 parameters: (err, req, res, next).'
      }
    ];

    await TechnicalQuestion.insertMany(questions);

    console.log('[Seeder] Seeding Practical Task Bank...');
    await PracticalTask.create({
      taskTitle: 'Build a Secure JWT Authentication API in Express',
      taskDescription: 'Develop a modular Express middleware and route controller for user login with password hashing and JWT payload verification.',
      profileId: profileMap['MERN Stack Developer'],
      difficulty: 'Medium',
      expectedTimeMinutes: 45,
      maxMarks: 100
    });

    console.log('[Seeder] Seeding Recruitment Drive...');
    const drive = await RecruitmentDrive.create({
      driveName: 'Kevalon Tech National Campus Drive 2026',
      driveCode: 'DRV-CAMPUS-2026',
      campusLocation: 'Kevalon Tech Campus, HQ Auditorium',
      driveDate: new Date(),
      status: 'Active',
      description: 'Annual campus recruitment drive for software engineering roles.'
    });

    console.log('[Seeder] Seeding Sample Candidates...');
    await Candidate.create({
      candidateCode: 'CAND-1001',
      fullName: 'Aarav Patel',
      email: 'aarav.patel@gmail.com',
      mobile: '9876500001',
      appliedProfileId: profileMap['MERN Stack Developer'],
      skills: [skillMap['MERN'], skillMap['React.js'], skillMap['Node.js']],
      experienceYears: 2,
      driveId: drive._id,
      stage: 'REGISTERED'
    });

    await Candidate.create({
      candidateCode: 'CAND-1002',
      fullName: 'Sneha Verma',
      email: 'sneha.verma@yahoo.com',
      mobile: '9876500002',
      appliedProfileId: profileMap['MERN Stack Developer'],
      skills: [skillMap['React.js'], skillMap['Node.js']],
      experienceYears: 3,
      driveId: drive._id,
      stage: 'REGISTERED'
    });

    console.log('[Seeder] Seeding Notification Templates...');
    await NotificationTemplate.create({
      eventKey: 'CANDIDATE_CHECKIN',
      eventName: 'Candidate Reception Check-In',
      titleTemplate: 'Candidate Checked In: {{candidateName}}',
      bodyTemplate: 'Candidate {{candidateName}} has checked in at reception with Token #{{tokenNumber}}.',
      channels: ['In-App']
    });

    await NotificationTemplate.create({
      eventKey: 'CANDIDATE_ASSIGNED',
      eventName: 'Candidate Auto Assigned to Interviewer',
      titleTemplate: 'New Candidate Assigned for {{stageName}}',
      bodyTemplate: 'Candidate {{candidateName}} ({{candidateCode}}) has been assigned to {{interviewerName}}.',
      channels: ['In-App']
    });

    await NotificationTemplate.create({
      eventKey: 'INTERVIEW_COMPLETED',
      eventName: 'Interview Stage Evaluation Completed',
      titleTemplate: '{{stageName}} Interview Result: {{verdict}}',
      bodyTemplate: '{{stageName}} evaluation completed for {{candidateName}}. Result: {{verdict}}.',
      channels: ['In-App']
    });

    console.log('----------------------------------------------------');
    console.log('🚀 SEEDING COMPLETED SUCCESSFULLY TO MONGODB ATLAS!');
    console.log('Default Credentials:');
    console.log('  Super Admin: username: "admin" | password: "Admin@123"');
    console.log('  Technical Interviewer: username: "vikram.tech" | password: "Tech@123"');
    console.log('  Receptionist: username: "pooja.reception" | password: "Pooja@123"');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('[Seeder Error]', err);
    process.exit(1);
  }
};

seed();
