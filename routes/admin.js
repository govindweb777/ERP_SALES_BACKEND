const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const { authorize, canManageUser } = require('../middleware/roleCheck');
const { validate, branchSchema, userUpdateSchema, userPanelSchema, companySchema } = require('../utils/validation');

router.use(authenticate);

// Dashboard
router.get('/dashboard', authorize('admin', 'user-panel'), adminController.getDashboard);

// Company
router.get('/company', adminController.getCompany);
router.put('/company', validate(companySchema), adminController.updateCompany);

// Users
router.get('/users', authorize('admin', 'branch', 'user-panel'), adminController.getUsers);
router.post('/users', authorize('admin', 'branch'), adminController.createUser);
router.post('/users/user-panel', authorize('admin', 'user-panel'), validate(userPanelSchema), adminController.createUserPanel);
router.put('/users/:id', authorize('admin', 'branch'), canManageUser, validate(userUpdateSchema), adminController.updateUser);
router.delete('/users/:id', authorize('admin', 'user-panel', 'branch'), canManageUser, adminController.deleteUser);
router.patch('/users/:id/toggle-status', authorize('admin', 'branch', 'user-panel'), canManageUser, adminController.toggleUserStatus);
router.post('/users/:id/profile-pic', authorize('admin', 'branch'), adminController.uploadProfilePic);

// Branches
router.get('/branches', adminController.getBranches);

router.get('/branchbyId/:id', adminController.getBranchById);
router.get('/branches/deleted', authorize('admin', 'user-panel'), adminController.getDeletedBranches);
router.post('/branches', authorize('admin', 'user-panel'), validate(branchSchema), adminController.createBranch);
router.put('/branches/:id', authorize('admin', 'user-panel'), validate(branchSchema), adminController.updateBranch);
router.delete('/branches/:id', authorize('admin', 'user-panel'), adminController.deleteBranch);
router.patch('/branches/:id/toggle-status', authorize('admin', 'user-panel'), adminController.toggleBranchStatus);
router.patch('/branches/:id/restore', authorize('admin', 'user-panel'), adminController.restoreBranch);

module.exports = router;
