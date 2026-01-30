// const Joi = require('joi');

// // Common validation patterns
// const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
// const gstin = Joi.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).allow('', null);
// const ifsc = Joi.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/);
// const pincode = Joi.string().regex(/^[1-9][0-9]{5}$/);
// const mobile = Joi.string().regex(/^[6-9][0-9]{9}$/);
// const email = Joi.string().email();

// // Auth Schemas
// const registerSchema = Joi.object({
//   name: Joi.string().min(2).max(100).required(),
//   email: email.required(),
//   password: Joi.string().min(8).max(50).required(),
//   role: Joi.string().valid('admin', 'branch', 'user', 'user-panel').default('user'),
//   branchId: objectId.when('role', {
//     is: Joi.valid('branch', 'user'),
//     then: Joi.required(),
//     otherwise: Joi.optional()
//   }),
//   companyId: objectId.required()
// });

// const loginSchema = Joi.object({
//   email: email.required(),
//   password: Joi.string().required()
// });

// const forgotPasswordSchema = Joi.object({
//   email: email.required()
// });

// const resetPasswordSchema = Joi.object({
//   password: Joi.string().min(8).max(50).required(),
//   confirmPassword: Joi.string().valid(Joi.ref('password')).required()
// });

// const changePasswordSchema = Joi.object({
//   currentPassword: Joi.string().required(),
//   newPassword: Joi.string().min(8).max(50).required(),
//   confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
// });

// // Company Schema (updated with new fields)
// const companySchema = Joi.object({
//   companyName: Joi.string().min(2).max(200).required(),
//   registrationType: Joi.string().valid('GST', 'Unregistered').default('Unregistered'),
//   businessType: Joi.string().valid('Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited').required(),
//   gstin: Joi.when('registrationType', {
//     is: 'GST',
//     then: gstin.required(),
//     otherwise: gstin.optional()
//   }),
//   establishedFrom: Joi.date().required(),
//   address: Joi.object({
//     addressLine1: Joi.string().max(500).required(),
//     pincode: pincode.required(),
//     state: Joi.string().valid('GUJARAT', 'MADHYA PRADESH', 'MAHARASHTRA').required(),
//     city: Joi.string().required()
//   }).required(),
//   contact: Joi.object({
//     mobile: mobile.required(),
//     email: email.optional().allow('')
//   }).required(),
//   isActive: Joi.boolean().default(true)
// });

// // Branch Schema (updated with new fields)
// const branchSchema = Joi.object({
//   branchName: Joi.string().min(2).max(100).required(),
//   address: Joi.string().max(500).allow(''),
//   phoneNumber: mobile.optional().allow(''),
//   email: email.optional().allow(''),
//   password: Joi.string().min(8).max(50).optional(),
//   branchManagerName: Joi.string().max(100).allow(''),
//   openingHours: Joi.string().max(100).allow(''),
//   establishedDate: Joi.date().optional(),
//   noOfUsers: Joi.number().min(0).default(0),
//   servicesOffered: Joi.alternatives().try(
//     Joi.array().items(Joi.string()),
//     Joi.string().allow('')
//   ).optional(),
//   location: Joi.object({
//     latitude: Joi.number().min(-90).max(90).optional(),
//     longitude: Joi.number().min(-180).max(180).optional()
//   }).optional(),
//   isHeadOffice: Joi.boolean().default(false),
//   isActive: Joi.boolean().default(true)
// });

// // User Panel Schema (for admin-only creation)
// const userPanelSchema = Joi.object({
//   name: Joi.string().min(2).max(100).required(),
//   email: email.required(),
//   password: Joi.string().min(8).max(50).required(),
//   phoneNumber: mobile.optional().allow(''),
//   moduleAccess: Joi.object({
//     isDashboard: Joi.boolean().default(false),
//     isUserManagement: Joi.boolean().default(false),
//     isBranchManagement: Joi.boolean().default(false),
//     isReports: Joi.boolean().default(false),
//     isSettings: Joi.boolean().default(false)
//   }).default()
// });

