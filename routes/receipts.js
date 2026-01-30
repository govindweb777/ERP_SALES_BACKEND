const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const controller = require('../controllers/receiptController');

router.use(authenticate);

// Get next receipt number
router.get('/next-number', authorize('admin', 'branch', 'user', 'user-panel'), controller.getNextReceiptNo);

// CRUD
router.get('/', authorize('admin', 'branch', 'user', 'user-panel'), controller.getAll);
router.get('/:id', authorize('admin', 'branch', 'user', 'user-panel'), controller.getOne);
router.post('/', authorize('admin', 'branch', 'user'), controller.create);
router.put('/:id', authorize('admin', 'branch', 'user'), controller.update);

// Soft delete (sets isDeleted to true) - using /soft-delete/:id pattern
router.delete('/soft-delete/:id', authorize('admin', 'branch'), controller.delete);

// Hard delete (permanent)
router.delete('/:id', authorize('admin', 'branch'), controller.hardDelete);

// Toggle status
router.patch('/:id/toggle-status', authorize('admin', 'branch'), controller.toggleStatus);

// Restore soft deleted receipt
router.patch('/restore/:id', authorize('admin', 'branch'), controller.restore);

// Get soft deleted receipts
router.get('/deleted/list', authorize('admin', 'branch'), controller.getDeleted);

module.exports = router;
