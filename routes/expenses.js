const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Expense = require('../models/Expense');
const { expenseValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

// Get all expenses
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { vendorName: { $regex: req.query.search, $options: 'i' } },
        { expenseNo: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.from && req.query.to) {
      filter.date = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to)
      };
    }

    if (req.query.accountHead) {
      filter.accountHead = req.query.accountHead;
    }

    const [data, total] = await Promise.all([
      Expense.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      Expense.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single expense
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const expense = await Expense.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email');
    
    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }
    return successResponse(res, expense);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create expense
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = expenseValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;
    
    const expense = new Expense({
      ...value,
      companyId,
      branchId,
      createdBy: req.user._id
    });

    await expense.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.EXPENSE_CREATED, {
      message: `New expense "${expense.expenseNo}" created`,
      data: expense,
      createdBy: req.user.name
    });
    
    return successResponse(res, expense, 'Expense created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Expense number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Update expense
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = expenseValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const expense = await Expense.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }
    return successResponse(res, expense, 'Expense updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Expense number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Delete expense
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const expense = await Expense.findOneAndDelete(filter);
    
    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }
    return successResponse(res, null, 'Expense deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
