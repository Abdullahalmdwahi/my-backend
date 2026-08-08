// ============================================
// 🚦 RATE LIMIT - مع إضافة emailLimiter
// ============================================

const rateLimit = require('express-rate-limit');

// ============================================
// 📊 Rate Limit عام
// ============================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 1000, // الحد الأقصى للطلبات
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
      message: '⚠️ عدد كبير من الطلبات، يرجى الانتظار 15 دقيقة',
      retryAfter: Math.ceil(15 * 60),
    });
  },
});

// ============================================
// 🔒 Rate Limit صارم (لتسجيل الدخول)
// ============================================
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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
// 📝 Rate Limit للتسجيل
// ============================================
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⚠️ محاولات تسجيل كثيرة، يرجى الانتظار ساعة',
  },
});

// ============================================
// 📧 Rate Limit للإيميلات (مخصص)
// ============================================
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 100, // 100 إيميل في الساعة
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⚠️ عدد كبير من الإيميلات، يرجى الانتظار',
  },
  keyGenerator: (req) => {
    // استخدام البريد الإلكتروني المستهدف كمفتاح
    const email = req.body?.to || req.body?.email;
    if (email) return email;
    return req.ip || 'unknown';
  },
  skip: (req) => {
    // تخطي للمسارات الصحية
    return req.path === '/health' || req.path === '/metrics';
  },
  handler: (req, res) => {
    const retryAfter = Math.ceil(60 * 60);
    res.status(429).json({
      success: false,
      message: '⚠️ عدد كبير من الإيميلات، يرجى الانتظار ساعة',
      retryAfter: retryAfter,
      limit: 100,
      window: '60 minutes',
    });
  },
});

module.exports = {
  limiter,
  strictLimiter,
  registerLimiter,
  emailLimiter,
};