// // Account Group Schema
// const accountGroupSchema = Joi.object({
//   underGroup: Joi.string().required(),
//   groupName: Joi.string().min(2).max(100).required(),
//   shortName: Joi.string().max(20).required(),
//   gstin: gstin.optional(),
//   natureOfBusiness: Joi.string().required(),
//   creditPeriod: Joi.number().min(0).max(365).default(0),
//   defaultPaymentMode: Joi.string().valid('Cash', 'Bank', 'Credit').default('Cash'),
//   isActive: Joi.boolean().default(true)
// });

// // Bank Account Schema
// const bankAccountSchema = Joi.object({
//   accountName: Joi.string().min(2).max(100).required(),
//   shortName: Joi.string().max(20).required(),
//   bankHolderName: Joi.string().required(),
//   ifsc: ifsc.required(),
//   accountNumber: Joi.string().min(9).max(18).required(),
//   isActive: Joi.boolean().default(true)
// });

// // Item Group Schema
// const itemGroupSchema = Joi.object({
//   name: Joi.string().min(2).max(100).required(),
//   description: Joi.string().max(500).allow(''),
//   shortName: Joi.string().max(20).required(),
//   isActive: Joi.boolean().default(true)
// });

// // Item Category Schema
// const itemCategorySchema = Joi.object({
//   name: Joi.string().min(2).max(100).required(),
//   description: Joi.string().max(500).allow(''),
//   isActive: Joi.boolean().default(true)
// });

// // Item Schema
// const itemSchema = Joi.object({
//   itemCode: Joi.string().max(50).required(),
//   itemName: Joi.string().min(2).max(200).required(),
//   hsnCode: Joi.string().max(20).required(),
//   openingStock: Joi.number().min(0).default(0),
//   openingValue: Joi.number().min(0).default(0),
//   sellingPrice: Joi.number().min(0).required(),
//   purchasePrice: Joi.number().min(0).required(),
//   unit: Joi.string().required(),
//   showInSales: Joi.boolean().default(true),
//   groupId: objectId.required(),
//   categoryId: objectId.required(),
//   isActive: Joi.boolean().default(true)
// });

// // Sale Item Schema
// const saleItemSchema = Joi.object({
//   name: Joi.string().required(),
//   qty: Joi.number().min(0).required(),
//   rate: Joi.number().min(0).required(),
//   amount: Joi.number().min(0).required()
// });

// // Sales Schema
// const salesSchema = Joi.object({
//   customerName: Joi.string().min(2).max(200).required(),
//   invoiceNo: Joi.string().max(50).required(),
//   date: Joi.date().required(),
//   items: Joi.array().items(saleItemSchema).min(1).required(),
//   subTotal: Joi.number().min(0).required(),
//   tax: Joi.number().min(0).default(0),
//   discount: Joi.number().min(0).default(0),
//   total: Joi.number().min(0).required(),
//   isActive: Joi.boolean().default(true)
// });

// // Purchase Schema
// const purchaseSchema = Joi.object({
//   vendorName: Joi.string().min(2).max(200).required(),
//   purchaseNo: Joi.string().max(50).required(),
//   date: Joi.date().required(),
//   gstin: gstin.optional(),
//   items: Joi.array().items(saleItemSchema).min(1).required(),
//   subTotal: Joi.number().min(0).required(),
//   tax: Joi.number().min(0).default(0),
//   discount: Joi.number().min(0).default(0),
//   total: Joi.number().min(0).required(),
//   isActive: Joi.boolean().default(true)
// });

// // Expense Schema
// const expenseSchema = Joi.object({
//   vendorName: Joi.string().min(2).max(200).required(),
//   expenseNo: Joi.string().max(50).required(),
//   date: Joi.date().required(),
//   description: Joi.string().max(500).required(),
//   amount: Joi.number().min(0).required(),
//   tax: Joi.number().min(0).default(0),
//   total: Joi.number().min(0).required(),
//   accountHead: Joi.string().required(),
//   isActive: Joi.boolean().default(true)
// });

// // Outstanding Invoice Schema
// const outstandingInvoiceSchema = Joi.object({
//   invoiceNo: Joi.string().required(),
//   amount: Joi.number().min(0).required()
// });

