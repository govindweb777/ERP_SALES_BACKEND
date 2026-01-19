const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const controller = require('../controllers/bankAccountController');

router.use(authenticate);

// Get next number
router.get('/next-number', authorize('admin', 'branch', 'user', 'user-panel'), controller.getNextNumber);

// Get deleted
router.get('/deleted', authorize('admin', 'branch'), controller.getDeleted);

// CRUD
router.get('/', authorize('admin', 'branch', 'user', 'user-panel'), controller.getAll);
router.get('/:id', authorize('admin', 'branch', 'user', 'user-panel'), controller.getOne);
router.post('/', authorize('admin', 'branch', 'user'), controller.create);
router.put('/:id', authorize('admin', 'branch', 'user'), controller.update);
router.delete('/:id', authorize('admin', 'branch'), controller.delete);

// Toggle & Restore
router.patch('/:id/toggle-status', authorize('admin', 'branch'), controller.toggleStatus);
router.patch('/:id/restore', authorize('admin', 'branch'), controller.restore);

module.exports = router;
