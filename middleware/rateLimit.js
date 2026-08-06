// ============================================
// 🚦 RATE LIMIT - نظام تحديد المعدل
// ============================================

const rateLimit = require('express-rate-limit');

// ============================================
// 🎯 BASE LIMITER
// ============================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⚠️ عدد كبير من الطلبات، يرجى الانتظار',
  },
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
  skip: (req) => {
    return req.path === '/health' || req.path === '/metrics';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: '⚠️ عدد كبير من الطلبات، يرجى الانتظار',
      retryAfter: Math.ceil(15 * 60),
    });
  },
});

// ============================================
// 🎯 STRICT LIMITER - للمصادقة
// ============================================

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⚠️ محاولات كثيرة فاشلة، يرجى الانتظار 15 دقيقة',
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = req.body?.email || req.query?.email;
    return email || req.ip || 'unknown';
  },
});

// ============================================
// 🎯 REGISTER LIMITER
// ============================================

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⚠️ محاولات تسجيل كثيرة، يرجى الانتظار ساعة',
  },
});

module.exports = {
  limiter,
  strictLimiter,
  registerLimiter,
};