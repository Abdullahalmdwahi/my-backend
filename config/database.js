// ============================================
// 🗄️ DATABASE CONFIGURATION
// ============================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class Database {
  constructor() {
    this.supabase = null;
    this.supabaseAdmin = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('⚠️ SUPABASE_URL and SUPABASE_ANON_KEY are required');
      }

      // Client عادي
      this.supabase = createClient(supabaseUrl, supabaseKey);

      // Client Admin (Service Role)
      if (supabaseServiceKey) {
        this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      } else {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found, using anon key for admin operations');
        this.supabaseAdmin = this.supabase;
      }

      // اختبار الاتصال
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      this.isConnected = true;
      console.log('✅ Database connected successfully');
      console.log(`📊 Supabase URL: ${supabaseUrl}`);

      return this;
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.supabase;
  }

  getAdminClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.supabaseAdmin;
  }

  // ============================================
  // 🛠️ HELPER METHODS
  // ============================================

  async findOne(table, filters = {}) {
    try {
      let query = this.supabase.from(table).select('*');
      
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`❌ findOne error in ${table}:`, error.message);
      return null;
    }
  }

  async findMany(table, filters = {}, options = {}) {
    try {
      let query = this.supabase.from(table).select(options.select || '*');
      
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.ascending !== false 
        });
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`❌ findMany error in ${table}:`, error.message);
      return [];
    }
  }

  async insert(table, data) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select();
      
      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`❌ insert error in ${table}:`, error.message);
      throw error;
    }
  }

  async update(table, id, data, idField = 'id') {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .update(data)
        .eq(idField, id)
        .select();
      
      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`❌ update error in ${table}:`, error.message);
      throw error;
    }
  }

  async delete(table, id, idField = 'id') {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .delete()
        .eq(idField, id)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`❌ delete error in ${table}:`, error.message);
      throw error;
    }
  }

  async upsert(table, data, conflictField = 'id') {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .upsert(data, { onConflict: conflictField })
        .select();
      
      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`❌ upsert error in ${table}:`, error.message);
      throw error;
    }
  }

  // ============================================
  // 🔢 ID Helpers
  // ============================================

  toIntId(id) {
    if (!id) return 0;
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      const parsed = parseInt(id);
      return isNaN(parsed) ? id.hashCode() : parsed;
    }
    return id.hashCode();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  generateIntId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
}

// Singleton
let instance = null;

function getDatabase() {
  if (!instance) {
    instance = new Database();
  }
  return instance;
}

module.exports = { Database, getDatabase };