// ============================================
// 📱 NOTIFICATION ROUTES - جديد ✅
// ============================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', verifyToken, notificationController.getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread count
// @access  Private
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);

// @route   POST /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.post('/:id/read', verifyToken, notificationController.markAsRead);

// @route   POST /api/notifications/read-all
// @desc    Mark all as read
// @access  Private
router.post('/read-all', verifyToken, notificationController.markAllAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', verifyToken, notificationController.deleteNotification);

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications
// @access  Private
router.delete('/clear-all', verifyToken, notificationController.deleteAllNotifications);

// ============================================
// ADMIN ROUTES
// ============================================

// @route   POST /api/notifications/admin/send
// @desc    Send notification to user
// @access  Admin
router.post('/admin/send', verifyToken, verifyAdmin, notificationController.sendToUser);

// @route   POST /api/notifications/admin/send-global
// @desc    Send global notification
// @access  Admin
router.post('/admin/send-global', verifyToken, verifyAdmin, notificationController.sendGlobal);

// @route   GET /api/notifications/admin/global
// @desc    Get global notifications
// @access  Admin
router.get('/admin/global', verifyToken, verifyAdmin, notificationController.getGlobalNotifications);

module.exports = router;