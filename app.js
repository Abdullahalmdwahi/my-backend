const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { limiter, strictLimiter, registerLimiter, emailLimiter } = require('./middleware/rateLimit');
const { securityHeaders, sanitizeBody, validateContentType } = require('./middleware/security');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

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

app.use(compression({ level: 6, threshold: 1024 }));

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

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' }),
  }));
} else {
  app.use(morgan('dev'));
}

app.use(validateContentType);
app.use('/api', limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/email/send', emailLimiter);
app.use(sanitizeBody);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));
app.use('/temp', express.static(path.join(__dirname, 'temp')));

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

app.use('/api', apiRoutes);

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

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    server.listen(PORT, () => {
      console.log('═'.repeat(50));
      console.log('🚀 Sell In API Server');
      console.log('═'.repeat(50));
      console.log(`📡 Port: ${PORT}`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📧 Email: ${process.env.BREVO_FROM_EMAIL}`);
      console.log(`🗄️ Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not connected'}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log('═'.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

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

startServer();

module.exports = { app, server };