const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
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
purchaseSchema.index({ companyId: 1, branchId: 1 });
purchaseSchema.index({ purchaseNo: 1, companyId: 1, branchId: 1 }, { unique: true });
purchaseSchema.index({ date: -1 });
purchaseSchema.index({ vendorName: 'text', purchaseNo: 'text' });
purchaseSchema.index({ createdBy: 1 });
purchaseSchema.index({ isActive: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
