// ============================================
// 🚏 API ROUTES - النسخة المُصلحة
// ============================================

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const emailRoutes = require('./emailRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const auctionRoutes = require('./auctionRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const walletRoutes = require('./walletRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');
const ticketRoutes = require('./tickets');

// ✅ المسارات
router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/auctions', auctionRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallets', walletRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/tickets', ticketRoutes);

// ✅ Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ✅ Stats
router.get('/stats', async (req, res) => {
  try {
    const { getSupabaseClient } = require('../config/supabase');
    const supabase = getSupabaseClient();
    
    const [
      products,
      auctions,
      orders,
      users,
    ] = await Promise.all([
      supabase.from('products').select('count', { count: 'exact', head: true }),
      supabase.from('auctions').select('count', { count: 'exact', head: true }),
      supabase.from('orders').select('count', { count: 'exact', head: true }),
      supabase.from('users').select('count', { count: 'exact', head: true }),
    ]);
    
    res.json({
      success: true,
      data: {
        products: products.count || 0,
        auctions: auctions.count || 0,
        orders: orders.count || 0,
        users: users.count || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Stats error:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في جلب الإحصائيات',
    });
  }
});

router.get('/info', (req, res) => {
  res.json({
    success: true,
    name: process.env.APP_NAME || 'Sell In API',
    version: process.env.APP_VERSION || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;