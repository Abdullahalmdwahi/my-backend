// ============================================
// 🗄️ DATABASE - مع Caching متقدم
// ============================================

const NodeCache = require('node-cache');
const { getSupabaseClient, toSafeId } = require('./supabase');

// Cache configuration
const cache = new NodeCache({
  stdTTL: 300, // 5 دقائق
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

  // ✅ استعلام مع Caching
  async queryWithCache(table, query, ttl = 300) {
    const cacheKey = `${table}:${JSON.stringify(query)}`;
    
    // ✅ التحقق من الكاش
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    // ✅ تنفيذ الاستعلام
    const result = await this.supabase
      .from(table)
      .select(query.select || '*')
      .match(query.filters || {})
      .order(query.orderBy || 'created_at', { ascending: false })
      .limit(query.limit || 20);

    if (result.error) throw result.error;

    // ✅ حفظ في الكاش
    this.cache.set(cacheKey, result.data, ttl);
    
    return result.data;
  }

  // ✅ تحديث الكاش عند التعديل
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

  // ✅ تحويل آمن للمعرف
  toSafeId(id) {
    return toSafeId(id);
  }

  // ✅ توليد UUID
  generateUUID() {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  // ✅ توليد معرف قصير
  generateShortId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  // ✅ التحقق من صحة المعرف
  isValidId(id) {
    if (!id) return false;
    if (typeof id === 'number') return id > 0;
    if (typeof id === 'string') {
      const parsed = parseInt(id);
      return !isNaN(parsed) && parsed > 0;
    }
    return false;
  }
}

// ============================================
// 📤 EXPORTS
// ============================================

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