// ============================================
// 🛡️ RATE LIMIT MIDDLEWARE
// ============================================

const rateLimit = require('express-rate-limit');

// ✅ Rate Limit عام
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  message: {
    success: false,
    message: '⚠️ عدد الطلبات تجاوز الحد المسموح، حاول بعد 15 دقيقة',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Rate Limit صارم (تسجيل الدخول)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: '⚠️ محاولات كثيرة، حاول بعد 15 دقيقة',
  },
});

// ✅ Rate Limit للتسجيل
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 5,
  message: {
    success: false,
    message: '⚠️ محاولات تسجيل كثيرة، حاول بعد ساعة',
  },
});

// ✅ Rate Limit للإيميلات
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 20,
  message: {
    success: false,
    message: '⚠️ عدد الإيميلات تجاوز الحد المسموح، حاول بعد ساعة',
  },
});

module.exports = {
  limiter,
  strictLimiter,
  registerLimiter,
  emailLimiter,
};