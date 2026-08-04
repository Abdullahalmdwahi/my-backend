// ============================================
// 🔴 REDIS CONFIGURATION (Optional)
// ============================================

const redis = require('redis');
require('dotenv').config();

let redisClient = null;
let isRedisAvailable = false;

// ============================================
// 🔌 CONNECT TO REDIS
// ============================================

async function connectRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = redis.createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log('⚠️ Redis: Max retries reached, disabling cache');
            isRedisAvailable = false;
            return new Error('Max retries reached');
          }
          return Math.min(retries * 100, 3000);
        },
        timeout: 5000,
      },
    });
    
    redisClient.on('error', (error) => {
      console.warn('⚠️ Redis error:', error.message);
      isRedisAvailable = false;
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      isRedisAvailable = true;
    });
    
    redisClient.on('ready', () => {
      console.log('✅ Redis ready');
      isRedisAvailable = true;
    });
    
    redisClient.on('end', () => {
      console.log('⚠️ Redis connection ended');
      isRedisAvailable = false;
    });
    
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    console.warn('⚠️ Redis connection failed:', error.message);
    isRedisAvailable = false;
    return null;
  }
}

// ============================================
// 📦 CACHE HELPERS
// ============================================

async function getCache(key) {
  if (!isRedisAvailable || !redisClient) return null;
  
  try {
    const value = await redisClient.get(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Redis get error:', error.message);
    return null;
  }
}

async function setCache(key, value, expirySeconds = 300) {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, expirySeconds, serialized);
    return true;
  } catch (error) {
    console.warn('⚠️ Redis set error:', error.message);
    return false;
  }
}

async function deleteCache(key) {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.warn('⚠️ Redis delete error:', error.message);
    return false;
  }
}

async function clearCache(pattern = '*') {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.warn('⚠️ Redis clear error:', error.message);
    return false;
  }
}

// ============================================
// 🔐 SESSION HELPERS
// ============================================

async function setSession(userId, sessionData, expirySeconds = 86400) {
  return setCache(`session:${userId}`, sessionData, expirySeconds);
}

async function getSession(userId) {
  return getCache(`session:${userId}`);
}

async function deleteSession(userId) {
  return deleteCache(`session:${userId}`);
}

async function setToken(token, userId, expirySeconds = 3600) {
  return setCache(`token:${token}`, { userId }, expirySeconds);
}

async function verifyToken(token) {
  const data = await getCache(`token:${token}`);
  return data ? data.userId : null;
}

// ============================================
// 📊 RATE LIMITING HELPERS
// ============================================

async function incrementRateLimit(key, windowSeconds = 60, maxRequests = 100) {
  if (!isRedisAvailable || !redisClient) {
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  try {
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }
    
    const allowed = current <= maxRequests;
    return {
      allowed,
      remaining: Math.max(0, maxRequests - current),
      reset: await redisClient.ttl(key),
    };
  } catch (error) {
    console.warn('⚠️ Rate limit error:', error.message);
    return { allowed: true, remaining: maxRequests - 1 };
  }
}

// ============================================
// 📦 EXPORTS
// ============================================

module.exports = {
  connectRedis,
  getCache,
  setCache,
  deleteCache,
  clearCache,
  setSession,
  getSession,
  deleteSession,
  setToken,
  verifyToken,
  incrementRateLimit,
  get isAvailable() { return isRedisAvailable; },
  get client() { return redisClient; },
};