const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const AccountGroup = require('../models/AccountGroup');
const ChartOfAccount = require('../models/ChartOfAccount');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getPagination, buildPaginationResponse, getCompanyBranchFilter } = require('../utils/helpers');

router.use(authenticate);

// Get all account groups
router.get('/', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = getCompanyBranchFilter(req.user);
    
    if (req.query.search) {
      filter.$or = [
        { groupName: { $regex: req.query.search, $options: 'i' } },
        { shortName: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.chartOfAccountId) filter.chartOfAccountId = req.query.chartOfAccountId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [data, total] = await Promise.all([
      AccountGroup.find(filter)
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName branchCode')
        .populate('chartOfAccountId', 'name item nature groupType')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      AccountGroup.countDocuments(filter)
    ]);

    paginatedResponse(res, data, buildPaginationResponse(total, page, limit));
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Get single account group
router.get('/:id', authorize('admin', 'branch', 'user', 'user-panel'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const accountGroup = await AccountGroup.findOne(filter)
      .populate('companyId', 'companyName')
      .populate('branchId', 'branchName branchCode')
      .populate('chartOfAccountId', 'name item nature groupType');
    
    if (!accountGroup) return errorResponse(res, 'Account group not found', 404);
    successResponse(res, { accountGroup });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Create account group
router.post('/', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      chartOfAccountId,
      underGroup,
      groupName,
      shortName,
      gstin,
      pan,
      natureOfBusiness,
      creditPeriod,
      creditLimit,
      defaultPaymentMode,
      contact,
      openingBalance,
      isActive
    } = req.body;

    // Validate chart of account exists
    const chartOfAccount = await ChartOfAccount.findOne({
      _id: chartOfAccountId,
      companyId: req.user.companyId
    });

    if (!chartOfAccount) {
      return errorResponse(res, 'Chart of Account not found', 404);
    }

    const accountGroup = await AccountGroup.create({
      chartOfAccountId,
      underGroup,
      groupName,
      shortName,
      gstin,
      pan,
      natureOfBusiness,
      creditPeriod,
      creditLimit,
      defaultPaymentMode,
      contact,
      openingBalance,
      isActive: isActive !== undefined ? isActive : true,
      companyId: req.user.companyId,
      branchId: req.user.branchId || req.body.branchId
    });

    successResponse(res, { accountGroup }, 'Account group created successfully', 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Update account group
router.put('/:id', authorize('admin', 'branch', 'user'), async (req, res) => {
  try {
    const {
      chartOfAccountId,
      underGroup,
      groupName,
      shortName,
      gstin,
      pan,
      natureOfBusiness,
      creditPeriod,
      creditLimit,
      defaultPaymentMode,
      contact,
      openingBalance,
      isActive
    } = req.body;

    // Validate chart of account if changed
    if (chartOfAccountId) {
      const chartOfAccount = await ChartOfAccount.findOne({
        _id: chartOfAccountId,
        companyId: req.user.companyId
      });

      if (!chartOfAccount) {
        return errorResponse(res, 'Chart of Account not found', 404);
      }
    }

    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const accountGroup = await AccountGroup.findOneAndUpdate(
      filter,
      {
        chartOfAccountId,
        underGroup,
        groupName,
        shortName,
        gstin,
        pan,
        natureOfBusiness,
        creditPeriod,
        creditLimit,
        defaultPaymentMode,
        contact,
        openingBalance,
        isActive
      },
      { new: true, runValidators: true }
    );
    
    if (!accountGroup) return errorResponse(res, 'Account group not found', 404);
    successResponse(res, { accountGroup }, 'Account group updated successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Toggle account group status
router.patch('/:id/toggle-status', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const accountGroup = await AccountGroup.findOne(filter);
    
    if (!accountGroup) return errorResponse(res, 'Account group not found', 404);
    
    accountGroup.isActive = !accountGroup.isActive;
    await accountGroup.save();
    
    successResponse(res, { accountGroup }, `Account group ${accountGroup.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

// Delete account group
router.delete('/:id', authorize('admin', 'branch'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyBranchFilter(req.user) };
    const accountGroup = await AccountGroup.findOneAndDelete(filter);
    
    if (!accountGroup) return errorResponse(res, 'Account group not found', 404);
    successResponse(res, null, 'Account group deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
