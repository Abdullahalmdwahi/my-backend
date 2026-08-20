// ============================================
// 🛡️ RATE LIMIT - معطل للاختبار
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

// ✅ تعطيل Rate Limit للبريد تماماً للاختبار
const emailLimiter = (req, res, next) => {
  // ✅ السماح بكل الطلبات (لا يوجد Rate Limit)
  console.log('📧 [emailLimiter] Rate Limit معطل - السماح بالطلب');
  next();
};

module.exports = {
  limiter,
  strictLimiter,
  registerLimiter,
  emailLimiter,
};