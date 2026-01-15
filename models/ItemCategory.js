const mongoose = require('mongoose');

const itemCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
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
itemCategorySchema.index({ companyId: 1, branchId: 1 });
itemCategorySchema.index({ name: 'text' });
itemCategorySchema.index({ isActive: 1 });

module.exports = mongoose.model('ItemCategory', itemCategorySchema);
