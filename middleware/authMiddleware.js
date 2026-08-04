const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

const JWT_SECRET = process.env.JWT_SECRET || 'kevalon_recruitment_crm_secret_key_2026';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).populate({
      path: 'roleId',
      populate: { path: 'permissions' }
    });

    if (!user || user.status !== 'Active') {
      return res.status(401).json({ success: false, message: 'Invalid token or inactive user account.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Require specific permission code (e.g. 'candidates_read', 'roles_manage')
 * Super Admin role bypasses all checks.
 */
const checkPermission = (requiredPermissionCode) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userRole = req.user.roleId;
    if (userRole && userRole.code === 'SUPER_ADMIN') {
      return next(); // Super Admin bypasses check
    }

    if (!userRole || !userRole.permissions) {
      return res.status(403).json({ success: false, message: 'Forbidden. No permissions assigned.' });
    }

    const hasPermission = userRole.permissions.some(
      perm => perm.code === requiredPermissionCode || perm.code === 'all_access'
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden. Requires permission '${requiredPermissionCode}'.` 
      });
    }

    next();
  };
};

module.exports = { verifyToken, checkPermission, JWT_SECRET };
