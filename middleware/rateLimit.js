// ============================================
// 🛡️ RATE LIMIT - محسّن
// ============================================

const rateLimit = require('express-rate-limit');

// ✅ Rate Limit عام للـ API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: '⚠️ عدد الطلبات تجاوز الحد المسموح، حاول بعد 15 دقيقة',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// ✅ Rate Limit صارم للمصادقة
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: '⚠️ محاولات كثيرة، حاول بعد 15 دقيقة',
    retryAfter: 900,
  },
});

// ✅ Rate Limit للتسجيل
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: '⚠️ محاولات تسجيل كثيرة، حاول بعد ساعة',
    retryAfter: 3600,
  },
});

// ✅ Rate Limit للبريد - معتدل
const emailLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 دقائق
  max: 10, // 10 محاولات فقط
  message: {
    success: false,
    message: '⚠️ محاولات إرسال بريد كثيرة، حاول بعد 5 دقائق',
    retryAfter: 300,
  },
});

module.exports = {
  limiter,
  strictLimiter,
  registerLimiter,
  emailLimiter,
};