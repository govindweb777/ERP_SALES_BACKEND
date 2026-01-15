const mongoose = require('mongoose');

const itemGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item group name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  shortName: {
    type: String,
    required: [true, 'Short name is required'],
    trim: true,
    maxlength: 20
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
itemGroupSchema.index({ companyId: 1, branchId: 1 });
itemGroupSchema.index({ name: 'text', shortName: 'text' });
itemGroupSchema.index({ isActive: 1 });

module.exports = mongoose.model('ItemGroup', itemGroupSchema);
