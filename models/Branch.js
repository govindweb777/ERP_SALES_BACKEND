const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchName: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    maxlength: 100
  },
  branchCode: {
    type: String,
    unique: true,
    required: true
  },
  address: {
    type: String,
    maxlength: 500
  },
  phoneNumber: {
    type: String,
    validate: {
      validator: v => !v || /^[6-9][0-9]{9}$/.test(v),
      message: 'Invalid phone number'
    }
  },
  email: {
    type: String,
    lowercase: true,
    validate: {
      validator: v => !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
      message: 'Invalid email'
    }
  },
  branchManagerName: {
    type: String,
    maxlength: 100
  },
  openingHours: {
    type: String,
    maxlength: 100
  },
  establishedDate: {
    type: Date
  },
  noOfUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  servicesOffered: [{
    type: String
  }],
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  isHeadOffice: {
    type: Boolean,
    default: false
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
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
branchSchema.index({ companyId: 1 });
branchSchema.index({ branchCode: 1 }, { unique: true });
branchSchema.index({ branchName: 'text' });
branchSchema.index({ isDeleted: 1 });

// Generate branch code before save
branchSchema.statics.generateBranchCode = async function(companyId) {
  const count = await this.countDocuments({ companyId });
  const nextNum = count + 1;
  return `BR${nextNum.toString().padStart(5, '0')}`;
};

module.exports = mongoose.model('Branch', branchSchema);
