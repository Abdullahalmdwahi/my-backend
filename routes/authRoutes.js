// ============================================
// 🔐 AUTH ROUTES - النسخة المُصلحة
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { limiter, strictLimiter, registerLimiter } = require('../middleware/rateLimit');
const { validate, schemas } = require('../middleware/validation');

// ✅ Public Routes
router.post('/register', registerLimiter, validate(schemas.register), authController.register);
router.post('/login', strictLimiter, validate(schemas.login), authController.login);
router.post('/verify', limiter, validate(schemas.verify), authController.verify);
router.post('/verify-device', limiter, authController.verifyDevice);
router.post('/send-verification', limiter, authController.sendVerification);
router.post('/forgot-password', limiter, authController.forgotPassword);
router.post('/reset-password', limiter, validate(schemas.resetPassword), authController.resetPassword);
router.post('/refresh-token', limiter, authController.refreshToken);

// ✅ Protected Routes
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);
router.put('/me', verifyToken, validate(schemas.updateUser), authController.updateMe);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;