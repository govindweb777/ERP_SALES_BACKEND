const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Sales = require('../models/Sales');
const Item = require('../models/Item');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getPagination, buildPaginationResponse, getCompanyBranchFilter } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

router.use(authenticate);

// Get all sales
router.get('/', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { customerName: { $regex: req.query.search, $options: 'i' } },
        { invoiceNo: { $regex: req.query.search, $options: 'i' } }
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
      Sales.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .populate('items.itemId', 'itemCode itemName propertyType projectName')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      Sales.countDocuments(filter)
    ]);

    paginatedResponse(res, data, buildPaginationResponse(total, page, limit));
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Get single sale
router.get('/:id', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const sale = await Sales.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email')
      .populate('items.itemId', 'itemCode itemName propertyType projectName area location');
    
    if (!sale) return errorResponse(res, 'Sale not found', 404);
    successResponse(res, { sale });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Create sale
router.post('/', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      customerName,
      customerContact,
      invoiceNo,
      date,
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

    // Generate invoice number if not provided
    const finalInvoiceNo = invoiceNo || await Sales.generateInvoiceNo(req.user.companyId, req.user.branchId);

    // Validate and enrich items with item details
    const enrichedItems = [];
    for (const item of items) {
      const dbItem = await Item.findById(item.itemId);
      if (!dbItem) {
        return errorResponse(res, `Item not found: ${item.itemId}`, 400);
      }
      if (dbItem.status === 'Sold') {
        return errorResponse(res, `Item already sold: ${dbItem.itemName}`, 400);
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
    }

    const sale = await Sales.create({
      customerName,
      customerContact,
      invoiceNo: finalInvoiceNo,
      date,
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

    // Update item status to Sold/Booked
    for (const item of enrichedItems) {
      await Item.findByIdAndUpdate(item.itemId, { 
        status: paymentStatus === 'Paid' ? 'Sold' : 'Booked',
        currentStock: 0
      });
    }

    sendNotification(req.user.companyId, req.user.branchId, NotificationTypes.SALE_CREATED, {
      message: `New sale created: ${finalInvoiceNo}`,
      data: { _id: sale._id, invoiceNo: finalInvoiceNo, customerName, total },
      createdBy: req.user.name
    });

    successResponse(res, { sale }, 'Sale created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Invoice number already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
});

// Update sale
router.put('/:id', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      customerName,
      customerContact,
      date,
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

    const existingSale = await Sales.findOne({ _id: req.params.id, ...getCompanyBranchFilter(req.user) });
    if (!existingSale) return errorResponse(res, 'Sale not found', 404);

    // Restore old items status if items changed
    if (items) {
      for (const oldItem of existingSale.items) {
        await Item.findByIdAndUpdate(oldItem.itemId, { status: 'Available', currentStock: 1 });
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

        // Update new item status
        await Item.findByIdAndUpdate(item.itemId, { 
          status: (paymentStatus || existingSale.paymentStatus) === 'Paid' ? 'Sold' : 'Booked',
          currentStock: 0
        });
      }

      existingSale.items = enrichedItems;
    }

    // Update other fields
    if (customerName !== undefined) existingSale.customerName = customerName;
    if (customerContact !== undefined) existingSale.customerContact = customerContact;
    if (date !== undefined) existingSale.date = date;
    if (subTotal !== undefined) existingSale.subTotal = subTotal;
    if (cgst !== undefined) existingSale.cgst = cgst;
    if (sgst !== undefined) existingSale.sgst = sgst;
    if (igst !== undefined) existingSale.igst = igst;
    if (tax !== undefined) existingSale.tax = tax;
    if (discount !== undefined) existingSale.discount = discount;
    if (total !== undefined) existingSale.total = total;
    if (paymentStatus !== undefined) existingSale.paymentStatus = paymentStatus;
    if (amountPaid !== undefined) existingSale.amountPaid = amountPaid;
    if (balanceAmount !== undefined) existingSale.balanceAmount = balanceAmount;
    if (paymentMode !== undefined) existingSale.paymentMode = paymentMode;
    if (notes !== undefined) existingSale.notes = notes;
    if (isActive !== undefined) existingSale.isActive = isActive;

    await existingSale.save();

    sendNotification(req.user.companyId, req.user.branchId, NotificationTypes.SALE_UPDATED, {
      message: `Sale updated: ${existingSale.invoiceNo}`,
      data: { _id: existingSale._id, invoiceNo: existingSale.invoiceNo },
      updatedBy: req.user.name
    });

    successResponse(res, { sale: existingSale }, 'Sale updated successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Update payment status
router.patch('/:id/payment', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const { amountPaid, paymentMode } = req.body;
    
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const sale = await Sales.findOne(filter);
    
    if (!sale) return errorResponse(res, 'Sale not found', 404);
    
    sale.amountPaid = (sale.amountPaid || 0) + amountPaid;
    sale.balanceAmount = sale.total - sale.amountPaid;
    sale.paymentStatus = sale.balanceAmount <= 0 ? 'Paid' : sale.amountPaid > 0 ? 'Partial' : 'Pending';
    if (paymentMode) sale.paymentMode = paymentMode;
    
    await sale.save();

    // Update item status if fully paid
    if (sale.paymentStatus === 'Paid') {
      for (const item of sale.items) {
        await Item.findByIdAndUpdate(item.itemId, { status: 'Sold' });
      }
    }
    
    successResponse(res, { sale }, 'Payment updated');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Soft delete sale (sets isDeleted to true)
router.delete('/soft-delete/:id', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const sale = await Sales.findOneAndUpdate(
      filter,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    
    if (!sale) return errorResponse(res, 'Sale not found', 404);
    successResponse(res, { sale }, 'Sale soft deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Restore soft deleted sale
router.patch('/restore/:id', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user), isDeleted: true };
    const sale = await Sales.findOneAndUpdate(
      filter,
      { isDeleted: false, isActive: true },
      { new: true }
    );
    
    if (!sale) return errorResponse(res, 'Sale not found or not deleted', 404);
    successResponse(res, { sale }, 'Sale restored successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Get soft deleted sales
router.get('/deleted/list', authorize('admin', 'branch'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: true };
    
    const [data, total] = await Promise.all([
      Sales.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 }),
      Sales.countDocuments(filter)
    ]);

    paginatedResponse(res, data, buildPaginationResponse(total, page, limit));
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Delete sale (hard delete)
router.delete('/:id', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const sale = await Sales.findOne(filter);
    
    if (!sale) return errorResponse(res, 'Sale not found', 404);
    
    // Restore item status
    for (const item of sale.items) {
      await Item.findByIdAndUpdate(item.itemId, { status: 'Available', currentStock: 1 });
    }
    
    await sale.deleteOne();
    successResponse(res, null, 'Sale deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
