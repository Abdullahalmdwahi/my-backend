// ============================================
// 🛡️ حماية إضافية - تنظيف الإدخالات ورؤوس الأمان
// ============================================

// ✅ تنظيف الإدخالات من XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>"();$&]/g, '')
    .trim();
}

// ✅ Middleware لتنظيف جميع الإدخالات
function sanitizeBody(req, res, next) {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
      if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map(item => 
          typeof item === 'string' ? sanitizeInput(item) : item
        );
      }
      if (typeof req.body[key] === 'object' && req.body[key] !== null) {
        for (let subKey in req.body[key]) {
          if (typeof req.body[key][subKey] === 'string') {
            req.body[key][subKey] = sanitizeInput(req.body[key][subKey]);
          }
        }
      }
    }
  }
  next();
}

// ✅ رؤوس أمان إضافية
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

module.exports = { sanitizeInput, sanitizeBody, securityHeaders };