// ============================================
// 🔐 AUTH ROUTES - معدل ✅
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
// @desc    Register new user
// @access  Public
router.post('/register', registerLimiter, validate(schemas.register), authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', strictLimiter, validate(schemas.login), authController.login);

// @route   POST /api/auth/verify
// @desc    Verify email/phone
// @access  Public
router.post('/verify', limiter, validate(schemas.verify), authController.verify);

// @route   POST /api/auth/send-verification
// @desc    Send verification code
// @access  Public
router.post('/send-verification', limiter, authController.sendVerification);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', limiter, authController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', limiter, validate(schemas.resetPassword), authController.resetPassword);

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', limiter, authController.refreshToken);

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', verifyToken, authController.logout);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', verifyToken, authController.getMe);

// @route   PUT /api/auth/me
// @desc    Update current user
// @access  Private
router.put('/me', verifyToken, validate(schemas.updateUser), authController.updateMe);

// @route   POST /api/auth/change-password
// @desc    Change password
// @access  Private
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;