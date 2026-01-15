const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: v => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  phoneNumber: {
    type: String,
    validate: {
      validator: v => !v || /^[6-9][0-9]{9}$/.test(v),
      message: 'Invalid phone number'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'branch', 'user', 'user-panel'],
    default: 'user'
  },
  // Module access for user-panel role
  moduleAccess: {
    isDashboard: { type: Boolean, default: false },
    isUserManagement: { type: Boolean, default: false },
    isBranchManagement: { type: Boolean, default: false },
    isReports: { type: Boolean, default: false },
    isSettings: { type: Boolean, default: false }
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePic: {
    type: String
  },
  resetToken: {
    type: String,
    select: false
  },
  resetExpiry: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ companyId: 1, branchId: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive fields
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
