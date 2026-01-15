const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize, branchScope } = require('../middleware/roleCheck');
const { successResponse, errorResponse } = require('../utils/response');
const Sales = require('../models/Sales');
const Purchase = require('../models/Purchase');
const Receipt = require('../models/Receipt');
const Payment = require('../models/Payment');

router.use(authenticate, authorize('admin', 'branch', 'user'), branchScope);

// Ledger Report
router.get('/ledger', async (req, res) => {
  try {
    const { account, from, to } = req.query;
    const filter = { companyId: req.user.companyId._id, ...(req.branchFilter || {}) };
    if (from) filter.date = { $gte: new Date(from) };
    if (to) filter.date = { ...filter.date, $lte: new Date(to) };
    
    const [sales, purchases, receipts, payments] = await Promise.all([
      Sales.find({ ...filter, customerName: new RegExp(account, 'i') }),
      Purchase.find({ ...filter, vendorName: new RegExp(account, 'i') }),
      Receipt.find({ ...filter, customerName: new RegExp(account, 'i') }),
      Payment.find({ ...filter, vendorName: new RegExp(account, 'i') })
    ]);
    successResponse(res, { sales, purchases, receipts, payments });
  } catch (error) { errorResponse(res, error.message, 500); }
});

// Trial Balance
router.get('/trial-balance', async (req, res) => {
  try {
    const filter = { companyId: req.user.companyId._id, ...(req.branchFilter || {}) };
    const [salesTotal, purchaseTotal, receiptTotal, paymentTotal] = await Promise.all([
      Sales.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Purchase.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    successResponse(res, {
      sales: salesTotal[0]?.total || 0,
      purchases: purchaseTotal[0]?.total || 0,
      receipts: receiptTotal[0]?.total || 0,
      payments: paymentTotal[0]?.total || 0
    });
  } catch (error) { errorResponse(res, error.message, 500); }
});

// Receivables & Payables
router.get('/receivables', async (req, res) => {
  try {
    const filter = { companyId: req.user.companyId._id, ...(req.branchFilter || {}) };
    const receivables = await Sales.aggregate([
      { $match: filter },
      { $group: { _id: '$customerName', total: { $sum: '$total' } } }
    ]);
    successResponse(res, { receivables });
  } catch (error) { errorResponse(res, error.message, 500); }
});

router.get('/payables', async (req, res) => {
  try {
    const filter = { companyId: req.user.companyId._id, ...(req.branchFilter || {}) };
    const payables = await Purchase.aggregate([
      { $match: filter },
      { $group: { _id: '$vendorName', total: { $sum: '$total' } } }
    ]);
    successResponse(res, { payables });
  } catch (error) { errorResponse(res, error.message, 500); }
});

module.exports = router;
