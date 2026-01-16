const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const { successResponse, errorResponse } = require('../utils/response');
const { sendWelcomeEmail, sendResetOtpEmail } = require('../utils/email');
const { generateTempPassword, generateOTP } = require('../utils/helpers');

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

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return successResponse(res, null, 'If email exists, OTP sent');
    }

    const otp = generateOTP(); // 6 digit

    // 🔥 STORE PLAIN OTP
    user.resetOtp = otp;
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save({ validateBeforeSave: false });

    await sendResetOtpEmail(user.email, user.name, otp);

    successResponse(res, null, 'OTP sent to email');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetOtp: otp, // 🔥 direct match
      resetOtpExpiry: { $gt: Date.now() }
    }).select('+resetOtp +resetOtpExpiry');

    if (!user) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;

    await user.save();

    successResponse(res, null, 'Password reset successful');
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
