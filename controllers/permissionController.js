const Permission = require('../models/Permission');

exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.find({ isDeleted: false }).sort({ module: 1, code: 1 });
    
    // Group permissions module-wise
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.json({ success: true, count: permissions.length, data: permissions, grouped });
  } catch (err) {
    next(err);
  }
};

exports.createPermission = async (req, res, next) => {
  try {
    const { module, name, code, description } = req.body;
    if (!module || !name || !code) {
      return res.status(400).json({ success: false, message: 'Module, name, and code are required.' });
    }

    const permission = await Permission.create({
      module,
      name,
      code: code.toLowerCase(),
      description,
      createdBy: req.user?._id
    });

    res.status(201).json({ success: true, data: permission });
  } catch (err) {
    next(err);
  }
};

exports.updatePermission = async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) return res.status(404).json({ success: false, message: 'Permission not found.' });

    Object.assign(permission, req.body);
    await permission.save();

    res.json({ success: true, data: permission });
  } catch (err) {
    next(err);
  }
};

exports.deletePermission = async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) return res.status(404).json({ success: false, message: 'Permission not found.' });

    permission.isDeleted = true;
    await permission.save();

    res.json({ success: true, message: 'Permission deleted.' });
  } catch (err) {
    next(err);
  }
};
