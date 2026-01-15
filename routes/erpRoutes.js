const express = require('express');
const authenticate = require('../middleware/auth');
const { authorize, branchScope } = require('../middleware/roleCheck');
const { createCRUDController } = require('../controllers/crudFactory');
const { validate, accountGroupSchema, bankAccountSchema, itemGroupSchema, itemCategorySchema, itemSchema, expenseSchema, receiptSchema, paymentSchema, contraEntrySchema, journalVoucherSchema } = require('../utils/validation');

// Models
const AccountGroup = require('../models/AccountGroup');
const BankAccount = require('../models/BankAccount');
const ItemGroup = require('../models/ItemGroup');
const ItemCategory = require('../models/ItemCategory');
const Item = require('../models/Item');
const Expense = require('../models/Expense');
const Receipt = require('../models/Receipt');
const Payment = require('../models/Payment');
const ContraEntry = require('../models/ContraEntry');
const JournalVoucher = require('../models/JournalVoucher');

const createRouter = (Model, schema, searchFields) => {
  const router = express.Router();
  const controller = createCRUDController(Model, searchFields);
  router.use(authenticate, authorize('admin', 'branch', 'user'), branchScope);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getOne);
  router.post('/', validate(schema), controller.create);
  router.put('/:id', validate(schema), controller.update);
  router.delete('/:id', authorize('admin', 'branch'), controller.delete);
  return router;
};

module.exports = {
  accountGroups: createRouter(AccountGroup, accountGroupSchema, ['groupName', 'shortName']),
  bankAccounts: createRouter(BankAccount, bankAccountSchema, ['accountName', 'bankHolderName']),
  itemGroups: createRouter(ItemGroup, itemGroupSchema, ['name', 'shortName']),
  itemCategories: createRouter(ItemCategory, itemCategorySchema, ['name']),
  items: createRouter(Item, itemSchema, ['itemName', 'itemCode']),
  expenses: createRouter(Expense, expenseSchema, ['vendorName', 'expenseNo']),
  receipts: createRouter(Receipt, receiptSchema, ['customerName', 'receiptNo']),
  payments: createRouter(Payment, paymentSchema, ['vendorName', 'paymentNo']),
  contraEntries: createRouter(ContraEntry, contraEntrySchema, ['voucherNo']),
  journalVouchers: createRouter(JournalVoucher, journalVoucherSchema, ['voucherNo'])
};
