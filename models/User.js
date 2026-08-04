// ============================================
// 👤 USER MODEL - تم إصلاحه للتعامل مع UUID ✅
// ============================================

const { TABLES, getSupabaseClient, isValidUUID } = require('../config/supabase');
const { hashPassword, comparePassword } = require('../utils/helpers');

class UserModel {
  static get table() { return TABLES.users; }
  
  // ============================================
  // 🔍 FIND METHODS - تم إصلاحها ✅
  // ============================================
  
  static async findById(id) {
    // التحقق من صحة المعرف
    if (!id || typeof id !== 'string') return null;
    
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('id', id) // مباشرة كـ String (UUID)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findByEmail(email) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findByPhone(phone) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findByIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
    
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .in('id', ids); // المعرفات كـ String (UUID)
    
    if (error) throw error;
    return data || [];
  }
  
  static async findAll(options = {}) {
    const client = getSupabaseClient();
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
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ============================================
  // ✏️ CREATE / UPDATE / DELETE
  // ============================================
  
  static async create(userData) {
    const client = getSupabaseClient();
    
    // Hash password if provided
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }
    
    // Ensure id is a valid UUID or generate one
    if (!userData.id || !isValidUUID(userData.id)) {
      userData.id = crypto.randomUUID();
    }
    
    const { data, error } = await client
      .from(this.table)
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async update(id, userData) {
    const client = getSupabaseClient();
    
    // Hash password if provided
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }
    
    const { data, error } = await client
      .from(this.table)
      .update(userData)
      .eq('id', id) // مباشرة كـ String (UUID)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async delete(id) {
    const client = getSupabaseClient();
    const { error } = await client
      .from(this.table)
      .delete()
      .eq('id', id); // مباشرة كـ String (UUID)
    
    if (error) throw error;
    return true;
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
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const { data, error } = await client
      .from(TABLES.verificationTokens)
      .insert({
        user_id: userId,
        token,
        type: 'verification',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return { token, expiresAt };
  }
  
  static async verifyEmail(token) {
    const client = getSupabaseClient();
    
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
    
    // Mark token as used
    await client
      .from(TABLES.verificationTokens)
      .update({ is_used: true })
      .eq('id', tokenData.id);
    
    // Update user
    const user = await this.update(tokenData.user_id, {
      is_verified: true,
      email_confirmed_at: new Date().toISOString(),
    });
    
    return user;
  }
  
  // ============================================
  // 👤 USER PROFILE METHODS
  // ============================================
  
  static async getProfile(userId) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .select(`
        *,
        user_type:user_types(*),
        user_points:user_points(*)
      `)
      .eq('id', userId) // مباشرة كـ String (UUID)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async getSpecializations(userId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('specializations')
      .eq('id', userId) // مباشرة كـ String (UUID)
      .maybeSingle();
    
    if (error) throw error;
    return data?.specializations || [];
  }
  
  static async updateSpecializations(userId, specializations) {
    return this.update(userId, { specializations });
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async getStats(userId) {
    const client = getSupabaseClient();
    
    const [
      products,
      orders,
      auctions,
      favorites,
    ] = await Promise.all([
      client.from(TABLES.products).select('count').eq('seller_id', userId),
      client.from(TABLES.orders).select('count').eq('user_id', userId),
      client.from(TABLES.auctions).select('count').eq('seller_id', userId),
      client.from(TABLES.favorites).select('count').eq('user_id', userId),
    ]);
    
    return {
      products: products.count || 0,
      orders: orders.count || 0,
      auctions: auctions.count || 0,
      favorites: favorites.count || 0,
    };
  }
}

module.exports = UserModel;