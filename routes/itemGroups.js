const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const ItemGroup = require('../models/ItemGroup');
const { itemGroupValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');

// Get all item groups
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { shortName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const [data, total] = await Promise.all([
      ItemGroup.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      ItemGroup.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single item group
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const itemGroup = await ItemGroup.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name');
    
    if (!itemGroup) {
      return errorResponse(res, 'Item group not found', 404);
    }
    return successResponse(res, itemGroup);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create item group
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = itemGroupValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const itemGroup = new ItemGroup({
      ...value,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId
    });

    await itemGroup.save();
    return successResponse(res, itemGroup, 'Item group created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Update item group
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = itemGroupValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const itemGroup = await ItemGroup.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!itemGroup) {
      return errorResponse(res, 'Item group not found', 404);
    }
    return successResponse(res, itemGroup, 'Item group updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Delete item group
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const itemGroup = await ItemGroup.findOneAndDelete(filter);
    
    if (!itemGroup) {
      return errorResponse(res, 'Item group not found', 404);
    }
    return successResponse(res, null, 'Item group deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
