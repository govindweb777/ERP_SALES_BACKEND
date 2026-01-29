const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Item = require('../models/Item');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getPagination, buildPaginationResponse, getCompanyBranchFilter } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');
const { uploadDocument } = require('../config/multer');

router.use(authenticate);

// Get all items
router.get('/', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    // Search filter
    if (req.query.search) {
      filter.$or = [
        { itemCode: { $regex: req.query.search, $options: 'i' } },
        { itemName: { $regex: req.query.search, $options: 'i' } },
        { projectName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Filters
    // groupId filter removed
    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.showInSales !== undefined) filter.showInSales = req.query.showInSales === 'true';
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [data, total] = await Promise.all([
      Item.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Item.countDocuments(filter)
    ]);

    paginatedResponse(res, data, buildPaginationResponse(total, page, limit));
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Get items for sales/purchase dropdown
router.get('/for-sales', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const filter = {
      ...getCompanyBranchFilter(req.user),
      showInSales: true,
      isActive: true,
      status: { $in: ['Available', 'Ready to Move'] }
    };

    const items = await Item.find(filter)
      .select('itemCode itemName propertyType projectName area totalPrice ratePerUnit status location')
      .sort({ itemName: 1 });

    successResponse(res, { items });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Get single item
router.get('/:id', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode');
    
    if (!item) return errorResponse(res, 'Item not found', 404);
    successResponse(res, { item });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Create item
router.post('/', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      itemCode,
      itemName,
      propertyType,
      projectName,
      location,
      area,
      dimensions,
      ratePerUnit,
      totalPrice,
      bookingAmount,
      status,
      floorNumber,
      totalFloors,
      bedrooms,
      bathrooms,
      parking,
      amenities,
      description,
      legalDetails,
      hsnCode,
      openingStock,
      currentStock,
      openingValue,
      showInSales,
      images,
      isActive
    } = req.body;

    const item = await Item.create({
      itemCode,
      itemName,
      propertyType,
      projectName,
      location,
      area,
      dimensions,
      ratePerUnit,
      totalPrice,
      bookingAmount,
      status,
      floorNumber,
      totalFloors,
      bedrooms,
      bathrooms,
      parking,
      amenities,
      description,
      legalDetails,
      hsnCode,
      openingStock,
      currentStock: currentStock || openingStock || 1,
      openingValue,
      showInSales,
      images,
      isActive: isActive !== undefined ? isActive : true,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId
    });

    sendNotification(req.user.companyId, req.user.branchId, NotificationTypes.ITEM_CREATED, {
      message: `New property "${itemName}" added`,
      data: { _id: item._id, itemCode, itemName, propertyType },
      createdBy: req.user.name
    });

    successResponse(res, { item }, 'Item created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Item code already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
});

// Upload documents for item (multiple files allowed)
router.post('/:id/documents', authorize('admin', 'branch', 'user'), uploadDocument.array('documents', 10), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOne(filter);
    
    if (!item) return errorResponse(res, 'Item not found', 404);
    
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 'No documents uploaded', 400);
    }

    const newDocuments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    }));

    item.documents.push(...newDocuments);
    await item.save();

    successResponse(res, { item, uploadedDocuments: newDocuments }, 'Documents uploaded successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Delete a document from item
router.delete('/:id/documents/:documentId', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const fs = require('fs');
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOne(filter);
    
    if (!item) return errorResponse(res, 'Item not found', 404);
    
    const document = item.documents.id(req.params.documentId);
    if (!document) return errorResponse(res, 'Document not found', 404);
    
    // Delete file from disk
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }
    
    item.documents.pull(req.params.documentId);
    await item.save();

    successResponse(res, { item }, 'Document deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Update item
router.put('/:id', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      itemCode,
      itemName,
      propertyType,
      projectName,
      location,
      area,
      dimensions,
      ratePerUnit,
      totalPrice,
      bookingAmount,
      status,
      floorNumber,
      totalFloors,
      bedrooms,
      bathrooms,
      parking,
      amenities,
      description,
      legalDetails,
      hsnCode,
      openingStock,
      currentStock,
      openingValue,
      showInSales,
      images,
      isActive
    } = req.body;

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOneAndUpdate(
      filter,
      {
        itemCode,
        itemName,
        propertyType,
        projectName,
        location,
        area,
        dimensions,
        ratePerUnit,
        totalPrice,
        bookingAmount,
        status,
        floorNumber,
        totalFloors,
        bedrooms,
        bathrooms,
        parking,
        amenities,
        description,
        legalDetails,
        hsnCode,
        openingStock,
        currentStock,
        openingValue,
        showInSales,
        images,
        isActive
      },
      { new: true, runValidators: true }
    );
    
    if (!item) return errorResponse(res, 'Item not found', 404);
    successResponse(res, { item }, 'Item updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Item code already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
});

// Update item status
router.patch('/:id/status', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { status } = req.body;
    
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!item) return errorResponse(res, 'Item not found', 404);
    successResponse(res, { item }, 'Item status updated');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Toggle item active status
router.patch('/:id/toggle-active', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOne(filter);
    
    if (!item) return errorResponse(res, 'Item not found', 404);
    
    item.isActive = !item.isActive;
    await item.save();
    
    successResponse(res, { item }, `Item ${item.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Delete item
router.delete('/:id', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const item = await Item.findOneAndDelete(filter);
    
    if (!item) return errorResponse(res, 'Item not found', 404);
    successResponse(res, null, 'Item deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
