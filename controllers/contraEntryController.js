const ContraEntry = require('../models/ContraEntry');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

/**
 * GENERATE CONTRA NUMBER
 */
const generateContraNo = async (companyId, branchId) => {
  const count = await ContraEntry.countDocuments({ companyId, branchId });
  return `CTR${String(count + 1).padStart(5, '0')}`;
};

/**
 * GET ALL CONTRA ENTRIES
 */
exports.getAll = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: false };
    
    const { search, isActive, from, to, mode } = req.query;
    
    if (search) {
      filter.$or = [
        { contraNo: { $regex: search, $options: 'i' } },
        { voucherNo: { $regex: search, $options: 'i' } },
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

    const [data, total] = await Promise.all([
      ContraEntry.find(filter)
        .populate('entries.accountId', 'accountName bankName')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      ContraEntry.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET SINGLE CONTRA ENTRY
 */
exports.getOne = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const contraEntry = await ContraEntry.findOne(filter)
      .populate('entries.accountId', 'accountName bankName')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email');
    
    if (!contraEntry) {
      return errorResponse(res, 'Contra entry not found', 404);
    }
    
    return successResponse(res, { contraEntry });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * CREATE CONTRA ENTRY
 */
exports.create = async (req, res) => {
  try {
    const {
      contraNo,
      voucherNo,
      date,
      mode,
      referenceNo,
      entries,
      totalDebit,
      totalCredit,
      totalAmount,
      specialNotes,
      fromAccount,
      toAccount,
      amount,
      narration,
      isActive
    } = req.body;

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;

    // Auto-generate contra number if not provided
    const finalContraNo = contraNo || voucherNo || await generateContraNo(companyId, branchId);

    const contraEntry = new ContraEntry({
      contraNo: finalContraNo,
      voucherNo: voucherNo || finalContraNo,
      date,
      mode,
      referenceNo,
      entries,
      totalDebit,
      totalCredit,
      totalAmount,
      specialNotes,
      fromAccount,
      toAccount,
      amount,
      narration: narration || specialNotes,
      isActive,
      companyId,
      branchId,
      createdBy: req.user._id
    });

    await contraEntry.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.CONTRA_CREATED, {
      message: `Contra entry "${contraEntry.contraNo}" created`,
      data: contraEntry,
      createdBy: req.user.name
    });
    
    const populatedContra = await ContraEntry.findById(contraEntry._id)
      .populate('entries.accountId', 'accountName bankName')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode');
    
    return successResponse(res, { contraEntry: populatedContra }, 'Contra entry created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Contra/Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * UPDATE CONTRA ENTRY
 */
exports.update = async (req, res) => {
  try {
    const {
      contraNo,
      voucherNo,
      date,
      mode,
      referenceNo,
      entries,
      totalDebit,
      totalCredit,
      totalAmount,
      specialNotes,
      fromAccount,
      toAccount,
      amount,
      narration,
      isActive
    } = req.body;

    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const contraEntry = await ContraEntry.findOneAndUpdate(
      filter,
      {
        contraNo,
        voucherNo,
        date,
        mode,
        referenceNo,
        entries,
        totalDebit,
        totalCredit,
        totalAmount,
        specialNotes,
        fromAccount,
        toAccount,
        amount,
        narration,
        isActive
      },
      { new: true, runValidators: true }
    )
    .populate('entries.accountId', 'accountName bankName')
    .populate('companyId', 'companyName')
    .populate('branchId', 'branchName branchCode');
    
    if (!contraEntry) {
      return errorResponse(res, 'Contra entry not found', 404);
    }
    
    return successResponse(res, { contraEntry }, 'Contra entry updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Contra/Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE CONTRA ENTRY (Soft Delete)
 */
exports.delete = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user) 
    };
    
    const contraEntry = await ContraEntry.findOneAndUpdate(
      filter,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    
    if (!contraEntry) {
      return errorResponse(res, 'Contra entry not found', 404);
    }
    
    return successResponse(res, null, 'Contra entry deleted successfully');
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
    
    const contraEntry = await ContraEntry.findOne(filter);
    
    if (!contraEntry) {
      return errorResponse(res, 'Contra entry not found', 404);
    }
    
    contraEntry.isActive = !contraEntry.isActive;
    await contraEntry.save();
    
    return successResponse(res, { contraEntry }, `Contra entry ${contraEntry.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET NEXT CONTRA NUMBER
 */
exports.getNextContraNo = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const branchId = req.user.branchId;
    
    const contraNo = await generateContraNo(companyId, branchId);
    
    return successResponse(res, { contraNo });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
