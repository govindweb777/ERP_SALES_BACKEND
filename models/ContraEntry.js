const mongoose = require('mongoose');

// Contra Line Entry Schema
const contraLineSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  accountName: {
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

const contraEntrySchema = new mongoose.Schema({
  // Contra Number
  contraNo: {
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
  
  // Contra Entry Date
  date: {
    type: Date,
    default: Date.now
  },
  
  // Mode
  mode: {
    type: String,
    enum: ['Cheque', 'Cash', 'Online', 'Bank Transfer', 'UPI', 'Other'],
    default: 'Cash'
  },
  
  // Reference Number
  referenceNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Line Entries
  entries: {
    type: [contraLineSchema],
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
  
  // Legacy fields
  fromAccount: {
    type: String,
    trim: true
  },
  
  toAccount: {
    type: String,
    trim: true
  },
  
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  
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
contraEntrySchema.pre('save', function(next) {
  if (this.entries && this.entries.length > 0) {
    this.totalDebit = this.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    this.totalCredit = this.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    this.totalAmount = Math.max(this.totalDebit, this.totalCredit);
  }
  // Sync contraNo and voucherNo
  if (!this.voucherNo && this.contraNo) {
    this.voucherNo = this.contraNo;
  }
  if (!this.contraNo && this.voucherNo) {
    this.contraNo = this.voucherNo;
  }
  next();
});

// Indexes
contraEntrySchema.index({ companyId: 1, branchId: 1 });
contraEntrySchema.index({ contraNo: 1, companyId: 1, branchId: 1 });
contraEntrySchema.index({ voucherNo: 1, companyId: 1, branchId: 1 });
contraEntrySchema.index({ date: -1 });
contraEntrySchema.index({ createdBy: 1 });
contraEntrySchema.index({ isActive: 1 });
contraEntrySchema.index({ isDeleted: 1 });

// Auto-generate contra number
contraEntrySchema.statics.generateContraNo = async function(companyId, branchId) {
  const prefix = 'CE';
  const count = await this.countDocuments({ companyId, branchId });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.model('ContraEntry', contraEntrySchema);
