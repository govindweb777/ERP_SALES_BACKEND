const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getPagination, buildPaginationResponse, getCompanyBranchFilter } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

router.use(authenticate);

// Get all purchases
router.get('/', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { vendorName: { $regex: req.query.search, $options: 'i' } },
        { purchaseNo: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.fromDate || req.query.toDate) {
      filter.date = {};
      if (req.query.fromDate) filter.date.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.date.$lte = new Date(req.query.toDate);
    }

    const [data, total] = await Promise.all([
      Purchase.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .populate('items.itemId', 'itemCode itemName propertyType projectName')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      Purchase.countDocuments(filter)
    ]);

    paginatedResponse(res, data, buildPaginationResponse(total, page, limit));
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Get single purchase
router.get('/:id', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const purchase = await Purchase.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email')
      .populate('items.itemId', 'itemCode itemName propertyType projectName area location');
    
    if (!purchase) return errorResponse(res, 'Purchase not found', 404);
    successResponse(res, { purchase });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Create purchase (Add new property to inventory)
router.post('/', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      vendorName,
      vendorContact,
      purchaseNo,
      date,
      gstin,
      items,
      subTotal,
      cgst,
      sgst,
      igst,
      tax,
      discount,
      total,
      paymentStatus,
      amountPaid,
      balanceAmount,
      paymentMode,
      notes,
      isActive
    } = req.body;

    // Generate purchase number if not provided
    const finalPurchaseNo = purchaseNo || await Purchase.generatePurchaseNo(req.user.companyId, req.user.branchId);

    // Validate and enrich items
    const enrichedItems = [];
    for (const item of items) {
      let dbItem = await Item.findById(item.itemId);
      
      // If itemId not provided, this might be a new property being purchased
      if (!dbItem && item.itemCode && item.itemName) {
        // Create new item from purchase
        dbItem = await Item.create({
          itemCode: item.itemCode,
          itemName: item.itemName,
          propertyType: item.propertyType || 'Other',
          projectName: item.projectName,
          area: item.area,
          totalPrice: item.rate,
          openingStock: item.qty || 1,
          currentStock: item.qty || 1,
          groupId: item.groupId,
          categoryId: item.categoryId,
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          status: 'Available'
        });
      } else if (!dbItem) {
        return errorResponse(res, `Item not found: ${item.itemId}`, 400);
      }
      
      enrichedItems.push({
        itemId: dbItem._id,
        itemCode: dbItem.itemCode,
        itemName: dbItem.itemName,
        propertyType: dbItem.propertyType,
        projectName: dbItem.projectName,
        area: dbItem.area,
        qty: item.qty || 1,
        rate: item.rate || dbItem.totalPrice,
        amount: item.amount || (item.qty || 1) * (item.rate || dbItem.totalPrice)
      });

      // Update item stock
      await Item.findByIdAndUpdate(dbItem._id, { 
        $inc: { currentStock: item.qty || 1 },
        status: 'Available'
      });
    }

    const purchase = await Purchase.create({
      vendorName,
      vendorContact,
      purchaseNo: finalPurchaseNo,
      date,
      gstin,
      items: enrichedItems,
      subTotal,
      cgst,
      sgst,
      igst,
      tax,
      discount,
      total,
      paymentStatus: paymentStatus || 'Pending',
      amountPaid: amountPaid || 0,
      balanceAmount: balanceAmount || total,
      paymentMode,
      notes,
      isActive: isActive !== undefined ? isActive : true,
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      createdBy: req.user._id
    });

    sendNotification(req.user.companyId, req.user.branchId, NotificationTypes.PURCHASE_CREATED, {
      message: `New purchase created: ${finalPurchaseNo}`,
      data: { _id: purchase._id, purchaseNo: finalPurchaseNo, vendorName, total },
      createdBy: req.user.name
    });

    successResponse(res, { purchase }, 'Purchase created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Purchase number already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
});

// Update purchase
router.put('/:id', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      vendorName,
      vendorContact,
      date,
      gstin,
      items,
      subTotal,
      cgst,
      sgst,
      igst,
      tax,
      discount,
      total,
      paymentStatus,
      amountPaid,
      balanceAmount,
      paymentMode,
      notes,
      isActive
    } = req.body;

    const existingPurchase = await Purchase.findOne({ _id: req.params.id, ...getCompanyBranchFilter(req.user) });
    if (!existingPurchase) return errorResponse(res, 'Purchase not found', 404);

    // Handle item changes
    if (items) {
      // Revert old item stock
      for (const oldItem of existingPurchase.items) {
        await Item.findByIdAndUpdate(oldItem.itemId, { 
          $inc: { currentStock: -(oldItem.qty || 1) }
        });
      }

      // Validate and enrich new items
      const enrichedItems = [];
      for (const item of items) {
        const dbItem = await Item.findById(item.itemId);
        if (!dbItem) {
          return errorResponse(res, `Item not found: ${item.itemId}`, 400);
        }
        
        enrichedItems.push({
          itemId: dbItem._id,
          itemCode: dbItem.itemCode,
          itemName: dbItem.itemName,
          propertyType: dbItem.propertyType,
          projectName: dbItem.projectName,
          area: dbItem.area,
          qty: item.qty || 1,
          rate: item.rate || dbItem.totalPrice,
          amount: item.amount
        });

        // Update new item stock
        await Item.findByIdAndUpdate(item.itemId, { 
          $inc: { currentStock: item.qty || 1 }
        });
      }

      existingPurchase.items = enrichedItems;
    }

    // Update other fields
    if (vendorName !== undefined) existingPurchase.vendorName = vendorName;
    if (vendorContact !== undefined) existingPurchase.vendorContact = vendorContact;
    if (date !== undefined) existingPurchase.date = date;
    if (gstin !== undefined) existingPurchase.gstin = gstin;
    if (subTotal !== undefined) existingPurchase.subTotal = subTotal;
    if (cgst !== undefined) existingPurchase.cgst = cgst;
    if (sgst !== undefined) existingPurchase.sgst = sgst;
    if (igst !== undefined) existingPurchase.igst = igst;
    if (tax !== undefined) existingPurchase.tax = tax;
    if (discount !== undefined) existingPurchase.discount = discount;
    if (total !== undefined) existingPurchase.total = total;
    if (paymentStatus !== undefined) existingPurchase.paymentStatus = paymentStatus;
    if (amountPaid !== undefined) existingPurchase.amountPaid = amountPaid;
    if (balanceAmount !== undefined) existingPurchase.balanceAmount = balanceAmount;
    if (paymentMode !== undefined) existingPurchase.paymentMode = paymentMode;
    if (notes !== undefined) existingPurchase.notes = notes;
    if (isActive !== undefined) existingPurchase.isActive = isActive;

    await existingPurchase.save();

    sendNotification(req.user.companyId, req.user.branchId, NotificationTypes.PURCHASE_UPDATED, {
      message: `Purchase updated: ${existingPurchase.purchaseNo}`,
      data: { _id: existingPurchase._id, purchaseNo: existingPurchase.purchaseNo },
      updatedBy: req.user.name
    });

    successResponse(res, { purchase: existingPurchase }, 'Purchase updated successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Update payment status
router.patch('/:id/payment', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { amountPaid, paymentMode } = req.body;
    
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const purchase = await Purchase.findOne(filter);
    
    if (!purchase) return errorResponse(res, 'Purchase not found', 404);
    
    purchase.amountPaid = (purchase.amountPaid || 0) + amountPaid;
    purchase.balanceAmount = purchase.total - purchase.amountPaid;
    purchase.paymentStatus = purchase.balanceAmount <= 0 ? 'Paid' : purchase.amountPaid > 0 ? 'Partial' : 'Pending';
    if (paymentMode) purchase.paymentMode = paymentMode;
    
    await purchase.save();
    
    successResponse(res, { purchase }, 'Payment updated');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Delete purchase
router.delete('/:id', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const purchase = await Purchase.findOne(filter);
    
    if (!purchase) return errorResponse(res, 'Purchase not found', 404);
    
    // Revert item stock
    for (const item of purchase.items) {
      await Item.findByIdAndUpdate(item.itemId, { 
        $inc: { currentStock: -(item.qty || 1) }
      });
    }
    
    await purchase.deleteOne();
    successResponse(res, null, 'Purchase deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
