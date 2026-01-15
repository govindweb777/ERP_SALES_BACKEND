const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const { successResponse, errorResponse } = require('../utils/response');
const { sendWelcomeEmail, sendResetPasswordEmail } = require('../utils/email');
const { generateTempPassword, generateResetToken } = require('../utils/helpers');

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password').populate('companyId branchId');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid credentials', 401);
    }
    if (!user.isActive) return errorResponse(res, 'Account deactivated', 403);
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    successResponse(res, { token, user: user.toJSON() }, 'Login successful');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// Register (Admin only creates users)
exports.register = async (req, res) => {
  try {
    const { name, email, role, branchId } = req.body;
    const tempPassword = generateTempPassword();
    const user = await User.create({
      name, email, password: tempPassword, role,
      branchId: branchId || req.user.branchId,
      companyId: req.user.companyId
    });
    await sendWelcomeEmail(email, name, tempPassword, role);
    successResponse(res, { user: user.toJSON() }, 'User created', 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return successResponse(res, null, 'If email exists, reset link sent');
    const resetToken = generateResetToken();
    user.resetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetExpiry = Date.now() + 3600000;
    await user.save({ validateBeforeSave: false });
    await sendResetPasswordEmail(user.email, user.name, resetToken);
    successResponse(res, null, 'Reset email sent');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetToken: hashedToken, resetExpiry: { $gt: Date.now() } });
    if (!user) return errorResponse(res, 'Invalid or expired token', 400);
    user.password = req.body.password;
    user.resetToken = undefined;
    user.resetExpiry = undefined;
    await user.save();
    successResponse(res, null, 'Password reset successful');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return errorResponse(res, 'Current password incorrect', 400);
    }
    user.password = req.body.newPassword;
    await user.save();
    successResponse(res, null, 'Password changed');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  successResponse(res, { user: req.user }, 'Profile fetched');
};
