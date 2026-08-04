// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

const crypto = require('crypto');
const bcrypt = require('bcrypt');

// ============================================
// 📅 DATE HELPERS
// ============================================

function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  const d = new Date(date);
  
  const map = {
    'YYYY': d.getFullYear(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0'),
    'SSS': String(d.getMilliseconds()).padStart(3, '0'),
  };
  
  let result = format;
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(key, value);
  }
  return result;
}

function timeAgo(date) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function isExpired(date) {
  return new Date(date) < new Date();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

// ============================================
// 🔐 SECURITY HELPERS
// ============================================

function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

function generateUUID() {
  return crypto.randomUUID();
}

function generateToken(prefix = '') {
  const token = generateRandomString(24);
  return prefix ? `${prefix}_${token}` : token;
}

function generateReferralCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================
// 🔑 PASSWORD HELPERS
// ============================================

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ============================================
// 📱 PHONE HELPERS
// ============================================

function formatPhoneNumber(phone, countryCode = '+966') {
  const cleaned = phone.replace(/\D/g, '');
  const code = countryCode.replace('+', '');
  
  if (cleaned.startsWith(code)) {
    return `+${cleaned}`;
  }
  
  return `+${code}${cleaned}`;
}

function validatePhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
}

// ============================================
// 📧 EMAIL HELPERS
// ============================================

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return `${local.slice(0, 2)}${'*'.repeat(local.length - 2)}@${domain}`;
}

// ============================================
// 💰 PRICE HELPERS
// ============================================

function formatPrice(price, currency = 'YER') {
  const symbols = {
    'USD': '$',
    'SAR': 'ر.س',
    'YER': 'YER',
    'AED': 'د.إ',
    'KWD': 'د.ك',
    'QAR': 'ر.ق',
    'BHD': 'د.ب',
    'OMR': 'ر.ع',
    'JOD': 'د.ا',
    'IQD': 'د.ع',
  };
  
  const symbol = symbols[currency] || currency;
  const formatted = Number(price).toFixed(2);
  
  if (currency === 'YER') {
    return `${formatted} ${symbol}`;
  }
  return `${symbol} ${formatted}`;
}

function sanitizePrice(price) {
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

// ============================================
// 🔢 NUMBER HELPERS
// ============================================

function toInt(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toFloat(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

// ============================================
// 📦 OBJECT HELPERS
// ============================================

function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (obj && key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isEmpty(obj) {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return !obj;
}

// ============================================
//🔄 ARRAY HELPERS
// ============================================

function unique(arr) {
  return [...new Set(arr)];
}

function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const value = item[key];
    if (!groups[value]) {
      groups[value] = [];
    }
    groups[value].push(item);
    return groups;
  }, {});
}

// ============================================
// 📝 STRING HELPERS
// ============================================

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function capitalizeEach(str) {
  if (!str) return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
}

function truncate(str, maxLength = 100, suffix = '...') {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

function sanitizeInput(input) {
  if (!input) return '';
  const str = String(input);
  
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>"();&$]/g, '') // Remove dangerous characters
    .trim();
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// ============================================
// 🗂️ FILE HELPERS
// ============================================

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getFileNameWithoutExtension(filename) {
  return filename.split('.').slice(0, -1).join('.');
}

function getMimeType(extension) {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'json': 'application/json',
    'txt': 'text/plain',
    'csv': 'text/csv',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

// ============================================
//🌐 URL HELPERS
// ============================================

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

// ============================================
// 🧹 CLEANUP HELPERS
// ============================================

function cleanObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

function cleanArray(arr) {
  return arr.filter(item => item !== undefined && item !== null && item !== '');
}

// ============================================
// 📦 EXPORTS
// ============================================

module.exports = {
  // Date
  formatDate,
  timeAgo,
  isExpired,
  addDays,
  addHours,
  
  // Security
  generateRandomString,
  generateOTP,
  generateUUID,
  generateToken,
  generateReferralCode,
  
  // Password
  hashPassword,
  comparePassword,
  
  // Phone
  formatPhoneNumber,
  validatePhoneNumber,
  
  // Email
  validateEmail,
  maskEmail,
  
  // Price
  formatPrice,
  sanitizePrice,
  
  // Number
  toInt,
  toFloat,
  clamp,
  isNumber,
  
  // Object
  pick,
  omit,
  deepClone,
  isEmpty,
  
  // Array
  unique,
  chunk,
  groupBy,
  
  // String
  capitalize,
  capitalizeEach,
  truncate,
  sanitizeInput,
  slugify,
  
  // File
  getFileExtension,
  getFileNameWithoutExtension,
  getMimeType,
  formatFileSize,
  
  // URL
  isValidUrl,
  extractDomain,
  
  // Cleanup
  cleanObject,
  cleanArray,
};