// ============================================
// 🔴 REDIS CONFIGURATION (اختياري)
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
// 📤 EXPORTS
// ============================================

module.exports = {
  connectRedis,
  getCache,
  setCache,
  deleteCache,
  clearCache,
  get isAvailable() { return isRedisAvailable; },
  get client() { return redisClient; },
};