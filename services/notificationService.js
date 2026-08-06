// ============================================
// 🔔 NOTIFICATION SERVICE - محدث لدعم التذاكر
// ============================================

const { getSupabaseClient, getSupabaseAdmin } = require('../config/supabase');
const { getIO } = require('../socket/ticketSocket');

class NotificationService {
  
  // ============================================
  // 📨 إرسال إشعار لمستخدم معين
  // ============================================
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
      
      // ✅ إرسال عبر Socket.io (للتحديث الفوري)
      const io = getIO();
      io.to(`user-${userId}`).emit('notification', { title, body, data });
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  // ============================================
  // 📨 إرسال إشعار للمديرين
  // ============================================
  static async sendToAdmin(title, body, data = {}, type = 'admin') {
    try {
      const client = getSupabaseClient();
      
      // ✅ جلب المديرين
      const { data: admins, error: adminError } = await client
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin']);

      if (adminError) throw adminError;

      // ✅ إرسال لكل مدير
      for (const admin of admins) {
        await this.sendToUser(admin.id, title, body, data, type);
      }

      // ✅ إرسال عبر Socket.io (للمديرين المتصلين)
      const io = getIO();
      io.to('admin').emit('admin-notification', { title, body, data });

      return true;
      
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      return false;
    }
  }

  // ============================================
  // 📨 إشعار تذكرة جديدة (فوري)
  // ============================================
  static async sendTicketNotification({
    ticketId,
    userId,
    userName,
    subject,
    priority,
    message,
    type = 'new_ticket',
  }) {
    const priorityEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴',
    };

    const priorityText = {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية',
      urgent: 'عاجلة',
    };

    const title = type === 'new_ticket' 
      ? '🎫 تذكرة دعم جديدة' 
      : '💬 رد جديد على تذكرتك';

    const body = type === 'new_ticket'
      ? `${userName} - ${subject} (${priorityEmoji[priority]} ${priorityText[priority]})`
      : `${userName}: ${message?.substring(0, 50) || ''}...`;

    // ✅ إرسال للمديرين
    await this.sendToAdmin(
      title,
      body,
      {
        ticketId,
        userId,
        userName,
        subject,
        priority,
        type,
        go_to: 'admin_ticket',
      },
      'ticket'
    );

    // ✅ إرسال للمستخدم (تأكيد الاستلام)
    if (type === 'new_ticket') {
      await this.sendToUser(
        userId,
        '📨 تم استلام تذكرتك',
        `تم استلام تذكرتك "${subject}"، سنقوم بالرد عليك قريباً.`,
        { ticketId, go_to: 'ticket' },
        'ticket'
      );
    }

    console.log(`✅ Ticket notification sent: ${ticketId}`);
  }

  // ============================================
  // 📨 إشعار رد جديد (فوري)
  // ============================================
  static async sendReplyNotification({
    ticketId,
    userId,
    userName,
    message,
    isFromAdmin,
  }) {
    if (isFromAdmin) {
      // ✅ رد من المدير → إشعار للمستخدم
      await this.sendToUser(
        userId,
        '💬 رد من الدعم الفني',
        message?.substring(0, 100) || '📎 صورة',
        { ticketId, go_to: 'ticket' },
        'ticket'
      );
    } else {
      // ✅ رد من المستخدم → إشعار للمدير
      await this.sendToAdmin(
        `💬 رد جديد من ${userName}`,
        message?.substring(0, 100) || '📎 صورة',
        { ticketId, userId, userName },
        'ticket'
      );
    }
  }
}

module.exports = NotificationService;