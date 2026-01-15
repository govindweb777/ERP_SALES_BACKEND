const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const ContraEntry = require('../models/ContraEntry');
const { contraEntryValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');

// Get all contra entries
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
      ContraEntry.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      ContraEntry.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single contra entry
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const contraEntry = await ContraEntry.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email');
    
    if (!contraEntry) {
      return errorResponse(res, 'Contra entry not found', 404);
    }
    return successResponse(res, contraEntry);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create contra entry
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = contraEntryValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const contraEntry = new ContraEntry({
      ...value,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId,
      createdBy: req.user._id
    });

    await contraEntry.save();
    return successResponse(res, contraEntry, 'Contra entry created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Update contra entry
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = contraEntryValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const contraEntry = await ContraEntry.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!contraEntry) {
      return errorResponse(res, 'Contra entry not found', 404);
    }
    return successResponse(res, contraEntry, 'Contra entry updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Delete contra entry
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const contraEntry = await ContraEntry.findOneAndDelete(filter);
    
    if (!contraEntry) {
      return errorResponse(res, 'Contra entry not found', 404);
    }
    return successResponse(res, null, 'Contra entry deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
