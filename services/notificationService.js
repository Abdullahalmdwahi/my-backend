// ============================================
// 🔔 NOTIFICATION SERVICE - محسن مع دعم Socket.IO
// ============================================

const { getSupabaseClient } = require('../config/supabase');
const { getIO } = require('../socket/ticketSocket');

class NotificationService {
  
  static async sendToUser(userId, title, body, data = {}, type = 'general') {
    try {
      const client = getSupabaseClient();
      
      const { error } = await client
        .from('notifications')
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
      
      try {
        const io = getIO();
        if (io) {
          io.to(`user-${userId}`).emit('notification', { title, body, data });
        }
      } catch (socketError) {
        console.debug('Socket.io notification skipped:', socketError.message);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  static async sendToAdmin(title, body, data = {}, type = 'admin') {
    try {
      const client = getSupabaseClient();
      
      const { data: admins, error: adminError } = await client
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin']);

      if (adminError) throw adminError;

      for (const admin of admins) {
        await this.sendToUser(admin.id, title, body, data, type);
      }

      try {
        const io = getIO();
        if (io) {
          io.to('admin').emit('admin-notification', { title, body, data });
        }
      } catch (socketError) {
        console.debug('Socket.io admin notification skipped:', socketError.message);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      return false;
    }
  }

  static async getUserNotifications(userId, options = {}) {
    try {
      const client = getSupabaseClient();
      let query = client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get notifications:', error);
      return [];
    }
  }

  static async getUnreadCount(userId) {
    try {
      const client = getSupabaseClient();
      const { count, error } = await client
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  static async markAsRead(notificationId) {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
      return false;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
      return false;
    }
  }

  static async deleteNotification(notificationId) {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      return false;
    }
  }

  static async deleteAllForUser(userId) {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to delete all notifications:', error);
      return false;
    }
  }

  static async createGlobalNotification(title, body, data = {}, type = 'global') {
    try {
      const client = getSupabaseClient();
      
      const { error } = await client
        .from('global_notifications')
        .insert({
          title,
          body,
          type,
          data,
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to create global notification:', error);
      return false;
    }
  }

  static async getGlobalNotifications(options = {}) {
    try {
      const client = getSupabaseClient();
      let query = client
        .from('global_notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get global notifications:', error);
      return [];
    }
  }
}

module.exports = NotificationService;