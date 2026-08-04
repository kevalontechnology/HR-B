const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');

exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({ isDeleted: false })
      .populate('permissions')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: roles.length, data: roles });
  } catch (err) {
    next(err);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const { name, code, description, permissions } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Role name and unique code are required.' });
    }

    const existing = await Role.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role with this name or code already exists.' });
    }

    const role = await Role.create({
      name,
      code: code.toUpperCase(),
      description,
      permissions: permissions || [],
      createdBy: req.user?._id
    });

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'ROLE',
      action: 'CREATE',
      description: `Created Role: ${name} (${code})`
    });

    const populated = await Role.findById(role._id).populate('permissions');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role || role.isDeleted) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    Object.assign(role, req.body, { updatedBy: req.user?._id });
    await role.save();

    await ActivityLog.create({
      userId: req.user?._id,
      module: 'ROLE',
      action: 'UPDATE',
      description: `Updated Role: ${role.name}`
    });

    const populated = await Role.findById(role._id).populate('permissions');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role || role.isDeleted) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    if (role.isSystemRole) {
      return res.status(400).json({ success: false, message: 'System roles cannot be deleted.' });
    }

    role.isDeleted = true;
    await role.save();

    res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
