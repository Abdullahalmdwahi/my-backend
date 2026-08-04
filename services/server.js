// ============================================
// 🚀 SERVER - معدل ✅
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');

// Load environment variables
dotenv.config();

// Import modules
const { getDatabase } = require('./config/database');
const { getSupabaseClient } = require('./config/supabase');
const apiRoutes = require('./routes/api');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { limiter } = require('./middleware/rateLimit');
const { securityHeaders, sanitizeBody } = require('./middleware/security');
const { scheduleAuctionEnd } = require('./cron/endAuctions');
const { scheduleCleanup } = require('./cron/cleanup');
const { initSocket } = require('./socket/auctionSocket');

// ============================================
// CREATE EXPRESS APP
// ============================================
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting
app.use('/api', limiter);

// Sanitize Input
app.use(sanitizeBody);

// Request Logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// API Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

// ============================================
// SOCKET.IO
// ============================================

const io = initSocket(server);

// ============================================
// CRON JOBS
// ============================================

// Schedule auction end check (every 5 minutes)
scheduleAuctionEnd();

// Schedule cleanup (daily at midnight)
scheduleCleanup();

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Connect to database
    await getDatabase().connect();
    console.log('✅ Database connected');

    // Initialize Supabase
    getSupabaseClient();
    console.log('✅ Supabase initialized');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);
      console.log(`✅ All services initialized successfully`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
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
// START
// ============================================

startServer();

// ============================================
// EXPORTS FOR TESTING
// ============================================

module.exports = { app, server, io };