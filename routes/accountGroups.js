const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const AccountGroup = require('../models/AccountGroup');
const { accountGroupValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');

// Get all account groups
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { groupName: { $regex: req.query.search, $options: 'i' } },
        { shortName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const [data, total] = await Promise.all([
      AccountGroup.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      AccountGroup.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single account group
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const accountGroup = await AccountGroup.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name');
    
    if (!accountGroup) {
      return errorResponse(res, 'Account group not found', 404);
    }
    return successResponse(res, accountGroup);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create account group
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = accountGroupValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const accountGroup = new AccountGroup({
      ...value,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId
    });

    await accountGroup.save();
    return successResponse(res, accountGroup, 'Account group created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Update account group
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = accountGroupValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const accountGroup = await AccountGroup.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!accountGroup) {
      return errorResponse(res, 'Account group not found', 404);
    }
    return successResponse(res, accountGroup, 'Account group updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Delete account group
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const accountGroup = await AccountGroup.findOneAndDelete(filter);
    
    if (!accountGroup) {
      return errorResponse(res, 'Account group not found', 404);
    }
    return successResponse(res, null, 'Account group deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
