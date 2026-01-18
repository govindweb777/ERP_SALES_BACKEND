const Payment = require('../models/Payment');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

/**
 * GENERATE PAYMENT NUMBER
 */
const generatePaymentNo = async (companyId, branchId) => {
  const count = await Payment.countDocuments({ companyId, branchId });
  return `P${String(count + 1).padStart(5, '0')}`;
};

/**
 * GET ALL PAYMENTS
 */
exports.getAll = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: false };
    
    const { search, isActive, from, to, mode, accountId, paidFrom } = req.query;
    
    if (search) {
      filter.$or = [
        { accountName: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { paymentNo: { $regex: search, $options: 'i' } },
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
    
    if (paidFrom) {
      filter.paidFrom = paidFrom;
    }

    const [data, total] = await Promise.all([
      Payment.find(filter)
        .populate('accountId', 'groupName')
        .populate('paidFrom', 'accountName bankName')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      Payment.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET SINGLE PAYMENT
 */
exports.getOne = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const payment = await Payment.findOne(filter)
      .populate('accountId', 'groupName')
      .populate('paidFrom', 'accountName bankName')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email');
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }
    
    return successResponse(res, { payment });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * CREATE PAYMENT
 */
exports.create = async (req, res) => {
  try {
    const {
      paymentNo,
      accountId,
      accountName,
      email,
      amountPaid,
      date,
      mode,
      referenceNo,
      paidFrom,
      paidFromName,
      outstandingBills,
      totalPayment,
      vendorName,
      toAccount,
      amount,
      specialNotes,
      isActive
    } = req.body;

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;

    // Auto-generate payment number if not provided
    const finalPaymentNo = paymentNo || await generatePaymentNo(companyId, branchId);

    const payment = new Payment({
      paymentNo: finalPaymentNo,
      accountId,
      accountName,
      email,
      amountPaid,
      date,
      mode,
      referenceNo,
      paidFrom,
      paidFromName,
      outstandingBills,
      totalPayment,
      vendorName: vendorName || accountName,
      toAccount,
      amount: amount || amountPaid,
      specialNotes,
      isActive,
      companyId,
      branchId,
      createdBy: req.user._id
    });

    await payment.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.PAYMENT_CREATED, {
      message: `Payment "${payment.paymentNo}" made to ${payment.accountName || payment.vendorName}`,
      data: payment,
      createdBy: req.user.name
    });
    
    const populatedPayment = await Payment.findById(payment._id)
      .populate('accountId', 'groupName')
      .populate('paidFrom', 'accountName bankName')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode');
    
    return successResponse(res, { payment: populatedPayment }, 'Payment created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Payment number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * UPDATE PAYMENT
 */
exports.update = async (req, res) => {
  try {
    const {
      paymentNo,
      accountId,
      accountName,
      email,
      amountPaid,
      date,
      mode,
      referenceNo,
      paidFrom,
      paidFromName,
      outstandingBills,
      totalPayment,
      vendorName,
      toAccount,
      amount,
      specialNotes,
      isActive
    } = req.body;

    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const payment = await Payment.findOneAndUpdate(
      filter,
      {
        paymentNo,
        accountId,
        accountName,
        email,
        amountPaid,
        date,
        mode,
        referenceNo,
        paidFrom,
        paidFromName,
        outstandingBills,
        totalPayment,
        vendorName,
        toAccount,
        amount,
        specialNotes,
        isActive
      },
      { new: true, runValidators: true }
    )
    .populate('accountId', 'groupName')
    .populate('paidFrom', 'accountName bankName')
    .populate('companyId', 'companyName')
    .populate('branchId', 'branchName branchCode');
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }
    
    return successResponse(res, { payment }, 'Payment updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Payment number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE PAYMENT (Soft Delete)
 */
exports.delete = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user) 
    };
    
    const payment = await Payment.findOneAndUpdate(
      filter,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }
    
    return successResponse(res, null, 'Payment deleted successfully');
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
    
    const payment = await Payment.findOne(filter);
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }
    
    payment.isActive = !payment.isActive;
    await payment.save();
    
    return successResponse(res, { payment }, `Payment ${payment.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET NEXT PAYMENT NUMBER
 */
exports.getNextPaymentNo = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const branchId = req.user.branchId;
    
    const paymentNo = await generatePaymentNo(companyId, branchId);
    
    return successResponse(res, { paymentNo });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
