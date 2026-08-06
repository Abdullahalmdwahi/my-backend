// ============================================
// 📝 LOGGER - نظام تسجيل متقدم
// ============================================

const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const errorLogStream = fs.createWriteStream(
  path.join(logDir, 'errors.log'),
  { flags: 'a' }
);

const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' }
);

// ============================================
// 🎯 MIDDLEWARE: تسجيل الطلبات
// ============================================

function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  req.requestId = requestId;
  
  console.log(`📝 [${requestId}] ${req.method} ${req.url} from ${getClientIp(req)}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: getClientIp(req),
    };
    
    accessLogStream.write(JSON.stringify(logEntry) + '\n');
    
    if (res.statusCode >= 400) {
      console.log(`❌ [${requestId}] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    } else {
      console.log(`✅ [${requestId}] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
}

// ============================================
// 🎯 MIDDLEWARE: تسجيل الأداء
// ============================================

function performanceLogger(req, res, next) {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2);
    
    if (duration > 1000) {
      console.log(`⏱️ [${req.requestId}] Slow request: ${duration}ms`);
    }
  });
  
  next();
}

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`.toUpperCase();
}

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
}

module.exports = {
  requestLogger,
  performanceLogger,
};