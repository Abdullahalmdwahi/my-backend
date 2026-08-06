// app.js - في نهاية الملف

// ============================================
// ❌ 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '❌ المسار غير موجود',
    path: req.originalUrl,
    method: req.method,
  });
});

// ============================================
// 🔥 GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '❌ حدث خطأ في الخادم',
    timestamp: new Date().toISOString(),
  });
});