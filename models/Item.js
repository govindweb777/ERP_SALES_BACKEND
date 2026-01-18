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
  // Real estate specific fields
  propertyType: {
    type: String,
    enum: ['Plot', 'Flat', 'Shop', 'Office', 'Warehouse', 'Agricultural Land', 'Commercial', 'Residential', 'Industrial', 'Other'],
    required: [true, 'Property type is required']
  },
  projectName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  location: {
    address: { type: String, maxlength: 500 },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    pincode: { type: String, maxlength: 10 },
    landmark: { type: String, maxlength: 200 }
  },
  area: {
    plotArea: { type: Number, min: 0 },
    builtUpArea: { type: Number, min: 0 },
    carpetArea: { type: Number, min: 0 },
    unit: { 
      type: String, 
      enum: ['Sq.Ft', 'Sq.M', 'Sq.Yard', 'Acre', 'Hectare', 'Guntha', 'Vigha'],
      default: 'Sq.Ft'
    }
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    facing: { 
      type: String, 
      enum: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']
    }
  },
  // Pricing
  ratePerUnit: {
    type: Number,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: 0
  },
  bookingAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['Available', 'Booked', 'Sold', 'Under Construction', 'Ready to Move', 'Blocked'],
    default: 'Available'
  },
  // Additional Details
  floorNumber: { type: Number },
  totalFloors: { type: Number },
  bedrooms: { type: Number, min: 0 },
  bathrooms: { type: Number, min: 0 },
  parking: { type: Number, min: 0 },
  amenities: [{ type: String }],
  description: { type: String, maxlength: 2000 },
  legalDetails: {
    reraNumber: { type: String },
    surveyNumber: { type: String },
    plotNumber: { type: String },
    khataNumber: { type: String }
  },
  // HSN Code for GST
  hsnCode: {
    type: String,
    trim: true,
    maxlength: 20
  },
  // Stock tracking for real estate
  openingStock: {
    type: Number,
    default: 1,
    min: 0
  },
  currentStock: {
    type: Number,
    default: 1,
    min: 0
  },
  openingValue: {
    type: Number,
    default: 0,
    min: 0
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
  images: [{
    url: String,
    caption: String
  }],
  documents: [{
    name: String,
    url: String,
    type: String
  }],
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
itemSchema.index({ itemName: 'text', itemCode: 'text', projectName: 'text' });
itemSchema.index({ hsnCode: 1 });
itemSchema.index({ groupId: 1 });
itemSchema.index({ categoryId: 1 });
itemSchema.index({ isActive: 1 });
itemSchema.index({ status: 1 });
itemSchema.index({ propertyType: 1 });
itemSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('Item', itemSchema);
