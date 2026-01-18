// const express = require('express');
// const router = express.Router();
// const authenticate = require('../middleware/auth');
// const { authorize } = require('../middleware/roleCheck');
// const Receipt = require('../models/Receipt');
// const { receiptValidation } = require('../utils/validation');
// const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
// const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
// const { sendNotification, NotificationTypes } = require('../utils/socket');

// // Get all receipts
// router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
//   try {
//     const { page, limit, skip } = getPaginationParams(req.query);
//     const filter = getCompanyBranchFilter(req.user);
    
//     if (req.query.search) {
//       filter.$or = [
//         { customerName: { $regex: req.query.search, $options: 'i' } },
//         { receiptNo: { $regex: req.query.search, $options: 'i' } }
//       ];
//     }

//     if (req.query.from && req.query.to) {
//       filter.date = {
//         $gte: new Date(req.query.from),
//         $lte: new Date(req.query.to)
//       };
//     }

//     const [data, total] = await Promise.all([
//       Receipt.find(filter)
//         .populate('companyId', 'companyName')
//         .populate('branchId', 'name')
//         .populate('createdBy', 'name email')
//         .skip(skip)
//         .limit(limit)
//         .sort({ date: -1 }),
//       Receipt.countDocuments(filter)
//     ]);

//     return paginatedResponse(res, data, total, page, limit);
//   } catch (error) {
//     return errorResponse(res, error.message, 500);
//   }
// });

// // Get single receipt
// router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
//   try {
//     const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
//     const receipt = await Receipt.findOne(filter)
//       .populate('companyId', 'companyName')
//       .populate('branchId', 'name')
//       .populate('createdBy', 'name email');
    
//     if (!receipt) {
//       return errorResponse(res, 'Receipt not found', 404);
//     }
//     return successResponse(res, receipt);
//   } catch (error) {
//     return errorResponse(res, error.message, 500);
//   }
// });

// // Create receipt
// router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
//   try {
//     const { error, value } = receiptValidation.validate(req.body);
//     if (error) {
//       return errorResponse(res, error.details[0].message, 400);
//     }

//     const companyId = req.user.companyId;
//     const branchId = req.user.branchId || req.body.branchId;
    
//     const receipt = new Receipt({
//       ...value,
//       companyId,
//       branchId,
//       createdBy: req.user._id
//     });

//     await receipt.save();
    
//     // Emit socket notification
//     sendNotification(companyId, branchId, NotificationTypes.RECEIPT_CREATED, {
//       message: `Receipt "${receipt.receiptNo}" received from ${receipt.customerName}`,
//       data: receipt,
//       createdBy: req.user.name
//     });
    
//     return successResponse(res, receipt, 'Receipt created successfully', 201);
//   } catch (error) {
//     if (error.code === 11000) {
//       return errorResponse(res, 'Receipt number already exists', 400);
//     }
//     return errorResponse(res, error.message, 500);
//   }
// });

// // Update receipt
// router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
//   try {
//     const { error, value } = receiptValidation.validate(req.body);
//     if (error) {
//       return errorResponse(res, error.details[0].message, 400);
//     }

//     const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
//     const receipt = await Receipt.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
//     if (!receipt) {
//       return errorResponse(res, 'Receipt not found', 404);
//     }
//     return successResponse(res, receipt, 'Receipt updated successfully');
//   } catch (error) {
//     if (error.code === 11000) {
//       return errorResponse(res, 'Receipt number already exists', 400);
//     }
//     return errorResponse(res, error.message, 500);
//   }
// });

// // Delete receipt
// router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
//   try {
//     const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
//     const receipt = await Receipt.findOneAndDelete(filter);
    
//     if (!receipt) {
//       return errorResponse(res, 'Receipt not found', 404);
//     }
//     return successResponse(res, null, 'Receipt deleted successfully');
//   } catch (error) {
//     return errorResponse(res, error.message, 500);
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const controller = require('../controllers/receiptController');

router.use(authenticate);

// Get next receipt number
router.get('/next-number', authorize('admin', 'branch', 'user', 'user-panel'), controller.getNextReceiptNo);

// CRUD
router.get('/', authorize('admin', 'branch', 'user', 'user-panel'), controller.getAll);
router.get('/:id', authorize('admin', 'branch', 'user', 'user-panel'), controller.getOne);
router.post('/', authorize('admin', 'branch', 'user'), controller.create);
router.put('/:id', authorize('admin', 'branch', 'user'), controller.update);
router.delete('/:id', authorize('admin', 'branch'), controller.delete);

// Toggle status
router.patch('/:id/toggle-status', authorize('admin', 'branch'), controller.toggleStatus);

module.exports = router;
