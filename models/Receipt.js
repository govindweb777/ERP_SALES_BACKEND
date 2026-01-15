const mongoose = require('mongoose');

const outstandingInvoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const receiptSchema = new mongoose.Schema({
  receiptNo: {
    type: String,
    required: [true, 'Receipt number is required'],
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: 200
  },
  fromAccount: {
    type: String,
    required: [true, 'From account is required']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  outstandingInvoices: {
    type: [outstandingInvoiceSchema],
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
receiptSchema.index({ companyId: 1, branchId: 1 });
receiptSchema.index({ receiptNo: 1, companyId: 1, branchId: 1 }, { unique: true });
receiptSchema.index({ date: -1 });
receiptSchema.index({ customerName: 'text', receiptNo: 'text' });
receiptSchema.index({ createdBy: 1 });
receiptSchema.index({ isActive: 1 });

module.exports = mongoose.model('Receipt', receiptSchema);
