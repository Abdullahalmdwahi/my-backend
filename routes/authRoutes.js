// ============================================
// 🔐 AUTH ROUTES - نسخة محسنة
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { limiter, strictLimiter, registerLimiter } = require('../middleware/rateLimit');
const { validate, schemas } = require('../middleware/validation');

// ============================================
// PUBLIC ROUTES
// ============================================

// @route   POST /api/auth/register
router.post('/register', registerLimiter, validate(schemas.register), authController.register);

// @route   POST /api/auth/login
router.post('/login', strictLimiter, validate(schemas.login), authController.login);

// @route   POST /api/auth/verify
router.post('/verify', limiter, validate(schemas.verify), authController.verify);

// @route   POST /api/auth/verify-device - ✅ إضافة مسار التحقق من الجهاز
router.post('/verify-device', limiter, authController.verifyDevice);

// @route   POST /api/auth/send-verification
router.post('/send-verification', limiter, authController.sendVerification);

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', limiter, authController.forgotPassword);

// @route   POST /api/auth/reset-password
router.post('/reset-password', limiter, validate(schemas.resetPassword), authController.resetPassword);

// @route   POST /api/auth/refresh-token
router.post('/refresh-token', limiter, authController.refreshToken);

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   POST /api/auth/logout
router.post('/logout', verifyToken, authController.logout);

// @route   GET /api/auth/me
router.get('/me', verifyToken, authController.getMe);

// @route   PUT /api/auth/me
router.put('/me', verifyToken, validate(schemas.updateUser), authController.updateMe);

// @route   POST /api/auth/change-password
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;