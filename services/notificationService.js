// ============================================
// 📱 NOTIFICATION SERVICE - جديد ✅
// ============================================

const { TABLES, getSupabaseClient, getSupabaseAdmin } = require('../config/supabase');

class NotificationService {
  
  // ============================================
  // 📤 SEND NOTIFICATION
  // ============================================
  
  static async sendToUser(userId, title, body, data = {}, type = 'general') {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.notifications)
      .insert({
        user_id: userId,
        title,
        body,
        type,
        data,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    return true;
  }
  
  static async sendToAdmin(title, body, data = {}, type = 'admin') {
    const client = getSupabaseAdmin();
    
    // Get all admin users
    const { data: admins, error: adminError } = await client
      .from(TABLES.users)
      .select('id')
      .in('role', ['admin', 'super_admin']);
    
    if (adminError) throw adminError;
    
    // Send to each admin
    for (const admin of admins) {
      await this.sendToUser(admin.id, title, body, data, type);
    }
    
    return true;
  }
  
  static async sendToAllUsers(title, body, data = {}, type = 'global') {
    const client = getSupabaseAdmin();
    
    // Get all active users
    const { data: users, error: userError } = await client
      .from(TABLES.users)
      .select('id')
      .eq('is_active', true);
    
    if (userError) throw userError;
    
    // Send to each user
    for (const user of users) {
      await this.sendToUser(user.id, title, body, data, type);
    }
    
    return true;
  }
  
  // ============================================
  // 📥 GET NOTIFICATIONS
  // ============================================
  
  static async getUserNotifications(userId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(TABLES.notifications)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.unreadOnly) {
      query = query.eq('is_read', false);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  static async getUnreadCount(userId) {
    const client = getSupabaseClient();
    const { count, error } = await client
      .from(TABLES.notifications)
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
  }
  
  // ============================================
  // ✏️ UPDATE NOTIFICATIONS
  // ============================================
  
  static async markAsRead(notificationId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.notifications)
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
    return true;
  }
  
  static async markAllAsRead(userId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.notifications)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return true;
  }
  
  static async deleteNotification(notificationId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.notifications)
      .delete()
      .eq('id', notificationId);
    
    if (error) throw error;
    return true;
  }
  
  static async deleteAllForUser(userId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.notifications)
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 📊 GLOBAL NOTIFICATIONS
  // ============================================
  
  static async createGlobalNotification(title, body, data = {}, type = 'global') {
    const client = getSupabaseAdmin();
    
    const { data: notification, error } = await client
      .from(TABLES.globalNotifications)
      .insert({
        title,
        body,
        type,
        data,
        is_active: true,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Send to all users
    await this.sendToAllUsers(title, body, data, type);
    
    return notification;
  }
  
  static async getGlobalNotifications(options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(TABLES.globalNotifications)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

module.exports = NotificationService;