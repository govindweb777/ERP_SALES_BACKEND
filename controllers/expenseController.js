const Expense = require('../models/Expense');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

/**
 * GENERATE EXPENSE VOUCHER NUMBER (uses model static method)
 */
const generateVoucherNo = async (companyId, branchId) => {
  return Expense.generateVoucherNo(companyId, branchId);
};

/**
 * GET ALL EXPENSES
 */
exports.getAll = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: false };
    
    const { search, isActive, from, to, paymentMethod, vendorId } = req.query;
    
    if (search) {
      filter.$or = [
        { vendorName: { $regex: search, $options: 'i' } },
        { voucherNo: { $regex: search, $options: 'i' } },
        { expenseNo: { $regex: search, $options: 'i' } },
        { billNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (from && to) {
      filter.date = { $gte: new Date(from), $lte: new Date(to) };
    }
    
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }
    
    if (vendorId) {
      filter.vendorId = vendorId;
    }

    const [data, total] = await Promise.all([
      Expense.find(filter)
        .populate('vendorId', 'groupName')
        .populate('items.natureOfExpense', 'name')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      Expense.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET SINGLE EXPENSE
 */
exports.getOne = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const expense = await Expense.findOne(filter)
      .populate('vendorId', 'groupName')
      .populate('items.natureOfExpense', 'name')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email');
    
    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }
    
    return successResponse(res, { expense });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * CREATE EXPENSE
 */
exports.create = async (req, res) => {
  try {
    const {
      vendorId,
      vendorName,
      voucherNo,
      date,
      gstin,
      mobileNo,
      email,
      billNo,
      billDate,
      paymentMethod,
      items,
      subtotal,
      taxAmount,
      total,
      specialNotes,
      expenseNo,
      description,
      amount,
      tax,
      accountHead,
      isActive
    } = req.body;

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;

    // Auto-generate voucher number if not provided
    const finalVoucherNo = voucherNo || await generateVoucherNo(companyId, branchId);

    const expense = new Expense({
      vendorId,
      vendorName,
      voucherNo: finalVoucherNo,
      date,
      gstin,
      mobileNo,
      email,
      billNo,
      billDate,
      paymentMethod,
      items,
      subtotal,
      taxAmount,
      total,
      specialNotes,
      expenseNo: expenseNo || finalVoucherNo,
      description,
      amount,
      tax,
      accountHead,
      isActive,
      companyId,
      branchId,
      createdBy: req.user._id
    });

    await expense.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.EXPENSE_CREATED, {
      message: `New expense "${expense.voucherNo}" created`,
      data: expense,
      createdBy: req.user.name
    });
    
    const populatedExpense = await Expense.findById(expense._id)
      .populate('vendorId', 'groupName')
      .populate('items.natureOfExpense', 'name')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode');
    
    return successResponse(res, { expense: populatedExpense }, 'Expense created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Expense/Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * UPDATE EXPENSE
 */
exports.update = async (req, res) => {
  try {
    const {
      vendorId,
      vendorName,
      voucherNo,
      date,
      gstin,
      mobileNo,
      email,
      billNo,
      billDate,
      paymentMethod,
      items,
      subtotal,
      taxAmount,
      total,
      specialNotes,
      expenseNo,
      description,
      amount,
      tax,
      accountHead,
      isActive
    } = req.body;

    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const expense = await Expense.findOneAndUpdate(
      filter,
      {
        vendorId,
        vendorName,
        voucherNo,
        date,
        gstin,
        mobileNo,
        email,
        billNo,
        billDate,
        paymentMethod,
        items,
        subtotal,
        taxAmount,
        total,
        specialNotes,
        expenseNo,
        description,
        amount,
        tax,
        accountHead,
        isActive
      },
      { new: true, runValidators: true }
    )
    .populate('vendorId', 'groupName')
    .populate('items.natureOfExpense', 'name')
    .populate('companyId', 'companyName')
    .populate('branchId', 'branchName branchCode');
    
    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }
    
    return successResponse(res, { expense }, 'Expense updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Expense/Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE EXPENSE (Soft Delete)
 */
exports.delete = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user) 
    };
    
    const expense = await Expense.findOneAndUpdate(
      filter,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    
    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }
    
    return successResponse(res, null, 'Expense deleted successfully');
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
    
    const expense = await Expense.findOne(filter);
    
    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }
    
    expense.isActive = !expense.isActive;
    await expense.save();
    
    return successResponse(res, { expense }, `Expense ${expense.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET NEXT VOUCHER NUMBER
 */
exports.getNextVoucherNo = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const branchId = req.user.branchId;
    
    const voucherNo = await generateVoucherNo(companyId, branchId);
    
    return successResponse(res, { voucherNo });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
