const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemCode: {
    type: String,
    required: [true, 'Item code is required'],
    trim: true,
    maxlength: 50
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: 200
  },
  hsnCode: {
    type: String,
    required: [true, 'HSN code is required'],
    trim: true,
    maxlength: 20
  },
  openingStock: {
    type: Number,
    default: 0,
    min: 0
  },
  openingValue: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: 0
  },
  unit: {
    type: String,
    required: [true, 'Unit is required']
  },
  showInSales: {
    type: Boolean,
    default: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemGroup',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemCategory',
    required: true
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
itemSchema.index({ companyId: 1, branchId: 1 });
itemSchema.index({ itemCode: 1, companyId: 1, branchId: 1 }, { unique: true });
itemSchema.index({ itemName: 'text', itemCode: 'text' });
itemSchema.index({ hsnCode: 1 });
itemSchema.index({ groupId: 1 });
itemSchema.index({ categoryId: 1 });
itemSchema.index({ isActive: 1 });

module.exports = mongoose.model('Item', itemSchema);
