// ============================================
// 👤 USER ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', verifyToken, userController.getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', verifyToken, validate(schemas.updateUser), userController.updateProfile);

// @route   GET /api/users/specializations
// @desc    Get user specializations
// @access  Private
router.get('/specializations', verifyToken, userController.getSpecializations);

// @route   PUT /api/users/specializations
// @desc    Update user specializations
// @access  Private
router.put('/specializations', verifyToken, userController.updateSpecializations);

// @route   GET /api/users/stats
// @desc    Get user stats
// @access  Private
router.get('/stats', verifyToken, userController.getStats);

// @route   POST /api/users/change-password
// @desc    Change password
// @access  Private
router.post('/change-password', verifyToken, userController.changePassword);

// ============================================
// ADMIN ROUTES
// ============================================

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get('/', verifyToken, verifyAdmin, userController.getAll);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/:id', verifyToken, verifyAdmin, userController.getById);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/:id', verifyToken, verifyAdmin, userController.delete);

// @route   POST /api/users/:id/block
// @desc    Block user
// @access  Admin
router.post('/:id/block', verifyToken, verifyAdmin, userController.block);

// @route   POST /api/users/:id/unblock
// @desc    Unblock user
// @access  Admin
router.post('/:id/unblock', verifyToken, verifyAdmin, userController.unblock);

module.exports = router;