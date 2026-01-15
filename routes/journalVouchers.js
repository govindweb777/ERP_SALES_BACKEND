const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const JournalVoucher = require('../models/JournalVoucher');
const { journalVoucherValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');

// Get all journal vouchers
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.voucherNo = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.from && req.query.to) {
      filter.date = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to)
      };
    }

    const [data, total] = await Promise.all([
      JournalVoucher.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      JournalVoucher.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single journal voucher
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const journalVoucher = await JournalVoucher.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email');
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    return successResponse(res, journalVoucher);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create journal voucher
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = journalVoucherValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    // Validate debit equals credit
    if (value.totalDebit !== value.totalCredit) {
      return errorResponse(res, 'Total debit must equal total credit', 400);
    }

    const journalVoucher = new JournalVoucher({
      ...value,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId,
      createdBy: req.user._id
    });

    await journalVoucher.save();
    return successResponse(res, journalVoucher, 'Journal voucher created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Update journal voucher
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = journalVoucherValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    // Validate debit equals credit
    if (value.totalDebit !== value.totalCredit) {
      return errorResponse(res, 'Total debit must equal total credit', 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const journalVoucher = await JournalVoucher.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    return successResponse(res, journalVoucher, 'Journal voucher updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Delete journal voucher
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const journalVoucher = await JournalVoucher.findOneAndDelete(filter);
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    return successResponse(res, null, 'Journal voucher deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
