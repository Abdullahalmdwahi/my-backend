// ============================================
// 👑 ADMIN ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ============================================
// ALL ROUTES ARE ADMIN ONLY
// ============================================

router.use(verifyToken, verifyAdmin);

// ============================================
// 📊 STATS
// ============================================

// @route   GET /api/admin/stats
// @desc    Get dashboard stats
router.get('/stats', adminController.getStats);

// @route   GET /api/admin/stats/revenue
// @desc    Get revenue stats
router.get('/stats/revenue', adminController.getRevenueStats);

// ============================================
// 👤 USERS
// ============================================

// @route   GET /api/admin/users
// @desc    Get all users
router.get('/users', adminController.getUsers);

// @route   GET /api/admin/users/:id
// @desc    Get user details
router.get('/users/:id', adminController.getUserDetails);

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
router.put('/users/:id/role', adminController.updateUserRole);

// @route   POST /api/admin/users/:id/block
// @desc    Block user
router.post('/users/:id/block', adminController.blockUser);

// @route   POST /api/admin/users/:id/unblock
// @desc    Unblock user
router.post('/users/:id/unblock', adminController.unblockUser);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
router.delete('/users/:id', adminController.deleteUser);

// ============================================
// 📦 PRODUCTS
// ============================================

// @route   GET /api/admin/products
// @desc    Get all products
router.get('/products', adminController.getProducts);

// @route   GET /api/admin/products/pending
// @desc    Get pending products
router.get('/products/pending', adminController.getPendingProducts);

// @route   POST /api/admin/products/:id/approve
// @desc    Approve product
router.post('/products/:id/approve', adminController.approveProduct);

// @route   POST /api/admin/products/:id/reject
// @desc    Reject product
router.post('/products/:id/reject', adminController.rejectProduct);

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
router.delete('/products/:id', adminController.deleteProduct);

// ============================================
// 🔨 AUCTIONS
// ============================================

// @route   GET /api/admin/auctions
// @desc    Get all auctions
router.get('/auctions', adminController.getAuctions);

// @route   POST /api/admin/auctions/:id/end
// @desc    End auction
router.post('/auctions/:id/end', adminController.endAuction);

// @route   POST /api/admin/auctions/:id/cancel
// @desc    Cancel auction
router.post('/auctions/:id/cancel', adminController.cancelAuction);

// ============================================
// 💰 PAYMENTS
// ============================================

// @route   GET /api/admin/payments
// @desc    Get all payments
router.get('/payments', adminController.getPayments);

// @route   PUT /api/admin/payments/:id/approve
// @desc    Approve payment
router.put('/payments/:id/approve', adminController.approvePayment);

// @route   PUT /api/admin/payments/:id/reject
// @desc    Reject payment
router.put('/payments/:id/reject', adminController.rejectPayment);

// ============================================
// 📱 NOTIFICATIONS
// ============================================

// @route   POST /api/admin/notifications
// @desc    Send notification
router.post('/notifications', adminController.sendNotification);

// @route   POST /api/admin/notifications/global
// @desc    Send global notification
router.post('/notifications/global', adminController.sendGlobalNotification);

// @route   GET /api/admin/notifications
// @desc    Get admin notifications
router.get('/notifications', adminController.getAdminNotifications);

// @route   POST /api/admin/notifications/:id/read
// @desc    Mark notification as read
router.post('/notifications/:id/read', adminController.markNotificationRead);

// ============================================
// ⚙️ SETTINGS
// ============================================

// @route   GET /api/admin/settings
// @desc    Get app settings
router.get('/settings', adminController.getSettings);

// @route   PUT /api/admin/settings
// @desc    Update app settings
router.put('/settings', adminController.updateSettings);

// @route   GET /api/admin/settings/categories
// @desc    Get categories
router.get('/settings/categories', adminController.getCategories);

// @route   POST /api/admin/settings/categories
// @desc    Create category
router.post('/settings/categories', adminController.createCategory);

// @route   PUT /api/admin/settings/categories/:id
// @desc    Update category
router.put('/settings/categories/:id', adminController.updateCategory);

// @route   DELETE /api/admin/settings/categories/:id
// @desc    Delete category
router.delete('/settings/categories/:id', adminController.deleteCategory);

// ============================================
// 📊 REPORTS
// ============================================

// @route   GET /api/admin/reports
// @desc    Get reports
router.get('/reports', adminController.getReports);

// @route   POST /api/admin/reports/generate
// @desc    Generate report
router.post('/reports/generate', adminController.generateReport);

// @route   GET /api/admin/reports/export/:type
// @desc    Export report
router.get('/reports/export/:type', adminController.exportReport);

module.exports = router;