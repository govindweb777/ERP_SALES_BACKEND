const Receipt = require('../models/Receipt');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

/**
 * GENERATE RECEIPT NUMBER
 */
const generateReceiptNo = async (companyId, branchId) => {
  const count = await Receipt.countDocuments({ companyId, branchId });
  return `RCP${String(count + 1).padStart(5, '0')}`;
};

/**
 * GET ALL RECEIPTS
 */
exports.getAll = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: false };
    
    const { search, isActive, from, to, mode, accountId, depositTo } = req.query;
    
    if (search) {
      filter.$or = [
        { accountName: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { receiptNo: { $regex: search, $options: 'i' } },
        { referenceNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (from && to) {
      filter.date = { $gte: new Date(from), $lte: new Date(to) };
    }
    
    if (mode) {
      filter.mode = mode;
    }
    
    if (accountId) {
      filter.accountId = accountId;
    }
    
    if (depositTo) {
      filter.depositTo = depositTo;
    }

    const [data, total] = await Promise.all([
      Receipt.find(filter)
        .populate('accountId', 'groupName')
        .populate('depositTo', 'accountName bankName')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      Receipt.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET SINGLE RECEIPT
 */
exports.getOne = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const receipt = await Receipt.findOne(filter)
      .populate('accountId', 'groupName')
      .populate('depositTo', 'accountName bankName')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email');
    
    if (!receipt) {
      return errorResponse(res, 'Receipt not found', 404);
    }
    
    return successResponse(res, { receipt });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * CREATE RECEIPT
 */
exports.create = async (req, res) => {
  try {
    const {
      receiptNo,
      accountId,
      accountName,
      email,
      amountReceived,
      date,
      mode,
      referenceNo,
      depositTo,
      depositToName,
      enableGstOnAdvance,
      gstAmount,
      outstandingInvoices,
      totalPayment,
      totalDiscount,
      customerName,
      fromAccount,
      amount,
      specialNotes,
      isActive
    } = req.body;

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;

    // Auto-generate receipt number if not provided
    const finalReceiptNo = receiptNo || await generateReceiptNo(companyId, branchId);

    const receipt = new Receipt({
      receiptNo: finalReceiptNo,
      accountId,
      accountName,
      email,
      amountReceived,
      date,
      mode,
      referenceNo,
      depositTo,
      depositToName,
      enableGstOnAdvance,
      gstAmount,
      outstandingInvoices,
      totalPayment,
      totalDiscount,
      customerName: customerName || accountName,
      fromAccount,
      amount: amount || amountReceived,
      specialNotes,
      isActive,
      companyId,
      branchId,
      createdBy: req.user._id
    });

    await receipt.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.RECEIPT_CREATED, {
      message: `Receipt "${receipt.receiptNo}" received from ${receipt.accountName || receipt.customerName}`,
      data: receipt,
      createdBy: req.user.name
    });
    
    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate('accountId', 'groupName')
      .populate('depositTo', 'accountName bankName')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode');
    
    return successResponse(res, { receipt: populatedReceipt }, 'Receipt created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Receipt number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * UPDATE RECEIPT
 */
exports.update = async (req, res) => {
  try {
    const {
      receiptNo,
      accountId,
      accountName,
      email,
      amountReceived,
      date,
      mode,
      referenceNo,
      depositTo,
      depositToName,
      enableGstOnAdvance,
      gstAmount,
      outstandingInvoices,
      totalPayment,
      totalDiscount,
      customerName,
      fromAccount,
      amount,
      specialNotes,
      isActive
    } = req.body;

    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const receipt = await Receipt.findOneAndUpdate(
      filter,
      {
        receiptNo,
        accountId,
        accountName,
        email,
        amountReceived,
        date,
        mode,
        referenceNo,
        depositTo,
        depositToName,
        enableGstOnAdvance,
        gstAmount,
        outstandingInvoices,
        totalPayment,
        totalDiscount,
        customerName,
        fromAccount,
        amount,
        specialNotes,
        isActive
      },
      { new: true, runValidators: true }
    )
    .populate('accountId', 'groupName')
    .populate('depositTo', 'accountName bankName')
    .populate('companyId', 'companyName')
    .populate('branchId', 'branchName branchCode');
    
    if (!receipt) {
      return errorResponse(res, 'Receipt not found', 404);
    }
    
    return successResponse(res, { receipt }, 'Receipt updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Receipt number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE RECEIPT (Soft Delete)
 */
exports.delete = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user) 
    };
    
    const receipt = await Receipt.findOneAndUpdate(
      filter,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    
    if (!receipt) {
      return errorResponse(res, 'Receipt not found', 404);
    }
    
    return successResponse(res, null, 'Receipt deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * TOGGLE STATUS
 */
exports.toggleStatus = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const receipt = await Receipt.findOne(filter);
    
    if (!receipt) {
      return errorResponse(res, 'Receipt not found', 404);
    }
    
    receipt.isActive = !receipt.isActive;
    await receipt.save();
    
    return successResponse(res, { receipt }, `Receipt ${receipt.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET NEXT RECEIPT NUMBER
 */
exports.getNextReceiptNo = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const branchId = req.user.branchId;
    
    const receiptNo = await generateReceiptNo(companyId, branchId);
    
    return successResponse(res, { receiptNo });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
