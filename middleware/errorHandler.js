// ============================================
// 🔥 ERROR HANDLER - معالجة الأخطاء المتقدمة
// ============================================

// ============================================
// 🎯 CLASSES CUSTOM ERRORS
// ============================================

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthError extends AppError {
  constructor(message) {
    super(message, 401, 'AUTH_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'المورد') {
    super(`⚠️ ${resource} غير موجود`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

// ============================================
// 🎯 ERROR HANDLER MIDDLEWARE
// ============================================

const errorHandler = (err, req, res, next) => {
  console.error(`❌ [${req.requestId || 'unknown'}] Error:`, err.message);

  let statusCode = err.statusCode || 500;
  let message = err.message || '❌ حدث خطأ غير متوقع';
  let code = err.code || 'INTERNAL_ERROR';
  
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '⚠️ توكن غير صالح';
    code = 'INVALID_TOKEN';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '⏰ انتهت صلاحية التوكن';
    code = 'TOKEN_EXPIRED';
  }
  
  if (err.code && err.code.startsWith('PGRST')) {
    statusCode = 400;
    message = '⚠️ خطأ في قاعدة البيانات';
    code = err.code;
  }
  
  if (err.message && err.message.includes('Invalid login credentials')) {
    statusCode = 401;
    message = '⚠️ البريد الإلكتروني أو كلمة المرور غير صحيحة';
    code = 'INVALID_CREDENTIALS';
  }

  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };
  
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
    response.details = err.errors || err.details;
  }
  
  if (req.requestId) {
    response.requestId = req.requestId;
  }
  
  res.status(statusCode).json(response);
};

// ============================================
// 🎯 ASYNC WRAPPER
// ============================================

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  ConflictError,
};