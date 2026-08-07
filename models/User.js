// ============================================
// 👤 USER MODEL - النسخة المُصلحة
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');
const { getDatabase } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/helpers');

class UserModel {
  static get table() { return TABLES.users; }
  
  // ============================================
  // 🔍 FIND METHODS - المُصلحة
  // ============================================
  
  static async findById(id) {
    if (!id) return null;
    
    const client = getSupabaseClient();
    const db = getDatabase();
    const safeId = db.toSafeId(id);
    
    try {
      const { data, error } = await client
        .from(this.table)
        .select('*')
        .eq('id', safeId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ findById error:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ findById exception:', error.message);
      return null;
    }
  }
  
  static async findByEmail(email) {
    if (!email) return null;
    
    const client = getSupabaseClient();
    try {
      const { data, error } = await client
        .from(this.table)
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ findByEmail error:', error.message);
      return null;
    }
  }
  
  static async findByPhone(phone) {
    if (!phone) return null;
    
    const client = getSupabaseClient();
    try {
      const { data, error } = await client
        .from(this.table)
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ findByPhone error:', error.message);
      return null;
    }
  }
  
  static async findByIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
    
    const client = getSupabaseClient();
    const db = getDatabase();
    const safeIds = ids.map(id => db.toSafeId(id));
    
    try {
      const { data, error } = await client
        .from(this.table)
        .select('*')
        .in('id', safeIds);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ findByIds error:', error.message);
      return [];
    }
  }
  
  static async findAll(options = {}) {
    const client = getSupabaseClient();
    try {
      let query = client.from(this.table).select('*');
      
      if (options.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }
      
      if (options.role) {
        query = query.eq('role', options.role);
      }
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending || false });
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
      console.error('❌ findAll error:', error.message);
      return [];
    }
  }
  
  // ============================================
  // ✏️ CREATE / UPDATE / DELETE
  // ============================================
  
  static async create(userData) {
    const client = getSupabaseClient();
    const db = getDatabase();
    
    try {
      // ✅ تأكد من وجود id صالح
      if (!userData.id) {
        userData.id = db.generateUUID();
      }
      
      // ✅ Hash password if provided
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const { data, error } = await client
        .from(this.table)
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ create error:', error.message);
      throw error;
    }
  }
  
  static async update(id, userData) {
    const client = getSupabaseClient();
    const db = getDatabase();
    const safeId = db.toSafeId(id);
    
    try {
      // ✅ Hash password if provided
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      // ✅ إزالة الحقول غير القابلة للتحديث
      delete userData.id;
      delete userData.created_at;
      
      const { data, error } = await client
        .from(this.table)
        .update({
          ...userData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', safeId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ update error:', error.message);
      throw error;
    }
  }
  
  static async delete(id) {
    const client = getSupabaseClient();
    const db = getDatabase();
    const safeId = db.toSafeId(id);
    
    try {
      const { error } = await client
        .from(this.table)
        .delete()
        .eq('id', safeId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ delete error:', error.message);
      throw error;
    }
  }
  
  static async softDelete(id) {
    return this.update(id, {
      is_active: false,
      deleted_at: new Date().toISOString(),
    });
  }
  
  // ============================================
  // 🔐 AUTH METHODS
  // ============================================
  
  static async verifyPassword(user, password) {
    if (!user || !user.password) return false;
    return comparePassword(password, user.password);
  }
  
  static async createVerificationToken(userId) {
    const client = getSupabaseClient();
    const db = getDatabase();
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    try {
      const { data, error } = await client
        .from(TABLES.verificationTokens)
        .insert({
          user_id: db.toSafeId(userId),
          token,
          type: 'verification',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return { token, expiresAt };
    } catch (error) {
      console.error('❌ createVerificationToken error:', error.message);
      throw error;
    }
  }
  
  static async verifyEmail(token) {
    const client = getSupabaseClient();
    
    try {
      const { data: tokenData, error: tokenError } = await client
        .from(TABLES.verificationTokens)
        .select('*')
        .eq('token', token)
        .eq('type', 'verification')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (tokenError || !tokenData) {
        throw new Error('⚠️ رمز التحقق غير صالح أو منتهي');
      }
      
      // ✅ Mark token as used
      await client
        .from(TABLES.verificationTokens)
        .update({ is_used: true })
        .eq('id', tokenData.id);
      
      // ✅ Update user
      const user = await this.update(tokenData.user_id, {
        is_verified: true,
        email_confirmed_at: new Date().toISOString(),
      });
      
      return user;
    } catch (error) {
      console.error('❌ verifyEmail error:', error.message);
      throw error;
    }
  }
  
  // ============================================
  // 👤 USER PROFILE METHODS
  // ============================================
  
  static async getProfile(userId) {
    const client = getSupabaseClient();
    const db = getDatabase();
    const safeId = db.toSafeId(userId);
    
    try {
      const { data, error } = await client
        .from(this.table)
        .select(`
          *,
          user_type:user_types(*),
          user_points:user_points(*)
        `)
        .eq('id', safeId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ getProfile error:', error.message);
      return null;
    }
  }
  
  static async getSpecializations(userId) {
    const client = getSupabaseClient();
    const db = getDatabase();
    const safeId = db.toSafeId(userId);
    
    try {
      const { data, error } = await client
        .from(this.table)
        .select('specializations')
        .eq('id', safeId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.specializations || [];
    } catch (error) {
      console.error('❌ getSpecializations error:', error.message);
      return [];
    }
  }
  
  static async updateSpecializations(userId, specializations) {
    return this.update(userId, { specializations });
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async getStats(userId) {
    const client = getSupabaseClient();
    const db = getDatabase();
    const safeId = db.toSafeId(userId);
    
    try {
      const [
        products,
        orders,
        auctions,
        favorites,
      ] = await Promise.all([
        client.from(TABLES.products).select('count').eq('seller_id', safeId),
        client.from(TABLES.orders).select('count').eq('user_id', safeId),
        client.from(TABLES.auctions).select('count').eq('seller_id', safeId),
        client.from(TABLES.favorites).select('count').eq('user_id', safeId),
      ]);
      
      return {
        products: products.count || 0,
        orders: orders.count || 0,
        auctions: auctions.count || 0,
        favorites: favorites.count || 0,
      };
    } catch (error) {
      console.error('❌ getStats error:', error.message);
      return { products: 0, orders: 0, auctions: 0, favorites: 0 };
    }
  }
}

module.exports = UserModel;