const Employee = require('../models/Employee');
const User = require('../models/User');
const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');
const NotificationService = require('../services/NotificationService');
const bcrypt = require('bcryptjs');

exports.getAllEmployees = async (req, res, next) => {
  try {
    const { search, roleId, status } = req.query;
    let filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (roleId) filter.roleId = roleId;
    if (status) filter.status = status;

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
    const { fullName, email, mobile, roleId, skills, maxCapacity, availabilityStatus, status, customPassword } = req.body;

    if (!fullName || !email || !mobile || !roleId) {
      return res.status(400).json({ success: false, message: 'Full Name, Email, Mobile, and Role are required.' });
    }

    const existingEmail = await Employee.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email address already registered to another employee.' });
    }

    const count = await Employee.countDocuments();
    const employeeCode = `EMP-${1000 + count + 1}`;

    const employee = await Employee.create({
      employeeCode,
      fullName,
      email: email.toLowerCase(),
      mobile,
      roleId,
      skills: skills || [],
      maxCapacity: maxCapacity || 5,
      availabilityStatus: availabilityStatus || 'AVAILABLE',
      status: status || 'Active',
      createdBy: req.user?._id
    });

    // Create Linked User Account
    const username = email.split('@')[0] + Math.floor(10 + Math.random() * 90);
    const defaultPassword = customPassword || `Emp@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

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
    res.status(201).json({ 
      success: true, 
      data: populated, 
      newPassword: defaultPassword,
      username,
      message: `Employee created. Default password: ${defaultPassword}` 
    });
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

    let updatedPasswordStr = null;

    // Handle Password Update if admin provided a new password
    if (req.body.newPassword || req.body.password) {
      const newPass = req.body.newPassword || req.body.password;
      const hashedPassword = await bcrypt.hash(newPass, 10);
      await User.findOneAndUpdate(
        { employeeId: employee._id },
        { password: hashedPassword }
      );
      updatedPasswordStr = newPass;
    }

    // If Role was changed, update linked User account role
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
    res.json({ 
      success: true, 
      data: populated,
      newPassword: updatedPasswordStr,
      message: updatedPasswordStr ? `Employee updated. New password: ${updatedPasswordStr}` : 'Employee updated successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Dedicated Admin Password Reset for Employee
 * Replaces old password with new generated password and returns plain text to Admin
 */
exports.resetEmployeePassword = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee || employee.isDeleted) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const newPassword = req.body.newPassword || `Kevalon@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const userAccount = await User.findOneAndUpdate(
      { employeeId: employee._id },
      { password: hashedPassword },
      { new: true }
    );

    if (!userAccount) {
      return res.status(404).json({ success: false, message: 'Linked User account not found for this employee.' });
    }

    await ActivityLog.create({
      userId: req.user?._id,
      username: req.user?.username || 'System',
      module: 'EMPLOYEE',
      action: 'UPDATE',
      description: `Reset password for Employee ${employee.fullName} (${employee.employeeCode}).`
    });

    res.json({
      success: true,
      message: `Password reset successfully for ${employee.fullName}.`,
      newPassword,
      username: userAccount.username
    });
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