// // Receipt Schema
// const receiptSchema = Joi.object({
//   receiptNo: Joi.string().max(50).required(),
//   date: Joi.date().required(),
//   customerName: Joi.string().min(2).max(200).required(),
//   fromAccount: Joi.string().required(),
//   amount: Joi.number().min(0).required(),
//   outstandingInvoices: Joi.array().items(outstandingInvoiceSchema).default([]),
//   isActive: Joi.boolean().default(true)
// });

// // Payment Schema
// const paymentSchema = Joi.object({
//   paymentNo: Joi.string().max(50).required(),
//   date: Joi.date().required(),
//   vendorName: Joi.string().min(2).max(200).required(),
//   toAccount: Joi.string().required(),
//   amount: Joi.number().min(0).required(),
//   outstandingBills: Joi.array().items(Joi.object({
//     billNo: Joi.string().required(),
//     amount: Joi.number().min(0).required()
//   })).default([]),
//   isActive: Joi.boolean().default(true)
// });

// // Contra Entry Schema
// const contraEntrySchema = Joi.object({
//   voucherNo: Joi.string().max(50).required(),
//   date: Joi.date().required(),
//   fromAccount: Joi.string().required(),
//   toAccount: Joi.string().required(),
//   amount: Joi.number().min(0).required(),
//   narration: Joi.string().max(500).allow(''),
//   isActive: Joi.boolean().default(true)
// });

// // Journal Entry Schema
// const journalEntrySchema = Joi.object({
//   account: Joi.string().required(),
//   debit: Joi.number().min(0).default(0),
//   credit: Joi.number().min(0).default(0)
// });

// // Journal Voucher Schema
// const journalVoucherSchema = Joi.object({
//   voucherNo: Joi.string().max(50).required(),
//   date: Joi.date().required(),
//   entries: Joi.array().items(journalEntrySchema).min(2).required(),
//   narration: Joi.string().max(500).allow(''),
//   totalDebit: Joi.number().min(0).required(),
//   totalCredit: Joi.number().min(0).required(),
//   isActive: Joi.boolean().default(true)
// }).custom((value, helpers) => {
//   if (value.totalDebit !== value.totalCredit) {
//     return helpers.error('any.custom', { message: 'Total debit must equal total credit' });
//   }
//   return value;
// });

// // User Update Schema
// const userUpdateSchema = Joi.object({
//   name: Joi.string().min(2).max(100),
//   email: email,
//   phoneNumber: mobile.optional().allow(''),
//   role: Joi.string().valid('admin', 'branch', 'user', 'user-panel'),
//   branchId: objectId,
//   isActive: Joi.boolean(),
//   moduleAccess: Joi.object({
//     isDashboard: Joi.boolean(),
//     isUserManagement: Joi.boolean(),
//     isBranchManagement: Joi.boolean(),
//     isReports: Joi.boolean(),
//     isSettings: Joi.boolean()
//   }).optional()
// }).min(1);

// // Validation middleware factory
// const validate = (schema) => {
//   return (req, res, next) => {
//     const { error, value } = schema.validate(req.body, {
//       abortEarly: false,
//       stripUnknown: true
//     });
    
//     if (error) {
//       const errors = error.details.map(detail => ({
//         field: detail.path.join('.'),
//         message: detail.message
//       }));
      
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors
//       });
//     }
    
//     req.body = value;
//     next();
//   };
// };

// module.exports = {
//   validate,
//   registerSchema,
//   loginSchema,
//   forgotPasswordSchema,
//   resetPasswordSchema,
//   changePasswordSchema,
//   companySchema,
//   branchSchema,
//   userPanelSchema,
//   accountGroupSchema,
//   bankAccountSchema,
//   itemGroupSchema,
//   itemCategorySchema,
//   itemSchema,
//   salesSchema,
//   purchaseSchema,
//   expenseSchema,
//   receiptSchema,
//   paymentSchema,
//   contraEntrySchema,
//   journalVoucherSchema,
//   userUpdateSchema,
//   // Aliases for route imports
//   accountGroupValidation: accountGroupSchema,
//   bankAccountValidation: bankAccountSchema,
//   itemGroupValidation: itemGroupSchema,
//   itemCategoryValidation: itemCategorySchema,
//   itemValidation: itemSchema,
//   expenseValidation: expenseSchema,
//   receiptValidation: receiptSchema,
//   paymentValidation: paymentSchema,
//   contraEntryValidation: contraEntrySchema,
//   journalVoucherValidation: journalVoucherSchema
// };


