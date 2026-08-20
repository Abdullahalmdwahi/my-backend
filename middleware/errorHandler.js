const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '🚫 المسار غير موجود',
    path: req.originalUrl,
  });
};

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const message = err.message || '❌ حدث خطأ في الخادم';

  res.status(status).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};