const express = require('express');
const authenticate = require('../middleware/auth');
const { authorize, branchScope } = require('../middleware/roleCheck');
const { createCRUDController } = require('../controllers/crudFactory');
const { validate, salesSchema } = require('../utils/validation');
const { NotificationTypes } = require('../utils/socket');
const Sales = require('../models/Sales');

const router = express.Router();
const controller = createCRUDController(Sales, ['customerName', 'invoiceNo'], {
  entityName: 'Sale',
  onCreate: NotificationTypes.SALE_CREATED,
  onUpdate: NotificationTypes.SALE_UPDATED,
  onDelete: NotificationTypes.SALE_DELETED
});

router.use(authenticate, authorize('admin', 'branch', 'user'), branchScope);
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', validate(salesSchema), controller.create);
router.put('/:id', validate(salesSchema), controller.update);
router.delete('/:id', authorize('admin', 'branch'), controller.delete);

module.exports = router;
