const mongoose = require('mongoose');

const contraEntrySchema = new mongoose.Schema({
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
  fromAccount: {
    type: String,
    required: [true, 'From account is required']
  },
  toAccount: {
    type: String,
    required: [true, 'To account is required']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  narration: {
    type: String,
    trim: true,
    maxlength: 500
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

// Indexes
contraEntrySchema.index({ companyId: 1, branchId: 1 });
contraEntrySchema.index({ voucherNo: 1, companyId: 1, branchId: 1 }, { unique: true });
contraEntrySchema.index({ date: -1 });
contraEntrySchema.index({ createdBy: 1 });
contraEntrySchema.index({ isActive: 1 });

module.exports = mongoose.model('ContraEntry', contraEntrySchema);
