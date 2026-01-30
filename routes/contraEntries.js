const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const controller = require('../controllers/contraEntryController');

router.use(authenticate);

// Get next contra number
router.get('/next-number', authorize('admin', 'branch', 'user', 'user-panel'), controller.getNextContraNo);

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

// Restore soft deleted contra entry
router.patch('/restore/:id', authorize('admin', 'branch'), controller.restore);

// Get soft deleted contra entries
router.get('/deleted/list', authorize('admin', 'branch'), controller.getDeleted);

module.exports = router;
