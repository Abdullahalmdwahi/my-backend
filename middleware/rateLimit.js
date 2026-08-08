const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
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

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⚠️ محاولات تسجيل كثيرة، يرجى الانتظار ساعة',
  },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⚠️ عدد كبير من الإيميلات، يرجى الانتظار',
  },
  keyGenerator: (req) => {
    return req.body?.to || req.ip || 'unknown';
  },
});

module.exports = {
  limiter,
  strictLimiter,
  registerLimiter,
  emailLimiter,
};