const mongoose = require('mongoose');

const accountGroupSchema = new mongoose.Schema({
  underGroup: {
    type: String,
    required: [true, 'Under group is required'],
    trim: true
  },
  groupName: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: 100
  },
  shortName: {
    type: String,
    required: [true, 'Short name is required'],
    trim: true,
    maxlength: 20
  },
  gstin: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GSTIN format'
    }
  },
  natureOfBusiness: {
    type: String,
    required: true
  },
  creditPeriod: {
    type: Number,
    default: 0,
    min: 0,
    max: 365
  },
  defaultPaymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'Credit'],
    default: 'Cash'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
accountGroupSchema.index({ companyId: 1, branchId: 1 });
accountGroupSchema.index({ groupName: 'text', shortName: 'text' });
accountGroupSchema.index({ isActive: 1 });

module.exports = mongoose.model('AccountGroup', accountGroupSchema);
