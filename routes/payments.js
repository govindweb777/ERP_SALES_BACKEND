const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Payment = require('../models/Payment');
const { paymentValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

// Get all payments
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { vendorName: { $regex: req.query.search, $options: 'i' } },
        { paymentNo: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.from && req.query.to) {
      filter.date = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to)
      };
    }

    const [data, total] = await Promise.all([
      Payment.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      Payment.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single payment
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const payment = await Payment.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email');
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }
    return successResponse(res, payment);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create payment
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = paymentValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;
    
    const payment = new Payment({
      ...value,
      companyId,
      branchId,
      createdBy: req.user._id
    });

    await payment.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.PAYMENT_CREATED, {
      message: `Payment "${payment.paymentNo}" made to ${payment.vendorName}`,
      data: payment,
      createdBy: req.user.name
    });
    
    return successResponse(res, payment, 'Payment created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Payment number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Update payment
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = paymentValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const payment = await Payment.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }
    return successResponse(res, payment, 'Payment updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Payment number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Delete payment
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const payment = await Payment.findOneAndDelete(filter);
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }
    return successResponse(res, null, 'Payment deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
