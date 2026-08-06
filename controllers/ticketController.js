// ============================================
// 🎫 TICKET CONTROLLER - متكامل مع دردشة فورية
// ============================================

const { getSupabaseClient, TABLES } = require('../config/supabase');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const NotificationService = require('../services/notificationService');
const { getIO } = require('../socket/ticketSocket');

class TicketController {
  
  // ============================================
  // 📋 إنشاء تذكرة جديدة
  // ============================================
  static async createTicket(req, res, next) {
    try {
      const userId = req.user.id;
      const { subject, description, priority = 'medium', attachments = [] } = req.body;

      if (!subject || !description) {
        throw new ValidationError('⚠️ العنوان والوصف مطلوبان');
      }

      const client = getSupabaseClient();
      
      const ticketData = {
        user_id: userId,
        user_name: req.user.name,
        user_email: req.user.email,
        subject: sanitizeInput(subject),
        description: sanitizeInput(description),
        priority,
        status: 'open',
        attachments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: ticket, error } = await client
        .from(TABLES.supportTickets)
        .insert(ticketData)
        .select()
        .single();

      if (error) throw error;

      // ✅ إضافة رسالة أولى
      const messageData = {
        ticket_id: ticket.id,
        user_id: userId,
        user_name: req.user.name,
        message: description,
        is_from_user: true,
        created_at: new Date().toISOString(),
      };

      await client
        .from('ticket_messages')
        .insert(messageData);

      // ✅ إرسال إشعار فوري للمديرين
      await NotificationService.sendToAdmin(
        '🎫 تذكرة دعم جديدة',
        `من: ${req.user.name}\nالموضوع: ${subject}`,
        {
          ticketId: ticket.id,
          userId: userId,
          userName: req.user.name,
          subject,
          priority,
          type: 'new_ticket',
        }
      );

      // ✅ إشعار للمستخدم
      await NotificationService.sendToUser(
        userId,
        '📨 تم استلام تذكرتك',
        `تم استلام تذكرتك "#${ticket.id.substring(0, 8)}". سيتم الرد عليك قريباً.`,
        { ticketId: ticket.id, type: 'ticket_created' }
      );

      // ✅ إرسال عبر Socket.io
      const io = getIO();
      io.to('admin').emit('new-ticket', ticket);

      res.status(201).json({
        success: true,
        message: '✅ تم إنشاء التذكرة بنجاح',
        data: ticket,
      });

    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 💬 إرسال رسالة (فورية)
  // ============================================
  static async sendMessage(req, res, next) {
    try {
      const { ticketId } = req.params;
      const userId = req.user.id;
      const { message, imageUrl } = req.body;

      if (!message && !imageUrl) {
        throw new ValidationError('⚠️ الرسالة أو الصورة مطلوبة');
      }

      const client = getSupabaseClient();

      // ✅ التحقق من التذكرة
      const { data: ticket, error: ticketError } = await client
        .from(TABLES.supportTickets)
        .select()
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new NotFoundError('التذكرة');
      }

      // ✅ إضافة الرسالة
      const messageData = {
        ticket_id: ticketId,
        user_id: userId,
        user_name: req.user.name,
        message: sanitizeInput(message),
        image_url: imageUrl,
        is_from_user: !req.user.isAdmin,
        is_from_ai: false,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const { data: msg, error: msgError } = await client
        .from('ticket_messages')
        .insert(messageData)
        .select()
        .single();

      if (msgError) throw msgError;

      // ✅ تحديث وقت التذكرة
      await client
        .from(TABLES.supportTickets)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      // ✅ إرسال إشعار فوري
      if (req.user.isAdmin) {
        // ✅ رد من المدير → إشعار للمستخدم
        await NotificationService.sendToUser(
          ticket.user_id,
          '💬 رد من الدعم الفني',
          message ? (message.length > 50 ? message.substring(0, 50) + '...' : message) : '📎 صورة',
          { ticketId, messageId: msg.id, type: 'admin_reply' }
        );
      } else {
        // ✅ رسالة من المستخدم → إشعار للمدير
        await NotificationService.sendToAdmin(
          `💬 رد جديد من ${req.user.name}`,
          message ? (message.length > 50 ? message.substring(0, 50) + '...' : message) : '📎 صورة',
          { ticketId, messageId: msg.id, userId, userName: req.user.name }
        );
      }

      // ✅ إرسال عبر Socket.io (فوري)
      const io = getIO();
      io.to(`ticket-${ticketId}`).emit('new-message', msg);
      
      // ✅ إعلام المديرين في حالة رسالة من المستخدم
      if (!req.user.isAdmin) {
        io.to('admin').emit('ticket-message', { ticketId, message: msg });
      }

      res.json({
        success: true,
        message: '✅ تم إرسال الرسالة',
        data: msg,
      });

    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 جلب رسائل التذكرة (Realtime)
  // ============================================
  static async getMessages(req, res, next) {
    try {
      const { ticketId } = req.params;
      const userId = req.user.id;

      const client = getSupabaseClient();

      // ✅ التحقق من التذكرة
      const { data: ticket, error: ticketError } = await client
        .from(TABLES.supportTickets)
        .select()
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new NotFoundError('التذكرة');
      }

      // ✅ التحقق من الصلاحية
      if (ticket.user_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('⚠️ غير مصرح لك بمشاهدة هذه التذكرة');
      }

      // ✅ جلب الرسائل
      const { data: messages, error } = await client
        .from('ticket_messages')
        .select()
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // ✅ تحديد الرسائل كمقروءة
      if (!req.user.isAdmin) {
        await client
          .from('ticket_messages')
          .update({ is_read: true })
          .eq('ticket_id', ticketId)
          .eq('user_id', userId)
          .eq('is_read', false);
      }

      res.json({
        success: true,
        data: messages || [],
      });

    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 تحديث حالة التذكرة
  // ============================================
  static async updateTicketStatus(req, res, next) {
    try {
      const { ticketId } = req.params;
      const { status, notes } = req.body;

      if (!req.user.isAdmin) {
        throw new ValidationError('⚠️ فقط المدير يمكنه تغيير الحالة');
      }

      const client = getSupabaseClient();

      const updates = {
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'resolved' && { resolved_at: new Date().toISOString() }),
        ...(notes && { admin_notes: notes }),
      };

      const { data: ticket, error } = await client
        .from(TABLES.supportTickets)
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      // ✅ إشعار للمستخدم
      await NotificationService.sendToUser(
        ticket.user_id,
        '📌 تحديث حالة التذكرة',
        `تم تغيير حالة تذكرتك إلى: ${status}`,
        { ticketId, status, type: 'ticket_status' }
      );

      // ✅ إرسال عبر Socket.io
      const io = getIO();
      io.to(`ticket-${ticketId}`).emit('ticket-updated', ticket);

      res.json({
        success: true,
        message: '✅ تم تحديث حالة التذكرة',
        data: ticket,
      });

    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 جلب جميع التذاكر (للمدير)
  // ============================================
  static async getAllTickets(req, res, next) {
    try {
      if (!req.user.isAdmin) {
        throw new ValidationError('⚠️ غير مصرح لك');
      }

      const { status, limit = 50, offset = 0 } = req.query;

      const client = getSupabaseClient();
      let query = client
        .from(TABLES.supportTickets)
        .select('*, messages:ticket_messages(*)');

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: data?.length || 0,
        },
      });

    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 إحصائيات التذاكر
  // ============================================
  static async getTicketStats(req, res, next) {
    try {
      if (!req.user.isAdmin) {
        throw new ValidationError('⚠️ غير مصرح لك');
      }

      const client = getSupabaseClient();

      const stats = await Promise.all([
        client.from(TABLES.supportTickets).select('count'),
        client.from(TABLES.supportTickets).select('count').eq('status', 'open'),
        client.from(TABLES.supportTickets).select('count').eq('status', 'inProgress'),
        client.from(TABLES.supportTickets).select('count').eq('status', 'resolved'),
        client.from(TABLES.supportTickets).select('count').eq('status', 'closed'),
      ]);

      res.json({
        success: true,
        data: {
          total: stats[0].count || 0,
          open: stats[1].count || 0,
          inProgress: stats[2].count || 0,
          resolved: stats[3].count || 0,
          closed: stats[4].count || 0,
        },
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = TicketController;