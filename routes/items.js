const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Item = require('../models/Item');
const { itemValidation } = require('../utils/validation');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

// Get all items
router.get('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { itemCode: { $regex: req.query.search, $options: 'i' } },
        { itemName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.groupId) {
      filter.groupId = req.query.groupId;
    }

    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }

    if (req.query.showInSales !== undefined) {
      filter.showInSales = req.query.showInSales === 'true';
    }

    const [data, total] = await Promise.all([
      Item.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'name')
        .populate('groupId', 'name')
        .populate('categoryId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Item.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get single item
router.get('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'name')
      .populate('groupId', 'name')
      .populate('categoryId', 'name');
    
    if (!item) {
      return errorResponse(res, 'Item not found', 404);
    }
    return successResponse(res, item);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Create item
router.post('/', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = itemValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;
    
    const item = new Item({
      ...value,
      companyId,
      branchId
    });

    await item.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.ITEM_CREATED, {
      message: `New item "${item.itemName}" added`,
      data: item,
      createdBy: req.user.name
    });
    
    return successResponse(res, item, 'Item created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Item code already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Update item
router.put('/:id', authenticate, authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { error, value } = itemValidation.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOneAndUpdate(filter, value, { new: true, runValidators: true });
    
    if (!item) {
      return errorResponse(res, 'Item not found', 404);
    }
    return successResponse(res, item, 'Item updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Item code already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Delete item
router.delete('/:id', authenticate, authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOneAndDelete(filter);
    
    if (!item) {
      return errorResponse(res, 'Item not found', 404);
    }
    return successResponse(res, null, 'Item deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