const Joi = require('joi');

// Common validation patterns
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const gstin = Joi.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).allow('', null);
const ifsc = Joi.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/);
const pincode = Joi.string().regex(/^[1-9][0-9]{5}$/);
const mobile = Joi.string().regex(/^[6-9][0-9]{9}$/);
const email = Joi.string().email();

// Auth Schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: email.required(),
  password: Joi.string().min(8).max(50).required(),
  role: Joi.string().valid('admin', 'branch', 'user', 'user-panel').default('user'),
  branchId: objectId.when('role', {
    is: Joi.valid('branch', 'user'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  companyId: objectId.required()
});

const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: email.required()
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(50).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(50).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// Company Schema (updated with new fields)
const companySchema = Joi.object({
  companyName: Joi.string().min(2).max(200).required(),
  registrationType: Joi.string().valid('GST', 'Unregistered').default('Unregistered'),
  businessType: Joi.string().valid('Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited').required(),
  gstin: Joi.when('registrationType', {
    is: 'GST',
    then: gstin.required(),
    otherwise: gstin.optional()
  }),
  establishedFrom: Joi.date().required(),
  address: Joi.object({
    addressLine1: Joi.string().max(500).required(),
    pincode: pincode.required(),
    state: Joi.string().valid('GUJARAT', 'MADHYA PRADESH', 'MAHARASHTRA').required(),
    city: Joi.string().required()
  }).required(),
  contact: Joi.object({
    mobile: mobile.required(),
    email: email.optional().allow('')
  }).required(),
  isActive: Joi.boolean().default(true)
});

// Branch Schema (updated with new fields)
const branchSchema = Joi.object({
  branchName: Joi.string().min(2).max(100).required(),
  address: Joi.string().max(500).allow(''),
  phoneNumber: mobile.optional().allow(''),
  email: email.optional().allow(''),
  password: Joi.string().min(8).max(50).optional(),
  branchManagerName: Joi.string().max(100).allow(''),
  openingHours: Joi.string().max(100).allow(''),
  establishedDate: Joi.date().optional(),
  noOfUsers: Joi.number().min(0).default(0),
  servicesOffered: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string().allow('')
  ).optional(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional()
  }).optional(),
  isHeadOffice: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true)
});

// User Panel Schema (for admin-only creation)
const userPanelSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: email.required(),
  password: Joi.string().min(8).max(50).required(),
  phoneNumber: mobile.optional().allow(''),
  moduleAccess: Joi.object({
    isDashboard: Joi.boolean().default(false),
    isUserManagement: Joi.boolean().default(false),
    isBranchManagement: Joi.boolean().default(false),
    isReports: Joi.boolean().default(false),
    isSettings: Joi.boolean().default(false)
  }).default()
});

// Account Group Schema (updated with chartOfAccountId)
const accountGroupSchema = Joi.object({
  chartOfAccountId: objectId.required(),
  underGroup: Joi.string().required(),
  groupName: Joi.string().min(2).max(100).required(),
  shortName: Joi.string().max(20).required(),
  gstin: gstin.optional(),
  pan: Joi.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).allow('', null),
  natureOfBusiness: Joi.string().required(),
  creditPeriod: Joi.number().min(0).max(365).default(0),
  creditLimit: Joi.number().min(0).default(0),
  defaultPaymentMode: Joi.string().valid('Cash', 'Bank', 'Credit', 'UPI', 'Cheque').default('Cash'),
  contact: Joi.object({
    phone: Joi.string().allow(''),
    email: email.allow(''),
    address: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    pincode: Joi.string().allow('')
  }).optional(),
  openingBalance: Joi.object({
    amount: Joi.number().default(0),
    type: Joi.string().valid('Debit', 'Credit').default('Debit')
  }).optional(),
  isActive: Joi.boolean().default(true)
});

// Chart of Account Schema
const chartOfAccountSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  parentGroup: objectId.optional().allow(null),
  item: Joi.string().valid('BALANCE_SHEET', 'PROFIT_AND_LOSS').required(),
  nature: Joi.string().valid('ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES').required(),
  isSystemDefined: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true)
});

