const mongoose = require('mongoose');

const outstandingBillSchema = new mongoose.Schema({
  billNo: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  paymentNo: {
    type: String,
    required: [true, 'Payment number is required'],
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
    maxlength: 200
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
  outstandingBills: {
    type: [outstandingBillSchema],
    default: []
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
paymentSchema.index({ companyId: 1, branchId: 1 });
paymentSchema.index({ paymentNo: 1, companyId: 1, branchId: 1 }, { unique: true });
paymentSchema.index({ date: -1 });
paymentSchema.index({ vendorName: 'text', paymentNo: 'text' });
paymentSchema.index({ createdBy: 1 });
paymentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
