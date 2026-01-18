const mongoose = require('mongoose');

const chartOfAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: 200
  },
  groupType: {
    type: String,
    enum: ['PRIMARY', 'GROUP', 'SUBGROUP'],
    default: 'PRIMARY'
  },
  parentGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    default: null
  },
  item: {
    type: String,
    enum: ['BALANCE_SHEET', 'PROFIT_AND_LOSS'],
    required: [true, 'Item type is required']
  },
  nature: {
    type: String,
    enum: ['ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES'],
    required: [true, 'Nature is required']
  },
  isSystemDefined: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
chartOfAccountSchema.index({ companyId: 1, name: 1 });
chartOfAccountSchema.index({ parentGroup: 1 });
chartOfAccountSchema.index({ item: 1, nature: 1 });
chartOfAccountSchema.index({ isActive: 1 });
chartOfAccountSchema.index({ groupType: 1 });

module.exports = mongoose.model('ChartOfAccount', chartOfAccountSchema);
