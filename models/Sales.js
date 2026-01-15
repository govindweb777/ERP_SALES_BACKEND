const mongoose = require('mongoose');

const salesItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const salesSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: 200
  },
  invoiceNo: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  items: {
    type: [salesItemSchema],
    required: true,
    validate: {
      validator: v => v.length > 0,
      message: 'At least one item is required'
    }
  },
  subTotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
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

// Indexes
salesSchema.index({ companyId: 1, branchId: 1 });
salesSchema.index({ invoiceNo: 1, companyId: 1, branchId: 1 }, { unique: true });
salesSchema.index({ date: -1 });
salesSchema.index({ customerName: 'text', invoiceNo: 'text' });
salesSchema.index({ createdBy: 1 });
salesSchema.index({ isActive: 1 });

module.exports = mongoose.model('Sales', salesSchema);
