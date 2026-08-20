// 📁 config/database.js - إضافة نظام Caching متقدم
const NodeCache = require('node-cache');
const cache = new NodeCache({
  stdTTL: 300, // 5 دقائق
  checkperiod: 60,
  useClones: false
});

class Database {
  constructor() {
    this.supabase = null;
    this.cache = cache;
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
}