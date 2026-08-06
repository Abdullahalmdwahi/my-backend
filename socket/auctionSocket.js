// ============================================
// 🔌 AUCTION SOCKET - تم إصلاحه بالكامل ✅
// ============================================

const { Server } = require('socket.io');

let io = null;
const auctionRooms = new Map();

function initSocket(server) {
  try {
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);

      // Join auction room
      socket.on('join-auction', (auctionId) => {
        if (!auctionId) return;
        
        socket.join(`auction-${auctionId}`);
        
        if (!auctionRooms.has(auctionId)) {
          auctionRooms.set(auctionId, new Set());
        }
        auctionRooms.get(auctionId).add(socket.id);
        
        console.log(`📢 Client ${socket.id} joined auction ${auctionId}`);
        socket.emit('auction-joined', { auctionId });
      });

      // Leave auction room
      socket.on('leave-auction', (auctionId) => {
        if (!auctionId) return;
        
        socket.leave(`auction-${auctionId}`);
        
        if (auctionRooms.has(auctionId)) {
          auctionRooms.get(auctionId).delete(socket.id);
          if (auctionRooms.get(auctionId).size === 0) {
            auctionRooms.delete(auctionId);
          }
        }
        
        console.log(`📢 Client ${socket.id} left auction ${auctionId}`);
      });

      // New bid
      socket.on('new-bid', async (data) => {
        const { auctionId, bid } = data;
        if (!auctionId || !bid) return;
        
        console.log(`💰 New bid in auction ${auctionId}: ${bid.amount}`);
        
        // Broadcast to all clients in the auction room
        io.to(`auction-${auctionId}`).emit('bid-update', {
          auctionId,
          bid,
          timestamp: new Date().toISOString(),
        });
      });

      // Auction ended
      socket.on('auction-ended', (data) => {
        const { auctionId, winner } = data;
        if (!auctionId) return;
        
        console.log(`🏁 Auction ${auctionId} ended. Winner: ${winner?.userId || 'None'}`);
        
        io.to(`auction-${auctionId}`).emit('auction-ended', {
          auctionId,
          winner,
          timestamp: new Date().toISOString(),
        });
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        
        // Clean up rooms
        for (const [auctionId, clients] of auctionRooms) {
          if (clients.has(socket.id)) {
            clients.delete(socket.id);
            if (clients.size === 0) {
              auctionRooms.delete(auctionId);
            }
          }
        }
      });
    });

    console.log('✅ Socket.IO initialized successfully');
    return io;
  } catch (error) {
    console.error('❌ Socket.IO initialization failed:', error.message);
    return null;
  }
}

function getIO() {
  if (!io) {
    console.warn('⚠️ Socket.io not initialized. Call initSocket first.');
    return null;
  }
  return io;
}

function broadcastBid(auctionId, bid) {
  const socket = getIO();
  if (!socket) return;
  socket.to(`auction-${auctionId}`).emit('bid-update', {
    auctionId,
    bid,
    timestamp: new Date().toISOString(),
  });
}

function broadcastAuctionEnd(auctionId, winner) {
  const socket = getIO();
  if (!socket) return;
  socket.to(`auction-${auctionId}`).emit('auction-ended', {
    auctionId,
    winner,
    timestamp: new Date().toISOString(),
  });
}

function getAuctionRoomCount(auctionId) {
  return auctionRooms.get(auctionId)?.size || 0;
}

module.exports = {
  initSocket,
  getIO,
  broadcastBid,
  broadcastAuctionEnd,
  getAuctionRoomCount,
};