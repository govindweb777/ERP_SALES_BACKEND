const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const BankAccount = require('../models/BankAccount');
const { bankAccountValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');

// Get all bank accounts
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { accountName: { $regex: req.query.search, $options: 'i' } },
        { bankHolderName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const [data, total] = await Promise.all([
      BankAccount.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      BankAccount.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single bank account
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const bankAccount = await BankAccount.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name');
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found', 404);
    }
    return successResponse(res, bankAccount);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create bank account
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = bankAccountValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const bankAccount = new BankAccount({
      ...value,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId
    });

    await bankAccount.save();
    return successResponse(res, bankAccount, 'Bank account created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Update bank account
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = bankAccountValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const bankAccount = await BankAccount.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found', 404);
    }
    return successResponse(res, bankAccount, 'Bank account updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Delete bank account
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const bankAccount = await BankAccount.findOneAndDelete(filter);
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found', 404);
    }
    return successResponse(res, null, 'Bank account deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
