// ============================================
// 💳 WALLET ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// ============================================
// PUBLIC ROUTES
// ============================================

// @route   GET /api/wallets/types
// @desc    Get wallet types
// @access  Public
router.get('/types', walletController.getTypes);

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   GET /api/wallets
// @desc    Get user wallets
// @access  Private
router.get('/', verifyToken, walletController.getUserWallets);

// @route   GET /api/wallets/balance
// @desc    Get user balance
// @access  Private
router.get('/balance', verifyToken, walletController.getBalance);

// @route   GET /api/wallets/transactions
// @desc    Get wallet transactions
// @access  Private
router.get('/transactions', verifyToken, walletController.getTransactions);

// @route   POST /api/wallets/add-balance
// @desc    Add balance
// @access  Private
router.post('/add-balance', verifyToken, validate(schemas.addBalance), walletController.addBalance);

// @route   POST /api/wallets/verify-code
// @desc    Verify wallet code
// @access  Private
router.post('/verify-code', verifyToken, validate(schemas.verifyWalletCode), walletController.verifyCode);

// @route   POST /api/wallets/generate-code
// @desc    Generate wallet code
// @access  Private
router.post('/generate-code', verifyToken, validate(schemas.createWalletCode), walletController.generateCode);

// @route   POST /api/wallets/use-code
// @desc    Use wallet code
// @access  Private
router.post('/use-code', verifyToken, validate(schemas.useWalletCode), walletController.useCode);

// ============================================
// ADMIN ROUTES
// ============================================

// @route   GET /api/wallets/admin/all
// @desc    Get all wallets
// @access  Admin
router.get('/admin/all', verifyToken, verifyAdmin, walletController.getAllWallets);

// @route   POST /api/wallets/admin/create
// @desc    Create wallet
// @access  Admin
router.post('/admin/create', verifyToken, verifyAdmin, validate(schemas.createWallet), walletController.createWallet);

// @route   PUT /api/wallets/admin/:id
// @desc    Update wallet
// @access  Admin
router.put('/admin/:id', verifyToken, verifyAdmin, validate(schemas.updateWallet), walletController.updateWallet);

// @route   DELETE /api/wallets/admin/:id
// @desc    Delete wallet
// @access  Admin
router.delete('/admin/:id', verifyToken, verifyAdmin, walletController.deleteWallet);

module.exports = router;