const mongoose = require('mongoose');

// Outstanding Bill Schema
const outstandingBillSchema = new mongoose.Schema({
  billNo: { 
    type: String 
  },
  billDate: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  originalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  dueAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  payment: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    trim: true
  }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  // Voucher Number
  paymentNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Account (Vendor/Party)
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountGroup'
  },
  
  accountName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Amount Paid
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Payment Date
  date: {
    type: Date,
    default: Date.now
  },
  
  // Mode of Payment
  mode: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card', 'Online', 'Other'],
    default: 'Cash'
  },
  
  // Reference Number
  referenceNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Paid From (Bank Account)
  paidFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  
  paidFromName: {
    type: String,
    trim: true
  },
  
  // Outstanding Transactions
  outstandingBills: {
    type: [outstandingBillSchema],
    default: []
  },
  
  // Totals
  totalPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Legacy fields
  vendorName: {
    type: String,
    trim: true,
    maxlength: 200
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
  
  // Notes
  specialNotes: {
    type: String,
    trim: true,
    maxlength: 1000
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

// Pre-save to sync legacy fields
paymentSchema.pre('save', function(next) {
  if (this.accountName && !this.vendorName) {
    this.vendorName = this.accountName;
  }
  if (this.amountPaid && !this.amount) {
    this.amount = this.amountPaid;
  }
  // Calculate totals from outstanding bills
  if (this.outstandingBills && this.outstandingBills.length > 0) {
    this.totalPayment = this.outstandingBills.reduce((sum, bill) => sum + (bill.payment || 0), 0);
  }
  next();
});

// Indexes
paymentSchema.index({ companyId: 1, branchId: 1 });
paymentSchema.index({ paymentNo: 1, companyId: 1, branchId: 1 });
paymentSchema.index({ date: -1 });
paymentSchema.index({ accountName: 'text', paymentNo: 'text', referenceNo: 'text' });
paymentSchema.index({ accountId: 1 });
paymentSchema.index({ paidFrom: 1 });
paymentSchema.index({ createdBy: 1 });
paymentSchema.index({ isActive: 1 });
paymentSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
