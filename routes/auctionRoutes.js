// ============================================
// 🔨 AUCTION ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auctionController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// ============================================
// PUBLIC ROUTES
// ============================================

// @route   GET /api/auctions
// @desc    Get all auctions
// @access  Public
router.get('/', auctionController.getAll);

// @route   GET /api/auctions/:id
// @desc    Get auction by ID
// @access  Public
router.get('/:id', auctionController.getById);

// @route   GET /api/auctions/:id/bids
// @desc    Get auction bids
// @access  Public
router.get('/:id/bids', auctionController.getBids);

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   POST /api/auctions
// @desc    Create auction
// @access  Private
router.post('/', verifyToken, validate(schemas.createAuction), auctionController.create);

// @route   PUT /api/auctions/:id
// @desc    Update auction
// @access  Private
router.put('/:id', verifyToken, validate(schemas.createAuction), auctionController.update);

// @route   POST /api/auctions/:id/bid
// @desc    Place bid
// @access  Private
router.post('/:id/bid', verifyToken, validate(schemas.placeBid), auctionController.placeBid);

// @route   POST /api/auctions/:id/end
// @desc    End auction
// @access  Private
router.post('/:id/end', verifyToken, auctionController.end);

// @route   POST /api/auctions/:id/cancel
// @desc    Cancel auction
// @access  Private
router.post('/:id/cancel', verifyToken, auctionController.cancel);

// @route   POST /api/auctions/:id/images
// @desc    Add auction image
// @access  Private
router.post('/:id/images', verifyToken, auctionController.addImage);

// @route   DELETE /api/auctions/images/:imageId
// @desc    Remove auction image
// @access  Private
router.delete('/images/:imageId', verifyToken, auctionController.removeImage);

// ============================================
// ADMIN ROUTES
// ============================================

// @route   GET /api/auctions/admin/stats
// @desc    Get auction stats
// @access  Admin
router.get('/admin/stats', verifyToken, verifyAdmin, auctionController.getStats);

module.exports = router;