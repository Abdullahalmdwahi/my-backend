// ============================================
// 🛡️ حماية من هجمات DDoS
// ============================================

const rateLimit = require('express-rate-limit');

// ✅ حد عام لجميع الطلبات
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: '⚠️ تم تجاوز الحد الأقصى للطلبات، يرجى المحاولة لاحقاً' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ حد صارم لتسجيل الدخول
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, message: '⚠️ محاولات كثيرة، يرجى الانتظار 5 دقائق' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ حد لإعادة تعيين كلمة المرور
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: '⚠️ محاولات كثيرة، يرجى الانتظار ساعة' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ حد لتسجيل المستخدمين الجدد
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: '⚠️ محاولات تسجيل كثيرة، يرجى الانتظار ساعة' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limiter, strictLimiter, passwordResetLimiter, registerLimiter };