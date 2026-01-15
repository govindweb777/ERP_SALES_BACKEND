const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access denied. No token provided.', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id)
        .select('-password -resetToken -resetExpiry')
        .populate('companyId', 'companyName registrationType gstin')
        .populate('branchId', 'name address');
      
      if (!user) {
        return errorResponse(res, 'User not found', 401);
      }
      
      if (!user.isActive) {
        return errorResponse(res, 'Account is deactivated', 403);
      }
      
      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token expired', 401);
      }
      return errorResponse(res, 'Invalid token', 401);
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return errorResponse(res, 'Authentication error', 500);
  }
};

module.exports = authenticate;
