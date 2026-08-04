// ============================================
// 📦 APP - تكوين Express
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
// const morgan = require('morgan'); // تم إزالة morgan
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');
const { limiter } = require('./middleware/rateLimit');
const { securityHeaders } = require('./middleware/security');
const { sanitizeBody } = require('./middleware/security');
const apiRoutes = require('./routes/api');
const logger = require('./utils/logger');

const app = express();

// ============================================
// 🛡️ MIDDLEWARES
// ============================================

// Security Headers
app.use(helmet());
app.use(securityHeaders);

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Body Parsers
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// 📝 LOGGING - مخصص بدلاً من morgan
// ============================================

// تسجيل مخصص للطلبات (بديل عن morgan)
app.use((req, res, next) => {
  const start = Date.now();
  
  // تسجيل الطلب الوارد
  console.log(`📝 [${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip || req.connection?.remoteAddress}`);
  
  // تسجيل الرد عند الانتهاء
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
    console.log(`${statusEmoji} [${new Date().toISOString()}] ${req.method} ${req.url} - ${status} - ${duration}ms`);
  });
  
  next();
});

// Rate Limiting
app.use('/api', limiter);

// Sanitize Input
app.use(sanitizeBody);

// ============================================
// 📂 STATIC FILES
// ============================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// ============================================
// 🚏 ROUTES
// ============================================

app.use('/api', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '❌ المسار غير موجود',
  });
});

// Error Handler
app.use(errorHandler);

module.exports = app;