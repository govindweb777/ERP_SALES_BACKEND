const BankAccount = require('../models/BankAccount');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getCompanyBranchFilter, getPaginationParams } = require('../utils/helpers');

/**
 * GET ALL BANK ACCOUNTS
 */
exports.getAll = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: false };
    
    const { search, isActive, underGroup } = req.query;
    
    if (search) {
      filter.$or = [
        { accountName: { $regex: search, $options: 'i' } },
        { bankHolderName: { $regex: search, $options: 'i' } },
        { bankName: { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (underGroup) {
      filter.underGroup = underGroup;
    }

    const [data, total] = await Promise.all([
      BankAccount.find(filter)
        .populate('underGroup', 'name groupType')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      BankAccount.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET SINGLE BANK ACCOUNT
 */
exports.getOne = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const bankAccount = await BankAccount.findOne(filter)
      .populate('underGroup', 'name groupType')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('createdBy', 'name email');
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found', 404);
    }
    
    return successResponse(res, { bankAccount });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * CREATE BANK ACCOUNT
 */
exports.create = async (req, res) => {
  try {
    const {
      underGroup,
      accountName,
      shortName,
      bankHolderName,
      accountNumber,
      ifsc,
      bankName,
      openingBalance,
      balanceType,
      isActive
    } = req.body;

    const bankAccount = new BankAccount({
      underGroup,
      accountName,
      shortName,
      bankHolderName,
      accountNumber,
      ifsc,
      bankName,
      openingBalance,
      balanceType,
      isActive,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId,
      createdBy: req.user._id
    });

    await bankAccount.save();
    
    const populatedAccount = await BankAccount.findById(bankAccount._id)
      .populate('underGroup', 'name groupType')
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode');
    
    return successResponse(res, { bankAccount: populatedAccount }, 'Bank account created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Account number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * UPDATE BANK ACCOUNT
 */
exports.update = async (req, res) => {
  try {
    const {
      underGroup,
      accountName,
      shortName,
      bankHolderName,
      accountNumber,
      ifsc,
      bankName,
      openingBalance,
      balanceType,
      isActive
    } = req.body;

    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: false 
    };
    
    const bankAccount = await BankAccount.findOneAndUpdate(
      filter,
      {
        underGroup,
        accountName,
        shortName,
        bankHolderName,
        accountNumber,
        ifsc,
        bankName,
        openingBalance,
        balanceType,
        isActive
      },
      { new: true, runValidators: true }
    )
    .populate('underGroup', 'name groupType')
    .populate('companyId', 'companyName')
    .populate('branchId', 'branchName branchCode');
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found', 404);
    }
    
    return successResponse(res, { bankAccount }, 'Bank account updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Account number already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE BANK ACCOUNT (Soft Delete)
 */
exports.delete = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user) 
    };
    
    const bankAccount = await BankAccount.findOneAndUpdate(
      filter,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found', 404);
    }
    
    return successResponse(res, null, 'Bank account deleted successfully');
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
    
    const bankAccount = await BankAccount.findOne(filter);
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found', 404);
    }
    
    bankAccount.isActive = !bankAccount.isActive;
    await bankAccount.save();
    
    return successResponse(res, { bankAccount }, `Bank account ${bankAccount.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET DELETED BANK ACCOUNTS
 */
exports.getDeleted = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getCompanyBranchFilter(req.user), isDeleted: true };

    const [data, total] = await Promise.all([
      BankAccount.find(filter)
        .populate('underGroup', 'name groupType')
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 }),
      BankAccount.countDocuments(filter)
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * RESTORE BANK ACCOUNT
 */
exports.restore = async (req, res) => {
  try {
    const filter = { 
      _id: req.params.id, 
      ...getCompanyBranchFilter(req.user),
      isDeleted: true 
    };
    
    const bankAccount = await BankAccount.findOneAndUpdate(
      filter,
      { isDeleted: false, isActive: true },
      { new: true }
    );
    
    if (!bankAccount) {
      return errorResponse(res, 'Bank account not found or not deleted', 404);
    }
    
    return successResponse(res, { bankAccount }, 'Bank account restored successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
