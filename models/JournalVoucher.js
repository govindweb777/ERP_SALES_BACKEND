const mongoose = require('mongoose');

// Journal Entry Line Schema
const journalEntrySchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount'
  },
  accountName: {
    type: String,
    trim: true
  },
  account: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  debit: {
    type: Number,
    default: 0,
    min: 0
  },
  credit: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const journalVoucherSchema = new mongoose.Schema({
  // JV Number
  jvNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Legacy voucherNo
  voucherNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // JV Date
  date: {
    type: Date,
    default: Date.now
  },
  
  // Reference Number
  referenceNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Journal Entries
  entries: {
    type: [journalEntrySchema],
    default: []
  },
  
  // Totals
  totalDebit: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalCredit: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Special Notes
  specialNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Legacy narration
  narration: {
    type: String,
    trim: true,
    maxlength: 500
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
    ref: 'User',
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

// Pre-save to calculate totals and sync fields
journalVoucherSchema.pre('save', function(next) {
  if (this.entries && this.entries.length > 0) {
    this.totalDebit = this.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    this.totalCredit = this.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    this.totalAmount = this.totalDebit;
  }
  // Sync jvNo and voucherNo
  if (!this.voucherNo && this.jvNo) {
    this.voucherNo = this.jvNo;
  }
  if (!this.jvNo && this.voucherNo) {
    this.jvNo = this.voucherNo;
  }
  // Sync narration and specialNotes
  if (!this.narration && this.specialNotes) {
    this.narration = this.specialNotes;
  }
  next();
});

// Indexes
journalVoucherSchema.index({ companyId: 1, branchId: 1 });
journalVoucherSchema.index({ jvNo: 1, companyId: 1, branchId: 1 });
journalVoucherSchema.index({ voucherNo: 1, companyId: 1, branchId: 1 });
journalVoucherSchema.index({ date: -1 });
journalVoucherSchema.index({ createdBy: 1 });
journalVoucherSchema.index({ isActive: 1 });
journalVoucherSchema.index({ isDeleted: 1 });

// Auto-generate journal voucher number
journalVoucherSchema.statics.generateJVNo = async function(companyId, branchId) {
  const prefix = 'JV';
  const count = await this.countDocuments({ companyId, branchId });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.model('JournalVoucher', journalVoucherSchema);
