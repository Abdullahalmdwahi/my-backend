// ============================================
// 🛡️ SECURITY MIDDLEWARE - نظام أمان متكامل
// ============================================

const xss = require('xss');

// ============================================
// ✅ تنظيف الإدخالات
// ============================================

function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') return input;
  
  const {
    stripTags = true,
    stripScripts = true,
    stripUrls = true,
    maxLength = 5000,
  } = options;

  let result = input;
  
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }
  
  if (stripTags) {
    result = result.replace(/<[^>]*>/g, '');
  }
  
  if (stripScripts) {
    result = result
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/alert\s*\(/gi, '')
      .replace(/confirm\s*\(/gi, '')
      .replace(/prompt\s*\(/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/setTimeout\s*\(/gi, '')
      .replace(/setInterval\s*\(/gi, '');
  }
  
  if (stripUrls) {
    result = result
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/file:/gi, '');
  }
  
  result = result
    .replace(/[<>"();$&`|]/g, '')
    .replace(/\\/g, '')
    .replace(/\//g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '');
  
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

// ============================================
// ✅ Middleware: تنظيف الجسم
// ============================================

function sanitizeBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  const sensitiveFields = [
    'password', 'currentPassword', 'newPassword', 
    'token', 'code', 'otp', 'secret'
  ];

  const fieldsToSanitize = ['name', 'email', 'phone', 'address', 'description', 'title', 'subject'];

  const sanitizeRecursive = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      
      if (sensitiveFields.includes(key)) continue;
      
      const value = obj[key];
      
      if (typeof value === 'string' && fieldsToSanitize.includes(key)) {
        obj[key] = sanitizeInput(value, { maxLength: 500 });
      }
      
      if (typeof value === 'string' && key === 'description') {
        obj[key] = sanitizeInput(value, { maxLength: 2000 });
      }
      
      if (typeof value === 'string' && key === 'email') {
        obj[key] = value.toLowerCase().trim();
      }
      
      if (Array.isArray(value)) {
        obj[key] = value.map(item => {
          if (typeof item === 'string') {
            return sanitizeInput(item, { maxLength: 100 });
          }
          if (typeof item === 'object' && item !== null) {
            return sanitizeRecursive(item);
          }
          return item;
        });
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        obj[key] = sanitizeRecursive(value);
      }
    }
    
    return obj;
  };

  req.body = sanitizeRecursive(req.body);
  next();
}

// ============================================
// ✅ Middleware: التحقق من Content-Type
// ============================================

function validateContentType(req, res, next) {
  const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!methods.includes(req.method)) {
    return next();
  }

  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({
      success: false,
      message: '⚠️ Content-Type يجب أن يكون application/json',
      expected: 'application/json',
      received: contentType,
    });
  }

  next();
}

// ============================================
// ✅ Middleware: رؤوس الأمان
// ============================================

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-RateLimit-Limit, X-RateLimit-Remaining');
  
  next();
}

// ============================================
// ✅ XSS Protection
// ============================================

function xssProtection(req, res, next) {
  if (!req.body || typeof req.body !== 'object') return next();
  
  const sensitive = ['password', 'currentPassword', 'newPassword', 'token', 'code'];
  
  for (let key in req.body) {
    if (sensitive.includes(key)) continue;
    if (typeof req.body[key] === 'string') {
      req.body[key] = xss(req.body[key], {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style', 'noscript'],
      });
    }
  }
  
  next();
}

module.exports = {
  sanitizeInput,
  sanitizeBody,
  validateContentType,
  securityHeaders,
  xssProtection,
};