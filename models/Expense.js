const mongoose = require('mongoose');

// Expense Line Item Schema
const expenseLineSchema = new mongoose.Schema({
  natureOfExpense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  taxableAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  // Vendor Info
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountGroup'
  },
  
  vendorName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Voucher Details
  voucherNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  date: {
    type: Date,
    default: Date.now
  },
  
  gstin: {
    type: String,
    trim: true,
    maxlength: 15
  },
  
  mobileNo: {
    type: String,
    trim: true,
    maxlength: 15
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  billNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  billDate: {
    type: Date
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Bank Transfer', 'UPI', 'Cheque', 'Other'],
    default: 'Cash'
  },
  
  // Line Items
  items: {
    type: [expenseLineSchema],
    default: []
  },
  
  // Totals
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  total: {
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
  
  // Legacy fields for backward compatibility
  expenseNo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  
  accountHead: {
    type: String,
    trim: true
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

// Pre-save to calculate totals
expenseSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxableAmount || 0), 0);
    this.total = this.subtotal;
  }
  // Use voucherNo as expenseNo if not provided
  if (!this.expenseNo && this.voucherNo) {
    this.expenseNo = this.voucherNo;
  }
  next();
});

// Indexes
expenseSchema.index({ companyId: 1, branchId: 1 });
expenseSchema.index({ voucherNo: 1, companyId: 1, branchId: 1 });
expenseSchema.index({ expenseNo: 1, companyId: 1, branchId: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ vendorName: 'text', voucherNo: 'text', billNo: 'text' });
expenseSchema.index({ vendorId: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ isActive: 1 });
expenseSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
