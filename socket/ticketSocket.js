// ============================================
// 🎫 TICKET SOCKET - دعم كامل للتذاكر
// ============================================

const { Server } = require('socket.io');

let io = null;
const ticketRooms = new Map();

function initTicketSocket(server) {
  try {
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      console.log('🎫 Ticket socket connected:', socket.id);

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

      socket.on('disconnect', () => {
        console.log('🎫 Ticket socket disconnected:', socket.id);
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

    console.log('✅ Ticket Socket.IO initialized');
    return io;
  } catch (error) {
    console.warn('⚠️ Ticket Socket.IO disabled:', error.message);
    return null;
  }
}

function getIO() {
  return io;
}

module.exports = {
  initTicketSocket,
  getIO,
};