const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: 100
  },
  shortName: {
    type: String,
    required: [true, 'Short name is required'],
    trim: true,
    maxlength: 20
  },
  bankHolderName: {
    type: String,
    required: [true, 'Bank holder name is required'],
    trim: true
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
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    minlength: 9,
    maxlength: 18
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
bankAccountSchema.index({ companyId: 1, branchId: 1 });
bankAccountSchema.index({ accountName: 'text', bankHolderName: 'text' });
bankAccountSchema.index({ accountNumber: 1 });
bankAccountSchema.index({ isActive: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
