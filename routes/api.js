// ============================================
// 📦 API ROUTES - المسارات الرئيسية
// ============================================

const express = require('express');
const router = express.Router();

// ✅ تعريف كل متغير مرة واحدة فقط
const authRoutes = require('./auth');
const emailRoutes = require('./email');

// ✅ استخدام المسارات
router.use('/auth', authRoutes);
router.use('/email', emailRoutes);

// ✅ Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
  });
});

module.exports = router;