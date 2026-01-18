const express = require('express');
const router = express.Router();
const chartController = require('../controllers/charController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(authenticate);
// console.log("heeeelo", hello);

// Get all groups (tree or flat)
router.get(
  '/',
  authorize('admin', 'branch', 'user-panel'),
  chartController.getAllGroups
);

// Get single group
router.get(
  '/:id',
  authorize('admin', 'branch', 'user-panel'),
  chartController.getGroup
);

// Create group
router.post(
  '/',
  authorize('admin', 'branch'),
  chartController.createGroup
);

// Update group
router.put(
  '/:id',
  authorize('admin'),
  chartController.updateGroup
);

// Delete group (only non-system & no children)
router.delete(
  '/:id',
  authorize('admin'),
  chartController.deleteGroup
);

module.exports = router;