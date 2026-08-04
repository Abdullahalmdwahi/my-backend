

const { logError } = require('../utils/logger');


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
  constructor(message = '❌ غير مصرح', statusCode = 401) {
    super(message, statusCode, 'AUTH_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'المورد') {
    super(`❌ ${resource} غير موجود`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = '⚠️ تعارض في البيانات') {
    super(message, 409, 'CONFLICT');
  }
}

class PaymentError extends AppError {
  constructor(message = '❌ فشل الدفع') {
    super(message, 402, 'PAYMENT_ERROR');
  }
}



function errorHandler(err, req, res, next) {
  // Log error
  logError(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body,
  });
  
  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || '❌ حدث خطأ غير متوقع';
  let code = err.code || 'INTERNAL_ERROR';
  let errors = err.errors || null;
  
  // Handle specific errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    errors = err.errors;
  }
  
  // Handle Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    statusCode = 400;
    message = '⚠️ خطأ في قاعدة البيانات';
    code = 'DATABASE_ERROR';
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '⚠️ رمز غير صالح';
    code = 'INVALID_TOKEN';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '⚠️ انتهت صلاحية الرمز';
    code = 'TOKEN_EXPIRED';
  }
  
  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = `⚠️ خطأ في رفع الملف: ${err.message}`;
    code = 'UPLOAD_ERROR';
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '⚠️ بيانات غير صحيحة';
    code = 'VALIDATION_ERROR';
    errors = err.errors || err.details;
  }
  
  // Handle duplicate key errors (PostgreSQL)
  if (err.code === '23505') {
    statusCode = 409;
    message = '⚠️ هذه البيانات موجودة مسبقاً';
    code = 'DUPLICATE_ENTRY';
  }
  
  // Send response
  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path,
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
}



function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: '❌ المسار غير موجود',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}


module.exports = {
  errorHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  ConflictError,
  PaymentError,
};