// ============================================
// 🎫 TICKET SOCKET - دردشة فورية لتذاكر الدعم
// ============================================

const { getSupabaseClient } = require('../config/supabase');

let io = null;
const ticketRooms = new Map();

function initTicketSocket(server) {
  io = require('socket.io')(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Ticket socket connected:', socket.id);

    // ✅ الانضمام إلى غرفة التذكرة
    socket.on('join-ticket', (ticketId) => {
      if (!ticketId) return;
      
      socket.join(`ticket-${ticketId}`);
      
      if (!ticketRooms.has(ticketId)) {
        ticketRooms.set(ticketId, new Set());
      }
      ticketRooms.get(ticketId).add(socket.id);
      
      console.log(`📢 User ${socket.id} joined ticket ${ticketId}`);
      socket.emit('ticket-joined', { ticketId });
    });

    // ✅ مغادرة غرفة التذكرة
    socket.on('leave-ticket', (ticketId) => {
      if (!ticketId) return;
      
      socket.leave(`ticket-${ticketId}`);
      
      if (ticketRooms.has(ticketId)) {
        ticketRooms.get(ticketId).delete(socket.id);
        if (ticketRooms.get(ticketId).size === 0) {
          ticketRooms.delete(ticketId);
        }
      }
      
      console.log(`📢 User ${socket.id} left ticket ${ticketId}`);
    });

    // ✅ رسالة جديدة (فورية)
    socket.on('ticket-message', async (data) => {
      const { ticketId, message, userId, userName, isFromUser } = data;
      
      if (!ticketId || !message) return;
      
      console.log(`💬 New message in ticket ${ticketId}:`, message);
      
      // ✅ حفظ الرسالة في قاعدة البيانات
      try {
        const supabase = getSupabaseClient();
        
        const { data: msg, error } = await supabase
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            user_id: userId,
            user_name: userName,
            message: message,
            is_from_user: isFromUser,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error saving message:', error);
          return;
        }
        
        // ✅ تحديث وقت التذكرة
        await supabase
          .from('support_tickets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', ticketId);
        
        // ✅ بث الرسالة لكل من في غرفة التذكرة
        io.to(`ticket-${ticketId}`).emit('new-message', msg);
        
        // ✅ إعلام المديرين في حالة رسالة من المستخدم
        if (isFromUser) {
          io.to('admin').emit('ticket-message', { ticketId, message: msg });
        }
        
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    });

    // ✅ مؤشر "يكتب..."
    socket.on('typing', (data) => {
      const { ticketId, isTyping, userId, userName } = data;
      
      if (!ticketId) return;
      
      io.to(`ticket-${ticketId}`).emit('user-typing', {
        userId,
        userName,
        isTyping,
      });
    });

    // ✅ انقطاع الاتصال
    socket.on('disconnect', () => {
      console.log('🔌 Ticket socket disconnected:', socket.id);
      
      // تنظيف الغرف
      for (const [ticketId, clients] of ticketRooms) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            ticketRooms.delete(ticketId);
          }
        }
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('⚠️ Socket.io not initialized');
  }
  return io;
}

module.exports = {
  initTicketSocket,
  getIO,
};