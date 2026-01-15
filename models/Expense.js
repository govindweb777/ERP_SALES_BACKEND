const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
    maxlength: 200
  },
  expenseNo: {
    type: String,
    required: [true, 'Expense number is required'],
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  accountHead: {
    type: String,
    required: [true, 'Account head is required']
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
expenseSchema.index({ companyId: 1, branchId: 1 });
expenseSchema.index({ expenseNo: 1, companyId: 1, branchId: 1 }, { unique: true });
expenseSchema.index({ date: -1 });
expenseSchema.index({ vendorName: 'text', description: 'text' });
expenseSchema.index({ accountHead: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ isActive: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
