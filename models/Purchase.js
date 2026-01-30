const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
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

const purchaseSchema = new mongoose.Schema({
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
    maxlength: 200
  },
  vendorContact: {
    phone: { type: String },
    email: { type: String },
    address: { type: String }
  },
  purchaseNo: {
    type: String,
    required: [true, 'Purchase number is required'],
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  gstin: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GSTIN format'
    }
  },
  items: {
    type: [purchaseItemSchema],
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
    enum: ['Cash', 'Bank', 'Cheque', 'UPI', 'Card'],
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
  }
}, {
  timestamps: true
});

// Indexes
purchaseSchema.index({ companyId: 1, branchId: 1 });
purchaseSchema.index({ purchaseNo: 1, companyId: 1, branchId: 1 }, { unique: true });
purchaseSchema.index({ date: -1 });
purchaseSchema.index({ vendorName: 'text', purchaseNo: 'text' });
purchaseSchema.index({ createdBy: 1 });
purchaseSchema.index({ isActive: 1 });
purchaseSchema.index({ paymentStatus: 1 });
purchaseSchema.index({ 'items.itemId': 1 });

// Auto-generate purchase number
purchaseSchema.statics.generatePurchaseNo = async function(companyId, branchId) {
  const prefix = 'PUR';
  const count = await this.countDocuments({ companyId, branchId });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.model('Purchase', purchaseSchema);
