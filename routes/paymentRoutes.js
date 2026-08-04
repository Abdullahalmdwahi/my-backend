// ============================================
// 💰 PAYMENT ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// ============================================
// PUBLIC ROUTES
// ============================================

// @route   GET /api/payments/methods
// @desc    Get payment methods
// @access  Public
router.get('/methods', paymentController.getMethods);

// @route   GET /api/payments/gateways
// @desc    Get payment gateways
// @access  Public
router.get('/gateways', paymentController.getGateways);

// @route   POST /api/payments/webhook
// @desc    Payment webhook
// @access  Public
router.post('/webhook', paymentController.handleWebhook);

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   POST /api/payments
// @desc    Create payment
// @access  Private
router.post('/', verifyToken, validate(schemas.createPayment), paymentController.create);

// @route   GET /api/payments/transactions
// @desc    Get user transactions
// @access  Private
router.get('/transactions', verifyToken, paymentController.getTransactions);

// @route   GET /api/payments/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get('/transactions/:id', verifyToken, paymentController.getTransaction);

// @route   POST /api/payments/verify
// @desc    Verify payment
// @access  Private
router.post('/verify', verifyToken, validate(schemas.verifyPayment), paymentController.verify);

// ============================================
// ADMIN ROUTES
// ============================================

// @route   GET /api/payments/admin/transactions
// @desc    Get all transactions
// @access  Admin
router.get('/admin/transactions', verifyToken, verifyAdmin, paymentController.getAllTransactions);

// @route   PUT /api/payments/admin/transactions/:id/approve
// @desc    Approve transaction
// @access  Admin
router.put('/admin/transactions/:id/approve', verifyToken, verifyAdmin, paymentController.approveTransaction);

// @route   PUT /api/payments/admin/transactions/:id/reject
// @desc    Reject transaction
// @access  Admin
router.put('/admin/transactions/:id/reject', verifyToken, verifyAdmin, paymentController.rejectTransaction);

// @route   GET /api/payments/admin/stats
// @desc    Get payment stats
// @access  Admin
router.get('/admin/stats', verifyToken, verifyAdmin, paymentController.getStats);

module.exports = router;