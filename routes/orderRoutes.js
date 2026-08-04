// ============================================
// 🛒 ORDER ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', verifyToken, orderController.getUserOrders);

// @route   GET /api/orders/seller
// @desc    Get seller orders
// @access  Private
router.get('/seller', verifyToken, orderController.getSellerOrders);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', verifyToken, orderController.getById);

// @route   POST /api/orders
// @desc    Create order
// @access  Private
router.post('/', verifyToken, validate(schemas.createOrder), orderController.create);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', verifyToken, validate(schemas.updateOrderStatus), orderController.updateStatus);

// @route   GET /api/orders/:id/messages
// @desc    Get order messages
// @access  Private
router.get('/:id/messages', verifyToken, orderController.getMessages);

// @route   POST /api/orders/:id/messages
// @desc    Add order message
// @access  Private
router.post('/:id/messages', verifyToken, orderController.addMessage);

// ============================================
// ADMIN ROUTES
// ============================================

// @route   GET /api/orders/admin/all
// @desc    Get all orders
// @access  Admin
router.get('/admin/all', verifyToken, verifyAdmin, orderController.getAll);

// @route   GET /api/orders/admin/stats
// @desc    Get order stats
// @access  Admin
router.get('/admin/stats', verifyToken, verifyAdmin, orderController.getStats);

// @route   DELETE /api/orders/:id
// @desc    Delete order
// @access  Admin
router.delete('/:id', verifyToken, verifyAdmin, orderController.delete);

module.exports = router;