// ============================================
// 📱 NOTIFICATION MODEL - معدل ✅
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');

class NotificationModel {
  static get table() { return TABLES.notifications; }
  static get globalTable() { return TABLES.globalNotifications; }
  static get adminTable() { return TABLES.adminNotifications; }
  
  // ============================================
  // 🔍 FIND METHODS
  // ============================================
  
  static async findById(id) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findByUser(userId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .eq('user_id', userId);
    
    if (options.isRead !== undefined) {
      query = query.eq('is_read', options.isRead);
    }
    
    if (options.type) {
      query = query.eq('type', options.type);
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
  
  static async findUnread(userId) {
    return this.findByUser(userId, { isRead: false });
  }
  
  static async findGlobal(options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.globalTable)
      .select('*')
      .eq('is_active', true);
    
    if (options.type) {
      query = query.eq('type', options.type);
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
  
  static async findAdmin(options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.adminTable)
      .select('*');
    
    if (options.isRead !== undefined) {
      query = query.eq('is_read', options.isRead);
    }
    
    if (options.type) {
      query = query.eq('type', options.type);
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
  // ✏️ CREATE METHODS
  // ============================================
  
  static async create(notificationData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .insert({
        ...notificationData,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async createGlobal(notificationData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.globalTable)
      .insert({
        ...notificationData,
        is_active: true,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async createAdmin(notificationData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.adminTable)
      .insert({
        ...notificationData,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // ✅ دالة sendToSpecificUser للتكامل مع ticketController
  static async sendToSpecificUser({ userId, title, body, data = {} }) {
    return this.create({
      user_id: userId,
      title,
      body,
      data,
      type: 'general',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }
  
  // ============================================
  // ✏️ UPDATE METHODS
  // ============================================
  
  static async markAsRead(id) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async markAllAsRead(userId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(this.table)
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return true;
  }
  
  static async markGlobalAsRead(id) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.globalTable)
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async markAdminAsRead(id) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.adminTable)
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // ============================================
  // 🗑️ DELETE METHODS
  // ============================================
  
  static async delete(id) {
    const client = getSupabaseClient();
    const { error } = await client
      .from(this.table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  static async deleteAllForUser(userId) {
    const client = getSupabaseClient();
    const { error } = await client
      .from(this.table)
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  }
  
  static async deleteGlobal(id) {
    const client = getSupabaseClient();
    const { error } = await client
      .from(this.globalTable)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  static async deleteAdmin(id) {
    const client = getSupabaseClient();
    const { error } = await client
      .from(this.adminTable)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async getUnreadCount(userId) {
    const client = getSupabaseClient();
    const { count, error } = await client
      .from(this.table)
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
  }
  
  static async getGlobalUnreadCount() {
    const client = getSupabaseClient();
    const { count, error } = await client
      .from(this.globalTable)
      .select('id', { count: 'exact' })
      .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
  }
  
  static async getAdminUnreadCount() {
    const client = getSupabaseClient();
    const { count, error } = await client
      .from(this.adminTable)
      .select('id', { count: 'exact' })
      .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
  }
}

module.exports = NotificationModel;