// Bank Account Schema
const bankAccountSchema = Joi.object({
  accountName: Joi.string().min(2).max(100).required(),
  shortName: Joi.string().max(20).required(),
  bankHolderName: Joi.string().required(),
  ifsc: ifsc.required(),
  accountNumber: Joi.string().min(9).max(18).required(),
  isActive: Joi.boolean().default(true)
});

// Item Schema (Real Estate) - groupId and categoryId removed, itemCode is auto-generated
const itemSchema = Joi.object({
  itemCode: Joi.string().max(50).optional(), // Auto-generated if not provided
  itemName: Joi.string().min(2).max(200).required(),
  propertyType: Joi.string().valid('Plot', 'Flat', 'Shop', 'Office', 'Warehouse', 'Agricultural Land', 'Commercial', 'Residential', 'Industrial', 'Other').required(),
  projectName: Joi.string().max(200).allow(''),
  location: Joi.object({
    address: Joi.string().max(500).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().max(100).allow(''),
    pincode: Joi.string().max(10).allow(''),
    landmark: Joi.string().max(200).allow('')
  }).optional(),
  area: Joi.object({
    plotArea: Joi.number().min(0),
    builtUpArea: Joi.number().min(0),
    carpetArea: Joi.number().min(0),
    unit: Joi.string().valid('Sq.Ft', 'Sq.M', 'Sq.Yard', 'Acre', 'Hectare', 'Guntha', 'Vigha')
  }).optional(),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    facing: Joi.string().valid('North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West')
  }).optional(),
  ratePerUnit: Joi.number().min(0),
  totalPrice: Joi.number().min(0).required(),
  bookingAmount: Joi.number().min(0).default(0),
  status: Joi.string().valid('Available', 'Booked', 'Sold', 'Under Construction', 'Ready to Move', 'Blocked').default('Available'),
  hsnCode: Joi.string().max(20).allow(''),
  isActive: Joi.boolean().default(true)
});

// Sale Item Schema - itemCode removed
const saleItemSchema = Joi.object({
  itemId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  itemName: Joi.string().required(),
  qty: Joi.number().min(0).required(),
  rate: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required()
});

// Sales Schema - invoiceNo is optional (auto-generated)
const salesSchema = Joi.object({
  customerName: Joi.string().min(2).max(200).required(),
  invoiceNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  items: Joi.array().items(saleItemSchema).min(1).required(),
  subTotal: Joi.number().min(0).required(),
  tax: Joi.number().min(0).default(0),
  discount: Joi.number().min(0).default(0),
  total: Joi.number().min(0).required(),
  isActive: Joi.boolean().default(true)
});

// Purchase Schema - purchaseNo is optional (auto-generated)
const purchaseSchema = Joi.object({
  vendorName: Joi.string().min(2).max(200).required(),
  purchaseNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  gstin: gstin.optional(),
  items: Joi.array().items(saleItemSchema).min(1).required(),
  subTotal: Joi.number().min(0).required(),
  tax: Joi.number().min(0).default(0),
  discount: Joi.number().min(0).default(0),
  total: Joi.number().min(0).required(),
  isActive: Joi.boolean().default(true)
});

// Expense Schema - expenseNo/voucherNo is optional (auto-generated)
const expenseSchema = Joi.object({
  vendorName: Joi.string().min(2).max(200).optional(),
  vendorId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  voucherNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  expenseNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  description: Joi.string().max(500).optional(),
  amount: Joi.number().min(0).optional(),
  tax: Joi.number().min(0).default(0),
  total: Joi.number().min(0).optional(),
  accountHead: Joi.string().optional(),
  items: Joi.array().optional(),
  isActive: Joi.boolean().default(true)
});

// Outstanding Invoice Schema
const outstandingInvoiceSchema = Joi.object({
  invoiceNo: Joi.string().optional(),
  amount: Joi.number().min(0).optional()
});

