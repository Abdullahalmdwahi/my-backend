const rateLimit = require('express-rate-limit');

// ✅ Rate Limit عام للـ API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 200, // ✅ زيادة إلى 200 طلب
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
  max: 15, // ✅ زيادة إلى 15
  message: {
    success: false,
    message: '⚠️ محاولات كثيرة، حاول بعد 15 دقيقة',
    retryAfter: 900,
  },
});

// ✅ Rate Limit للتسجيل
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, // ✅ زيادة إلى 10
  message: {
    success: false,
    message: '⚠️ محاولات تسجيل كثيرة، حاول بعد ساعة',
    retryAfter: 3600,
  },
});

// ✅ Rate Limit للبريد الإلكتروني - محسّن
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 50, // ✅ 50 بريد في الساعة (معقول)
  message: {
    success: false,
    message: '⚠️ عدد الإيميلات تجاوز الحد المسموح، حاول بعد ساعة',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // ✅ مفتاح فريد لكل مستخدم
    return req.body?.to || req.ip || 'global';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: '⚠️ عدد الإيميلات تجاوز الحد المسموح، حاول بعد ساعة',
      retryAfter: 3600,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

module.exports = {
  limiter,
  strictLimiter,
  registerLimiter,
  emailLimiter,
};