// ============================================
// 📝 LOGGER
// ============================================

const fs = require('fs');
const path = require('path');
const { formatDate } = require('./helpers');

// ============================================
// 📂 LOG DIRECTORY
// ============================================

const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ============================================
// 🎨 COLORS (for console)
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// ============================================
// 📝 LOG LEVELS
// ============================================

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

const currentLevel = process.env.LOG_LEVEL || 'info';
const levelValue = LOG_LEVELS[currentLevel.toLowerCase()] ?? LOG_LEVELS.info;

// ============================================
// 🖨️ CONSOLE LOGGING
// ============================================

function getColor(level) {
  switch (level) {
    case 'error': return colors.red;
    case 'warn': return colors.yellow;
    case 'info': return colors.green;
    case 'debug': return colors.blue;
    case 'trace': return colors.gray;
    default: return colors.white;
  }
}

function getEmoji(level) {
  switch (level) {
    case 'error': return '❌';
    case 'warn': return '⚠️';
    case 'info': return '✅';
    case 'debug': return '🔍';
    case 'trace': return '📝';
    default: return '📌';
  }
}

function logToConsole(level, message, meta = {}) {
  const color = getColor(level);
  const emoji = getEmoji(level);
  const timestamp = formatDate(new Date());
  
  let output = `${color}[${timestamp}]${colors.reset} ${emoji} ${message}`;
  
  if (Object.keys(meta).length > 0) {
    output += ` ${colors.gray}${JSON.stringify(meta)}${colors.reset}`;
  }
  
  console.log(output);
}

// ============================================
// 💾 FILE LOGGING
// ============================================

function logToFile(level, message, meta = {}) {
  try {
    const date = formatDate(new Date(), 'YYYY-MM-DD');
    const timestamp = formatDate(new Date());
    const logFile = path.join(LOG_DIR, `${date}.log`);
    
    let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (Object.keys(meta).length > 0) {
      logEntry += ` ${JSON.stringify(meta)}`;
    }
    logEntry += '\n';
    
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('❌ Failed to write log file:', error.message);
  }
}

// ============================================
// 📦 MAIN LOGGER FUNCTIONS
// ============================================

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > levelValue) return;
  
  // Console
  logToConsole(level, message, meta);
  
  // File
  logToFile(level, message, meta);
}

function error(message, meta = {}) {
  log('error', message, meta);
}

function warn(message, meta = {}) {
  log('warn', message, meta);
}

function info(message, meta = {}) {
  log('info', message, meta);
}

function debug(message, meta = {}) {
  log('debug', message, meta);
}

function trace(message, meta = {}) {
  log('trace', message, meta);
}

// ============================================
// 🚨 ERROR LOGGING WITH STACK
// ============================================

function logError(error, context = {}) {
  const meta = {
    ...context,
    stack: error.stack,
    message: error.message,
    name: error.name,
  };
  
  error('An error occurred:', meta);
  
  // Also log to error file specifically
  try {
    const errorFile = path.join(LOG_DIR, 'errors.log');
    const timestamp = formatDate(new Date());
    const entry = `[${timestamp}] ERROR: ${error.message}\nStack: ${error.stack}\nContext: ${JSON.stringify(context)}\n---\n`;
    fs.appendFileSync(errorFile, entry, 'utf8');
  } catch (e) {
    console.error('❌ Failed to write error log:', e.message);
  }
}

// ============================================
// 🧹 LOG ROTATION (keep last 7 days)
// ============================================

function cleanOldLogs(days = 7) {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const maxAge = days * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old log: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to clean logs:', error.message);
  }
}

// ============================================
// 🚀 REQUEST LOGGING (for middleware)
// ============================================

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url, ip } = req;
  
  // Log request
  info(`${method} ${url}`, { ip });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    log(level, `${method} ${url} ${statusCode} - ${duration}ms`, {
      ip,
      duration,
      statusCode,
    });
  });
  
  next();
}

// ============================================
// 📊 GET LOGS
// ============================================

function getLogs(date = null, level = null, limit = 100) {
  try {
    const dateStr = date || formatDate(new Date(), 'YYYY-MM-DD');
    const logFile = path.join(LOG_DIR, `${dateStr}.log`);
    
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Parse logs
    const logs = lines.map(line => {
      const match = line.match(/\[(.*?)\] \[(.*?)\] (.*)/);
      if (match) {
        return {
          timestamp: match[1],
          level: match[2].toLowerCase(),
          message: match[3],
        };
      }
      return { timestamp: '', level: 'unknown', message: line };
    });
    
    // Filter by level
    let filtered = logs;
    if (level) {
      filtered = filtered.filter(log => log.level === level.toLowerCase());
    }
    
    // Limit
    return filtered.slice(-limit);
  } catch (error) {
    console.error('❌ Failed to get logs:', error.message);
    return [];
  }
}

// ============================================
// 📦 EXPORTS
// ============================================

module.exports = {
  log,
  error,
  warn,
  info,
  debug,
  trace,
  logError,
  cleanOldLogs,
  requestLogger,
  getLogs,
  colors,
  LOG_LEVELS,
};