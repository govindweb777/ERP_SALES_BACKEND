const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const ItemCategory = require('../models/ItemCategory');
const { itemCategoryValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');

// Get all item categories
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      ItemCategory.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      ItemCategory.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single item category
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const itemCategory = await ItemCategory.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name');
    
    if (!itemCategory) {
      return errorResponse(res, 'Item category not found', 404);
    }
    return successResponse(res, itemCategory);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create item category
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = itemCategoryValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const itemCategory = new ItemCategory({
      ...value,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId
    });

    await itemCategory.save();
    return successResponse(res, itemCategory, 'Item category created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Update item category
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = itemCategoryValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const itemCategory = await ItemCategory.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!itemCategory) {
      return errorResponse(res, 'Item category not found', 404);
    }
    return successResponse(res, itemCategory, 'Item category updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Delete item category
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const itemCategory = await ItemCategory.findOneAndDelete(filter);
    
    if (!itemCategory) {
      return errorResponse(res, 'Item category not found', 404);
    }
    return successResponse(res, null, 'Item category deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
