const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  // Under Group - Link to Chart of Account
  underGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount'
  },
  
  // Account Display Name
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: 100
  },
  
  // Short / Alias Name
  shortName: {
    type: String,
    trim: true,
    maxlength: 30
  },
  
  // Bank Details
  bankHolderName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    minlength: 9,
    maxlength: 18
  },
  
  ifsc: {
    type: String,
    required: [true, 'IFSC code is required'],
    uppercase: true,
    validate: {
      validator: v => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v),
      message: 'Invalid IFSC code format'
    }
  },
  
  bankName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Opening Balance
  openingBalance: {
    type: Number,
    default: 0
  },
  
  // Balance Type: Dr or Cr
  balanceType: {
    type: String,
    enum: ['Dr', 'Cr'],
    default: 'Dr'
  },
  
  // Company and Branch
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status
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
bankAccountSchema.index({ companyId: 1, branchId: 1 });
bankAccountSchema.index({ accountName: 'text', bankHolderName: 'text', bankName: 'text' });
bankAccountSchema.index({ accountNumber: 1 });
bankAccountSchema.index({ underGroup: 1 });
bankAccountSchema.index({ isActive: 1 });
bankAccountSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
