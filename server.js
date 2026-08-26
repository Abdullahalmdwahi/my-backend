// ============================================
// 🚀 SERVER - النسخة النهائية مع trust proxy
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import modules
const { getSupabaseClient } = require('./config/supabase');
const apiRoutes = require('./routes/api');
const ticketRoutes = require('./routes/tickets');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { limiter, strictLimiter, registerLimiter, emailLimiter } = require('./middleware/rateLimit');
const { securityHeaders, sanitizeBody, validateContentType } = require('./middleware/security');
const { scheduleAuctionEnd } = require('./cron/endAuctions');
const { scheduleCleanup } = require('./cron/cleanup');
const { initSocket } = require('./socket/auctionSocket');

// Create Express app
const app = express();

// ✅ ✅ ✅ إضافة trust proxy لـ Render (لإصلاح تحذير express-rate-limit)
app.set('trust proxy', 1);

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ============================================
// 📁 LOGS DIRECTORY
// ============================================

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ============================================
// 🛡️ MIDDLEWARE - محسّن
// ============================================

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(securityHeaders);

// CORS - محسّن
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
}));

// Compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Body Parsers
app.use(express.json({ 
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

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging - محسّن
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' }),
    skip: (req, res) => res.statusCode < 400,
  }));
} else {
  app.use(morgan('dev'));
}

// Request Logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ============================================
// 🛡️ SECURITY & RATE LIMITING
// ============================================

app.use(validateContentType);
app.use('/api', limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/email/send', emailLimiter);
app.use(sanitizeBody);

// ============================================
// 📁 STATIC FILES
// ============================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// ============================================
// 🏠 ROUTES
// ============================================

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 مرحباً بك في Sell In API',
    version: process.env.APP_VERSION || '2.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'POST /api/auth/verify',
        verifyDevice: 'POST /api/auth/verify-device',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
      },
      email: {
        send: 'POST /api/email/send',
      },
    },
  });
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api', ticketRoutes);

// ============================================
// 🏥 HEALTH CHECK - محسّن
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
    nodeVersion: process.version,
  });
});

// ============================================
// ❌ ERROR HANDLERS
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// 🔌 SOCKET.IO
// ============================================

const io = initSocket(server);

// ============================================
// ⏰ CRON JOBS
// ============================================

scheduleAuctionEnd();
scheduleCleanup();

// ============================================
// 🚀 START SERVER
// ============================================

async function startServer() {
  try {
    // Initialize Supabase
    getSupabaseClient();
    console.log('✅ Supabase initialized');

    // Start server
    server.listen(PORT, () => {
      console.log('═'.repeat(50));
      console.log('🚀 Sell In API Server');
      console.log('═'.repeat(50));
      console.log(`📡 Port: ${PORT}`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📧 Email: ${process.env.BREVO_FROM_EMAIL || 'Not set'}`);
      console.log(`🗄️ Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not connected'}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
      console.log(`🔄 Version: ${process.env.APP_VERSION || '1.0.0'}`);
      console.log(`📦 Node: ${process.version}`);
      console.log('═'.repeat(50));
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// ============================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// ============================================
// 🚀 START
// ============================================

startServer();

module.exports = { app, server, io };