// ============================================
// 🗄️ DATABASE - مع Caching متقدم
// ✅ النسخة النهائية مع UUID
// ============================================

const NodeCache = require('node-cache');
const { getSupabaseClient, toSafeId, isValidUUID } = require('./supabase');

const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

class Database {
  constructor() {
    this.supabase = null;
    this.cache = cache;
  }

  connect() {
    this.supabase = getSupabaseClient();
    return this;
  }

  async queryWithCache(table, query, ttl = 300) {
    const cacheKey = `${table}:${JSON.stringify(query)}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    const result = await this.supabase
      .from(table)
      .select(query.select || '*')
      .match(query.filters || {})
      .order(query.orderBy || 'created_at', { ascending: false })
      .limit(query.limit || 20);

    if (result.error) throw result.error;

    this.cache.set(cacheKey, result.data, ttl);

    return result.data;
  }

  async invalidateCache(table, id = null) {
    const keys = this.cache.keys();
    const pattern = id ? `${table}:*${id}*` : `${table}:*`;

    for (const key of keys) {
      if (key.match(pattern)) {
        this.cache.del(key);
        console.log(`🗑️ Cache invalidated: ${key}`);
      }
    }
  }

  toSafeId(id) {
    return toSafeId(id);
  }

  generateUUID() {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  generateShortId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  isValidId(id) {
    if (!id) return false;
    if (typeof id === 'number') return id > 0;
    if (typeof id === 'string') {
      if (id.length === 0) return false;
      return isValidUUID(id) || (!isNaN(parseInt(id)) && parseInt(id) > 0);
    }
    return false;
  }
}

let instance = null;

function getDatabase() {
  if (!instance) {
    instance = new Database();
  }
  return instance;
}

module.exports = {
  getDatabase,
  Database,
};