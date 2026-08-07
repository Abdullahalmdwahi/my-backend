// ============================================
// 🎫 TICKET ROUTES - النسخة المُصلحة
// ============================================

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// ============================================
// 👤 مستخدم
// ============================================

// @route   POST /api/tickets
// @desc    إنشاء تذكرة جديدة
// @access  Private
router.post(
  '/',
  verifyToken,
  validate(schemas.createTicket),
  ticketController.createTicket
);

// @route   POST /api/tickets/:ticketId/messages
// @desc    إرسال رسالة فورية
// @access  Private
router.post(
  '/:ticketId/messages',
  verifyToken,
  ticketController.sendMessage
);

// @route   GET /api/tickets/:ticketId/messages
// @desc    جلب رسائل التذكرة
// @access  Private
router.get(
  '/:ticketId/messages',
  verifyToken,
  ticketController.getMessages
);

// @route   GET /api/tickets/user/:userId
// @desc    جلب تذاكر المستخدم
// @access  Private
router.get(
  '/user/:userId',
  verifyToken,
  ticketController.getUserTickets // ✅ تأكد من وجود هذه الدالة
);

// ============================================
// 👑 مدير
// ============================================

// @route   GET /api/tickets/admin/all
// @desc    جلب جميع التذاكر
// @access  Admin
router.get(
  '/admin/all',
  verifyToken,
  verifyAdmin,
  ticketController.getAllTickets // ✅ السطر 46 - تم الإصلاح
);

// @route   PUT /api/tickets/admin/:ticketId/status
// @desc    تحديث حالة التذكرة
// @access  Admin
router.put(
  '/admin/:ticketId/status',
  verifyToken,
  verifyAdmin,
  ticketController.updateTicketStatus
);

// @route   GET /api/tickets/admin/stats
// @desc    جلب إحصائيات التذاكر
// @access  Admin
router.get(
  '/admin/stats',
  verifyToken,
  verifyAdmin,
  ticketController.getTicketStats
);

module.exports = router;