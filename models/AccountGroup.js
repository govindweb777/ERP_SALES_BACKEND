const mongoose = require('mongoose');

const accountGroupSchema = new mongoose.Schema({
  chartOfAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: [true, 'Chart of Account is required']
  },
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
  pan: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'Invalid PAN format'
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
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  defaultPaymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'Credit', 'UPI', 'Cheque'],
    default: 'Cash'
  },
  contact: {
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String }
  },
  openingBalance: {
    amount: { type: Number, default: 0 },
    type: { type: String, enum: ['Debit', 'Credit'], default: 'Debit' }
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
accountGroupSchema.index({ chartOfAccountId: 1 });

module.exports = mongoose.model('AccountGroup', accountGroupSchema);
