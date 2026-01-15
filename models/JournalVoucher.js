const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  account: { type: String, required: true },
  debit: { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 }
}, { _id: false });

const journalVoucherSchema = new mongoose.Schema({
  voucherNo: {
    type: String,
    required: [true, 'Voucher number is required'],
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  entries: {
    type: [journalEntrySchema],
    required: true,
    validate: {
      validator: v => v.length >= 2,
      message: 'At least two entries are required'
    }
  },
  narration: {
    type: String,
    trim: true,
    maxlength: 500
  },
  totalDebit: {
    type: Number,
    required: true,
    min: 0
  },
  totalCredit: {
    type: Number,
    required: true,
    min: 0
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save validation
journalVoucherSchema.pre('save', function(next) {
  if (this.totalDebit !== this.totalCredit) {
    const err = new Error('Total debit must equal total credit');
    err.name = 'ValidationError';
    return next(err);
  }
  next();
});

// Indexes
journalVoucherSchema.index({ companyId: 1, branchId: 1 });
journalVoucherSchema.index({ voucherNo: 1, companyId: 1, branchId: 1 }, { unique: true });
journalVoucherSchema.index({ date: -1 });
journalVoucherSchema.index({ createdBy: 1 });
journalVoucherSchema.index({ isActive: 1 });

module.exports = mongoose.model('JournalVoucher', journalVoucherSchema);
