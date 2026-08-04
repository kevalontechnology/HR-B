const Employee = require('../models/Employee');
const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');
const ActivityLog = require('../models/ActivityLog');
const NotificationService = require('../services/NotificationService');

exports.getAllEmployees = async (req, res, next) => {
  try {
    const { search, status, department } = req.query;
    let filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;
    if (department) filter.department = department;

    const employees = await Employee.find(filter)
      .populate('roleId skills')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('roleId skills');
    if (!employee || employee.isDeleted) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
};

exports.createEmployee = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      mobile,
      department,
      designation,
      roleId,
      skills,
      experienceYears,
      reportingManager,
      capacity,
      availability,
      status,
      password
    } = req.body;

    if (!fullName || !email || !mobile || !roleId) {
      return res.status(400).json({ success: false, message: 'Full Name, Email, Mobile, and Role are required.' });
    }

    const existingEmp = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmp) {
      return res.status(400).json({ success: false, message: 'An employee with this email already exists.' });
    }

    // Generate Employee Code
    const count = await Employee.countDocuments();
    const employeeCode = `EMP-${1000 + count + 1}`;

    const employee = await Employee.create({
      employeeCode,
      fullName,
      email: email.toLowerCase(),
      mobile,
      department: department || 'Engineering',
      designation: designation || 'Software Engineer',
      roleId,
      skills: skills || [],
      experienceYears: experienceYears || 0,
      reportingManager: reportingManager || 'N/A',
      capacity: capacity || 10,
      availability: availability || 'Available',
      status: status || 'Active',
      createdBy: req.user?._id
    });

    // Automatically create User credentials for login access
    const defaultPassword = password || 'Kevalon@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const username = email.split('@')[0].toLowerCase();

    await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      employeeId: employee._id,
      roleId,
      status: status === 'Active' ? 'Active' : 'Inactive'
    });

    await ActivityLog.create({
      userId: req.user?._id,
      username: req.user?.username || 'System',
      module: 'EMPLOYEE',
      action: 'CREATE',
      description: `Created Employee ${fullName} (${employeeCode}) with Role.`
    });

    await NotificationService.sendNotification({
      eventKey: 'EMPLOYEE_ADDED',
      targetUserId: null,
      params: { employeeName: fullName, employeeCode }
    });

    const populated = await Employee.findById(employee._id).populate('roleId skills');
    res.status(201).json({ success: true, data: populated, message: `Employee created. Default password: ${defaultPassword}` });
  } catch (err) {
    next(err);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee || employee.isDeleted) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const previousRoleId = employee.roleId?.toString();
    
    Object.assign(employee, req.body, { updatedBy: req.user?._id });
    await employee.save();

    // If Role was changed, update linked User account role & access rights immediately
    if (req.body.roleId && req.body.roleId.toString() !== previousRoleId) {
      await User.findOneAndUpdate(
        { employeeId: employee._id },
        { roleId: req.body.roleId }
      );

      await NotificationService.sendNotification({
        eventKey: 'EMPLOYEE_ROLE_CHANGED',
        targetUserId: null,
        params: { employeeName: employee.fullName, employeeCode: employee.employeeCode }
      });
    }

    await ActivityLog.create({
      userId: req.user?._id,
      username: req.user?.username || 'System',
      module: 'EMPLOYEE',
      action: 'UPDATE',
      description: `Updated Employee ${employee.fullName} (${employee.employeeCode}).`
    });

    const populated = await Employee.findById(employee._id).populate('roleId skills');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee || employee.isDeleted) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    employee.isDeleted = true;
    await employee.save();

    // Disable linked user login
    await User.findOneAndUpdate({ employeeId: employee._id }, { isDeleted: true, status: 'Inactive' });

    await ActivityLog.create({
      userId: req.user?._id,
      username: req.user?.username || 'System',
      module: 'EMPLOYEE',
      action: 'DELETE',
      description: `Soft deleted Employee ${employee.fullName}.`
    });

    res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
