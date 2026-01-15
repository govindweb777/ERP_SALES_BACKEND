const express = require('express');
const authenticate = require('../middleware/auth');
const { authorize, branchScope } = require('../middleware/roleCheck');
const { createCRUDController } = require('../controllers/crudFactory');
const { validate, purchaseSchema } = require('../utils/validation');
const { NotificationTypes } = require('../utils/socket');
const Purchase = require('../models/Purchase');

const router = express.Router();
const controller = createCRUDController(Purchase, ['vendorName', 'purchaseNo'], {
  entityName: 'Purchase',
  onCreate: NotificationTypes.PURCHASE_CREATED,
  onUpdate: NotificationTypes.PURCHASE_UPDATED,
  onDelete: NotificationTypes.PURCHASE_DELETED
});

router.use(authenticate, authorize('admin', 'branch', 'user'), branchScope);
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', validate(purchaseSchema), controller.create);
router.put('/:id', validate(purchaseSchema), controller.update);
router.delete('/:id', authorize('admin', 'branch'), controller.delete);

module.exports = router;
