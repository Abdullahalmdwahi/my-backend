// ============================================
// 🚏 API ROUTES - الملف الرئيسي
// ============================================

const express = require('express');
const router = express.Router();

// ✅ استيراد Routes
const authRoutes = require('./auth');
const emailRoutes = require('./email');

// ============================================
// 🚏 تعريف المسارات
// ============================================

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);

// ============================================
// 🏥 Health Check
// ============================================
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