// Receipt Schema - receiptNo is optional (auto-generated)
const receiptSchema = Joi.object({
  receiptNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  accountId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  accountName: Joi.string().max(200).optional(),
  customerName: Joi.string().min(2).max(200).optional(),
  fromAccount: Joi.string().optional(),
  amount: Joi.number().min(0).optional(),
  amountReceived: Joi.number().min(0).optional(),
  mode: Joi.string().valid('Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card', 'Online', 'Other').optional(),
  depositTo: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  outstandingInvoices: Joi.array().items(outstandingInvoiceSchema).default([]),
  isActive: Joi.boolean().default(true)
});

// Payment Schema - paymentNo is optional (auto-generated)
const paymentSchema = Joi.object({
  paymentNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  accountId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  accountName: Joi.string().max(200).optional(),
  vendorName: Joi.string().min(2).max(200).optional(),
  toAccount: Joi.string().optional(),
  amount: Joi.number().min(0).optional(),
  amountPaid: Joi.number().min(0).optional(),
  mode: Joi.string().valid('Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card', 'Online', 'Other').optional(),
  paidFrom: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  outstandingBills: Joi.array().items(Joi.object({
    billNo: Joi.string().optional(),
    amount: Joi.number().min(0).optional()
  })).default([]),
  isActive: Joi.boolean().default(true)
});

// Contra Entry Schema - voucherNo/contraNo is optional (auto-generated)
const contraEntrySchema = Joi.object({
  contraNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  voucherNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  fromAccount: Joi.string().optional(),
  toAccount: Joi.string().optional(),
  amount: Joi.number().min(0).optional(),
  mode: Joi.string().valid('Cheque', 'Cash', 'Online', 'Bank Transfer', 'UPI', 'Other').optional(),
  entries: Joi.array().optional(),
  narration: Joi.string().max(500).allow(''),
  specialNotes: Joi.string().max(1000).allow(''),
  isActive: Joi.boolean().default(true)
});

// Journal Entry Schema
const journalEntrySchema = Joi.object({
  accountId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  accountName: Joi.string().optional(),
  account: Joi.string().optional(),
  description: Joi.string().max(500).allow(''),
  debit: Joi.number().min(0).default(0),
  credit: Joi.number().min(0).default(0)
});

// Journal Voucher Schema - voucherNo/jvNo is optional (auto-generated)
const journalVoucherSchema = Joi.object({
  jvNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  voucherNo: Joi.string().max(50).optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  entries: Joi.array().items(journalEntrySchema).min(2).required(),
  narration: Joi.string().max(500).allow(''),
  specialNotes: Joi.string().max(1000).allow(''),
  totalDebit: Joi.number().min(0).optional(),
  totalCredit: Joi.number().min(0).optional(),
  isActive: Joi.boolean().default(true)
}).custom((value, helpers) => {
  // Auto-calculate totals if entries provided
  if (value.entries && value.entries.length > 0) {
    const totalDebit = value.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = value.entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    if (totalDebit !== totalCredit) {
      return helpers.error('any.custom', { message: 'Total debit must equal total credit' });
    }
  }
  return value;
});

// User Update Schema
const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: email,
  phoneNumber: mobile.optional().allow(''),
  role: Joi.string().valid('admin', 'branch', 'user', 'user-panel'),
  branchId: objectId,
  isActive: Joi.boolean(),
  moduleAccess: Joi.object({
    isDashboard: Joi.boolean(),
    isUserManagement: Joi.boolean(),
    isBranchManagement: Joi.boolean(),
    isReports: Joi.boolean(),
    isSettings: Joi.boolean()
  }).optional()
}).min(1);

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  companySchema,
  branchSchema,
  userPanelSchema,
  accountGroupSchema,
  bankAccountSchema,
  itemSchema,
  salesSchema,
  purchaseSchema,
  expenseSchema,
  receiptSchema,
  paymentSchema,
  contraEntrySchema,
  journalVoucherSchema,
  userUpdateSchema,
  // Aliases for route imports
  accountGroupValidation: accountGroupSchema,
  chartOfAccountValidation: chartOfAccountSchema,
  bankAccountValidation: bankAccountSchema,
  itemValidation: itemSchema,
  expenseValidation: expenseSchema,
  receiptValidation: receiptSchema,
  paymentValidation: paymentSchema,
  contraEntryValidation: contraEntrySchema,
  journalVoucherValidation: journalVoucherSchema
};
