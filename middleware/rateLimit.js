const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: '⚠️ عدد الطلبات تجاوز الحد المسموح، حاول بعد 15 دقيقة',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: '⚠️ محاولات كثيرة، حاول بعد 15 دقيقة',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: '⚠️ محاولات تسجيل كثيرة، حاول بعد ساعة',
  },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 100, // ✅ زود العدد إلى 100
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