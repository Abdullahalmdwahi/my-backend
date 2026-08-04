// ============================================
// 📦 PRODUCT ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');

// ============================================
// PUBLIC ROUTES
// ============================================

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', productController.getAll);

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', productController.search);

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', productController.getById);

// @route   GET /api/products/:id/images
// @desc    Get product images
// @access  Public
router.get('/:id/images', productController.getImages);

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   POST /api/products
// @desc    Create product
// @access  Private
router.post('/', verifyToken, validate(schemas.createProduct), productController.create);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id', verifyToken, validate(schemas.createProduct), productController.update);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete('/:id', verifyToken, productController.delete);

// @route   POST /api/products/:id/images
// @desc    Add product image
// @access  Private
router.post('/:id/images', verifyToken, uploadSingle('image'), productController.addImage);

// @route   DELETE /api/products/images/:imageId
// @desc    Remove product image
// @access  Private
router.delete('/images/:imageId', verifyToken, productController.removeImage);

// ============================================
// ADMIN ROUTES
// ============================================

// @route   POST /api/products/:id/approve
// @desc    Approve product
// @access  Admin
router.post('/:id/approve', verifyToken, verifyAdmin, productController.approve);

// @route   POST /api/products/:id/reject
// @desc    Reject product
// @access  Admin
router.post('/:id/reject', verifyToken, verifyAdmin, productController.reject);

// @route   GET /api/products/admin/stats
// @desc    Get product stats
// @access  Admin
router.get('/admin/stats', verifyToken, verifyAdmin, productController.getStats);

module.exports = router;