const JournalVoucher = require('../models/JournalVoucher');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');
const { sendNotification, NotificationTypes } = require('../utils/socket');

/**
 * GENERATE JV NUMBER (uses model static method)
 */
const generateJVNo = async (companyId, branchId) => {
  return JournalVoucher.generateJVNo(companyId, branchId);
};

/**
 * GET ALL JOURNAL VOUCHERS
 */
exports.getAll = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: false };
    
    const { search, isActive, from, to } = req.query;
    
    if (search) {
      filter.$or = [
        { jvNo: { $regex: search, $options: 'i' } },
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

    const [data, total] = await Promise.all([
      JournalVoucher.find(filter)
        .populate('entries.accountId', 'name groupType')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 }),
      JournalVoucher.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET SINGLE JOURNAL VOUCHER
 */
exports.getOne = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const journalVoucher = await JournalVoucher.findOne(filter)
      .populate('entries.accountId', 'name groupType')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email');
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    
    return successResponse(res, { journalVoucher });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * CREATE JOURNAL VOUCHER
 */
exports.create = async (req, res) => {
  try {
    const {
      jvNo,
      voucherNo,
      date,
      referenceNo,
      entries,
      totalDebit,
      totalCredit,
      totalAmount,
      specialNotes,
      narration,
      isActive
    } = req.body;

    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId;

    // Auto-generate JV number if not provided
    const finalJVNo = jvNo || voucherNo || await generateJVNo(companyId, branchId);

    // Calculate totals if entries provided
    let calcDebit = totalDebit || 0;
    let calcCredit = totalCredit || 0;
    
    if (entries && entries.length > 0) {
      calcDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      calcCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    }

    // Validate debit equals credit
    if (calcDebit !== calcCredit) {
      return errorResponse(res, 'Total debit must equal total credit', 400);
    }

    const journalVoucher = new JournalVoucher({
      jvNo: finalJVNo,
      voucherNo: voucherNo || finalJVNo,
      date,
      referenceNo,
      entries,
      totalDebit: calcDebit,
      totalCredit: calcCredit,
      totalAmount: calcDebit,
      specialNotes,
      narration: narration || specialNotes,
      isActive,
      companyId,
      branchId,
      createdBy: req.user._id
    });

    await journalVoucher.save();
    
    // Emit socket notification
    sendNotification(companyId, branchId, NotificationTypes.JOURNAL_CREATED, {
      message: `Journal voucher "${journalVoucher.jvNo}" created`,
      data: journalVoucher,
      createdBy: req.user.name
    });
    
    const populatedJV = await JournalVoucher.findById(journalVoucher._id)
      .populate('entries.accountId', 'name groupType')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode');
    
    return successResponse(res, { journalVoucher: populatedJV }, 'Journal voucher created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'JV/Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * UPDATE JOURNAL VOUCHER
 */
exports.update = async (req, res) => {
  try {
    const {
      jvNo,
      voucherNo,
      date,
      referenceNo,
      entries,
      totalDebit,
      totalCredit,
      totalAmount,
      specialNotes,
      narration,
      isActive
    } = req.body;

    // Calculate totals if entries provided
    let calcDebit = totalDebit || 0;
    let calcCredit = totalCredit || 0;
    
    if (entries && entries.length > 0) {
      calcDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      calcCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    }

    // Validate debit equals credit
    if (calcDebit !== calcCredit) {
      return errorResponse(res, 'Total debit must equal total credit', 400);
    }

    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const journalVoucher = await JournalVoucher.findOneAndUpdate(
      filter,
      {
        jvNo,
        voucherNo,
        date,
        referenceNo,
        entries,
        totalDebit: calcDebit,
        totalCredit: calcCredit,
        totalAmount: calcDebit,
        specialNotes,
        narration,
        isActive
      },
      { new: true, runValidators: true }
    )
    .populate('entries.accountId', 'name groupType')
    .populate('companyId', 'companyName')
    .populate('branchId', 'branchName branchCode');
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    
    return successResponse(res, { journalVoucher }, 'Journal voucher updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'JV/Voucher number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE JOURNAL VOUCHER (Soft Delete)
 */
exports.delete = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user) 
    };
    
    const journalVoucher = await JournalVoucher.findOneAndUpdate(
      filter,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    
    return successResponse(res, null, 'Journal voucher deleted successfully');
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
    
    const journalVoucher = await JournalVoucher.findOne(filter);
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    
    journalVoucher.isActive = !journalVoucher.isActive;
    await journalVoucher.save();
    
    return successResponse(res, { journalVoucher }, `Journal voucher ${journalVoucher.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * HARD DELETE JOURNAL VOUCHER (Permanent)
 */
exports.hardDelete = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user) 
    };
    
    const journalVoucher = await JournalVoucher.findOneAndDelete(filter);
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found', 404);
    }
    
    return successResponse(res, null, 'Journal voucher permanently deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * RESTORE SOFT DELETED JOURNAL VOUCHER
 */
exports.restore = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: true 
    };
    
    const journalVoucher = await JournalVoucher.findOneAndUpdate(
      filter,
      { isDeleted: false, isActive: true },
      { new: true }
    );
    
    if (!journalVoucher) {
      return errorResponse(res, 'Journal voucher not found or not deleted', 404);
    }
    
    return successResponse(res, { journalVoucher }, 'Journal voucher restored successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET SOFT DELETED JOURNAL VOUCHERS
 */
exports.getDeleted = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: true };

    const [data, total] = await Promise.all([
      JournalVoucher.find(filter)
        .populate('entries.accountId', 'name groupType')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 }),
      JournalVoucher.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET NEXT JV NUMBER
 */
exports.getNextJVNo = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const branchId = req.user.branchId;
    
    const jvNo = await generateJVNo(companyId, branchId);
    
    return successResponse(res, { jvNo });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
