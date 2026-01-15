const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { validate, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } = require('../utils/validation');

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', authenticate, authorize('admin', 'branch'), validate(registerSchema), authController.register);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
