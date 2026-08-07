// ============================================
// 🔥 ERROR HANDLER
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

class UUIDError extends AppError {
  constructor(message = 'معرف غير صالح، يرجى استخدام UUID صحيح') {
    super(message, 400, 'INVALID_UUID');
  }
}

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString(),
  });

  // UUID Error
  if (err.message && err.message.includes('invalid input syntax for type uuid')) {
    return res.status(400).json({
      success: false,
      message: 'معرف غير صالح، يرجى استخدام UUID صحيح',
      code: 'INVALID_UUID',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  }

  // Supabase Error
  if (err.code && err.code.startsWith('PGRST')) {
    const statusCode = err.code === 'PGRST404' ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'خطأ في قاعدة البيانات',
      code: err.code,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '⚠️ توكن غير صالح',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '⏰ انتهت صلاحية التوكن',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString(),
    });
  }

  // Auth Error
  if (err.message && err.message.includes('Invalid login credentials')) {
    return res.status(401).json({
      success: false,
      message: '⚠️ البريد الإلكتروني أو كلمة المرور غير صحيحة',
      code: 'INVALID_CREDENTIALS',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.message && err.message.includes('Email not confirmed')) {
    return res.status(403).json({
      success: false,
      message: '⚠️ الحساب غير مفعل، يرجى التحقق من بريدك الإلكتروني',
      requiresVerification: true,
      code: 'ACCOUNT_NOT_VERIFIED',
      timestamp: new Date().toISOString(),
    });
  }

  // Device Error
  if (err.message && err.message.includes('جهاز جديد')) {
    return res.status(403).json({
      success: false,
      message: err.message,
      requiresDeviceVerification: true,
      code: 'NEW_DEVICE_DETECTED',
      timestamp: new Date().toISOString(),
    });
  }

  // Duplicate Error
  if (err.code === '23505' || (err.message && err.message.includes('already exists'))) {
    return res.status(409).json({
      success: false,
      message: '⚠️ هذا البريد الإلكتروني مسجل بالفعل',
      code: 'DUPLICATE_ENTRY',
      timestamp: new Date().toISOString(),
    });
  }

  // Default
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || '❌ حدث خطأ في الخادم',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.errors || err.details;
  }

  if (req.requestId) {
    response.requestId = req.requestId;
  }

  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '❌ المسار غير موجود',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  ConflictError,
  UUIDError,
};