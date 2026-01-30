const mongoose = require('mongoose');

// Outstanding Invoice Schema
const outstandingInvoiceSchema = new mongoose.Schema({
  invoiceNo: { 
    type: String 
  },
  invoiceDate: {
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
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    trim: true
  }
}, { _id: false });

const receiptSchema = new mongoose.Schema({
  // Voucher Number
  receiptNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Account (Customer/Party)
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
  
  // Amount Received
  amountReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Receipt Date
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
  
  // Deposit To (Bank Account)
  depositTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  
  depositToName: {
    type: String,
    trim: true
  },
  
  // GST on Advance Receipt
  enableGstOnAdvance: {
    type: Boolean,
    default: false
  },
  
  gstAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Outstanding Transactions
  outstandingInvoices: {
    type: [outstandingInvoiceSchema],
    default: []
  },
  
  // Totals
  totalPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Legacy fields
  customerName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  fromAccount: {
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
receiptSchema.pre('save', function(next) {
  if (this.accountName && !this.customerName) {
    this.customerName = this.accountName;
  }
  if (this.amountReceived && !this.amount) {
    this.amount = this.amountReceived;
  }
  // Calculate totals from outstanding invoices
  if (this.outstandingInvoices && this.outstandingInvoices.length > 0) {
    this.totalPayment = this.outstandingInvoices.reduce((sum, inv) => sum + (inv.payment || 0), 0);
    this.totalDiscount = this.outstandingInvoices.reduce((sum, inv) => sum + (inv.discountAmount || 0), 0);
  }
  next();
});

// Indexes
receiptSchema.index({ companyId: 1, branchId: 1 });
receiptSchema.index({ receiptNo: 1, companyId: 1, branchId: 1 });
receiptSchema.index({ date: -1 });
receiptSchema.index({ accountName: 'text', receiptNo: 'text', referenceNo: 'text' });
receiptSchema.index({ accountId: 1 });
receiptSchema.index({ depositTo: 1 });
receiptSchema.index({ createdBy: 1 });
receiptSchema.index({ isActive: 1 });
receiptSchema.index({ isDeleted: 1 });

// Auto-generate receipt number
receiptSchema.statics.generateReceiptNo = async function(companyId, branchId) {
  const prefix = 'REC';
  const count = await this.countDocuments({ companyId, branchId });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.model('Receipt', receiptSchema);
