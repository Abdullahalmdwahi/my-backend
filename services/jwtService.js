// ============================================
// 🔐 JWT SERVICE - معدل ✅
// ============================================

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// ============================================
// JWT CONFIGURATION
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

// ============================================
// JWT SERVICE
// ============================================
const jwtService = {
  // ============================================
  // GENERATE ACCESS TOKEN
  // ============================================
  generateAccessToken: (user) => {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  },

  // ============================================
  // GENERATE REFRESH TOKEN
  // ============================================
  generateRefreshToken: (user) => {
    const payload = {
      id: user.id,
      email: user.email,
      type: 'refresh',
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  },

  // ============================================
  // VERIFY TOKEN
  // ============================================
  verifyToken: (token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw error;
    }
  },

  // ============================================
  // DECODE TOKEN (without verification)
  // ============================================
  decodeToken: (token) => {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  },

  // ============================================
  // GET TOKEN EXPIRY
  // ============================================
  getTokenExpiry: (token) => {
    try {
      const decoded = jwt.decode(token);
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  },

  // ============================================
  // IS TOKEN EXPIRED
  // ============================================
  isTokenExpired: (token) => {
    try {
      const decoded = jwt.decode(token);
      if (!decoded?.exp) return true;
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  },
};

module.exports = jwtService;