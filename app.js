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
// 🛡️ SECURITY MIDDLEWARES
// ============================================

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

app.use(securityHeaders);

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
}));

app.use(compression({
  level: 6,
  threshold: 1024,
}));

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

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' }),
  }));
} else {
  app.use(morgan('dev'));
}
app.use(requestLogger);
app.use(performanceLogger);

app.use(validateContentType);
app.use('/api', limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);
app.use(sanitizeBody);

// ============================================
// 📂 STATIC FILES
// ============================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
}));
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// ============================================
// 🌐 الصفحة الرئيسية
// ============================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 مرحباً بك في Sell In API',
    version: process.env.APP_VERSION || '2.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      docs: '/api/docs',
      health: '/health',
      api: '/api',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'POST /api/auth/verify',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout',
      },
      products: {
        list: 'GET /api/products',
        create: 'POST /api/products',
        search: 'GET /api/products/search',
        getById: 'GET /api/products/:id',
      },
      auctions: {
        list: 'GET /api/auctions',
        create: 'POST /api/auctions',
        placeBid: 'POST /api/auctions/:id/bid',
        getById: 'GET /api/auctions/:id',
      },
      orders: {
        list: 'GET /api/orders',
        create: 'POST /api/orders',
        getById: 'GET /api/orders/:id',
      },
      payments: {
        methods: 'GET /api/payments/methods',
        create: 'POST /api/payments',
      },
      wallets: {
        balance: 'GET /api/wallets/balance',
        transactions: 'GET /api/wallets/transactions',
      },
      tickets: {
        create: 'POST /api/tickets',
        messages: 'GET /api/tickets/:ticketId/messages',
      },
      admin: {
        stats: 'GET /api/admin/stats',
        users: 'GET /api/admin/users',
      },
      notifications: {
        list: 'GET /api/notifications',
        markRead: 'POST /api/notifications/:id/read',
      },
    },
    documentation: 'https://my-backend-hvha.onrender.com/api/health',
    support: '📧 support@sellin.com',
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: '📚 توثيق API - Sell In',
    version: '2.0.0',
    base_url: process.env.API_BASE_URL || 'https://my-backend-hvha.onrender.com',
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <your_token>',
      endpoints: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        refresh: 'POST /api/auth/refresh-token',
      }
    },
    modules: {
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      auctions: '/api/auctions',
      orders: '/api/orders',
      payments: '/api/payments',
      wallets: '/api/wallets',
      admin: '/api/admin',
      notifications: '/api/notifications',
      tickets: '/api/tickets',
    },
    health: '/health',
    stats: '/api/stats',
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

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
    available_endpoints: [
      '/',
      '/api/docs',
      '/health',
      '/api/status',
      '/api/stats',
      '/api/auth/*',
      '/api/products/*',
      '/api/auctions/*',
      '/api/orders/*',
      '/api/payments/*',
      '/api/wallets/*',
      '/api/admin/*',
      '/api/notifications/*',
      '/api/tickets/*',
    ]
  });
});

// ============================================
// 🔥 GLOBAL ERROR HANDLER
// ============================================

app.use(errorHandler);

// ============================================
// 🚀 START SERVER - بدون Socket.IO مؤقتاً
// ============================================

const PORT = process.env.PORT || 3000;

// إنشاء خادم HTTP بسيط بدون Socket.IO
const server = app.listen(PORT, () => {
  console.log('═'.repeat(50));
  console.log('🚀 Sell In API Server');
  console.log('═'.repeat(50));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not connected'}`);
  console.log(`📚 Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log('═'.repeat(50));
});

// ============================================
// 🛑 GRACEFUL SHUTDOWN - مع منع الإغلاق التلقائي
// ============================================

// إزالة معالج الإغلاق التلقائي
process.removeAllListeners('SIGTERM');
process.removeAllListeners('SIGINT');

// معالج إغلاق يدوي فقط
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('✅ Server is ready and will stay running');

module.exports = app;