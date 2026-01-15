const { errorResponse } = require('../utils/response');

/**
 * Authorization middleware - checks if user has required role(s)
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Branch scope middleware - ensures user can only access their branch data
 * Admins bypass this check
 */
const branchScope = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }
  
  // Admin has access to all branches
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Branch and User roles are scoped to their branch
  if (req.user.branchId) {
    req.branchFilter = { branchId: req.user.branchId._id || req.user.branchId };
  }
  
  req.companyFilter = { companyId: req.user.companyId._id || req.user.companyId };
  
  next();
};

/**
 * Check if user can manage other users
 * Admin: can manage all users
 * Branch: can only manage users in their branch
 */
const canManageUser = async (req, res, next) => {
  const User = require('../models/User');
  
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }
  
  const targetUserId = req.params.id || req.params.userId;
  
  if (!targetUserId) {
    return next();
  }
  
  try {
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Admin can manage anyone in their company
    if (req.user.role === 'admin') {
      if (targetUser.companyId.toString() !== req.user.companyId._id.toString()) {
        return errorResponse(res, 'Cannot manage users from other companies', 403);
      }
      return next();
    }
    
    // Branch can only manage users in their branch
    if (req.user.role === 'branch') {
      if (!targetUser.branchId || targetUser.branchId.toString() !== req.user.branchId._id.toString()) {
        return errorResponse(res, 'Cannot manage users from other branches', 403);
      }
      if (targetUser.role !== 'user') {
        return errorResponse(res, 'Cannot manage branch managers or admins', 403);
      }
      return next();
    }
    
    return errorResponse(res, 'Insufficient permissions', 403);
  } catch (error) {
    console.error('canManageUser error:', error);
    return errorResponse(res, 'Error checking permissions', 500);
  }
};

module.exports = {
  authorize,
  branchScope,
  canManageUser
};
