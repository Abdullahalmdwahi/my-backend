// ============================================
// 📦 APP - تكوين Express مع نظام أمان متكامل
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { limiter, strictLimiter } = require('./middleware/rateLimit');
const { securityHeaders, sanitizeBody, validateContentType } = require('./middleware/security');
const { requestLogger, performanceLogger } = require('./middleware/logger');
const apiRoutes = require('./routes/api');

const app = express();

// ============================================
// 📁 LOGS DIRECTORY
// ============================================

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ============================================
// 🛡️ SECURITY MIDDLEWARES (الترتيب مهم)
// ============================================

// 1. Helmet - حماية الرؤوس
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// 2. Security Headers المخصصة
app.use(securityHeaders);

// 3. CORS - محسّن
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
}));

// 4. Compression
app.use(compression({
  level: 6,
  threshold: 1024,
}));

// 5. Body Parsers
app.use(bodyParser.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: '⚠️ بيانات JSON غير صالحة',
      });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 6. Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' }),
  }));
} else {
  app.use(morgan('dev'));
}
app.use(requestLogger);
app.use(performanceLogger);

// 7. التحقق من Content-Type
app.use(validateContentType);

// 8. Rate Limiting
app.use('/api', limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);

// 9. تنظيف المدخلات
app.use(sanitizeBody);

// 10. معالجة الاستثناءات
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

// ============================================
// 📂 STATIC FILES
// ============================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
}));
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// ============================================
// 🚏 ROUTES
// ============================================

app.use('/api', apiRoutes);

// ============================================
// 🏥 HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  });
});

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

app.use(errorHandler);

// ============================================
// 🚀 START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('═'.repeat(50));
  console.log('🚀 Sell In API Server');
  console.log('═'.repeat(50));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not connected'}`);
  console.log('═'.repeat(50));
});

// ============================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================

const shutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('⚠️ Force shutdown after 10s');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;