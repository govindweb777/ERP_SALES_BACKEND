const mongoose = require('mongoose');

const salesItemSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Item',
    required: true 
  },
  itemName: { type: String, required: true },
  propertyType: { type: String },
  projectName: { type: String },
  area: {
    plotArea: { type: Number },
    builtUpArea: { type: Number },
    carpetArea: { type: Number },
    unit: { type: String }
  },
  qty: { type: Number, required: true, min: 1, default: 1 },
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
  customerContact: {
    phone: { type: String },
    email: { type: String },
    address: { type: String }
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
  cgst: {
    type: Number,
    default: 0,
    min: 0
  },
  sgst: {
    type: Number,
    default: 0,
    min: 0
  },
  igst: {
    type: Number,
    default: 0,
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
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending'
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  balanceAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'Cheque', 'UPI', 'Card', 'EMI'],
    default: 'Cash'
  },
  notes: {
    type: String,
    maxlength: 1000
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
  },
  isDeleted: {
    type: Boolean,
    default: false
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
salesSchema.index({ isDeleted: 1 });
salesSchema.index({ paymentStatus: 1 });
salesSchema.index({ 'items.itemId': 1 });

// Auto-generate invoice number
salesSchema.statics.generateInvoiceNo = async function(companyId, branchId) {
  const prefix = 'INV';
  const count = await this.countDocuments({ companyId, branchId });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.model('Sales', salesSchema);
