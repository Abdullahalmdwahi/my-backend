// ✅ تعطيل Rate Limit للبريد مؤقتاً للاختبار
const emailLimiter = rateLimit({
  windowMs: 60 * 1000, // دقيقة واحدة
  max: 100, // 100 طلب في الدقيقة (كافٍ للاختبار)
  message: {
    success: false,
    message: '⚠️ عدد الإيميلات تجاوز الحد المسموح، حاول بعد دقيقة',
    retryAfter: 60,
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.body?.to || req.ip || 'global';
  },
});