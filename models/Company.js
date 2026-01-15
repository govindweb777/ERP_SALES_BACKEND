const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: 200
  },
  registrationType: {
    type: String,
    enum: ['GST', 'Unregistered'],
    default: 'Unregistered'
  },
  businessType: {
    type: String,
    enum: ['Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited'],
    required: true
  },
  gstin: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.registrationType === 'GST' && !v) return false;
        if (!v) return true;
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GSTIN format'
    }
  },
  establishedFrom: {
    type: Date,
    required: [true, 'Company established date is required']
  },
  address: {
    addressLine1: { 
      type: String, 
      required: true, 
      maxlength: 500 
    },
    pincode: {
      type: String,
      required: true,
      validate: {
        validator: v => /^[1-9][0-9]{5}$/.test(v),
        message: 'Invalid pincode'
      }
    },
    state: { 
      type: String, 
      required: true,
      enum: ['GUJARAT', 'MADHYA PRADESH', 'MAHARASHTRA']
    },
    city: { 
      type: String, 
      required: true 
    }
  },
  contact: {
    mobile: {
      type: String,
      required: true,
      validate: {
        validator: v => /^[6-9][0-9]{9}$/.test(v),
        message: 'Invalid mobile number'
      }
    },
    email: {
      type: String,
      lowercase: true,
      validate: {
        validator: v => !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
        message: 'Invalid email'
      }
    }
  },
  logo: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
companySchema.index({ companyName: 'text' });
companySchema.index({ gstin: 1 }, { sparse: true });

module.exports = mongoose.model('Company', companySchema);
