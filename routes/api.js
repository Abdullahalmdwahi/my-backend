// ============================================
// 🚏 API ROUTES - تجميع جميع المسارات
// ============================================

const express = require('express');
const router = express.Router();

// استيراد المسارات
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const auctionRoutes = require('./auctionRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const walletRoutes = require('./walletRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');

// ============================================
// 📌 المسارات
// ============================================

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/auctions', auctionRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallets', walletRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

// ============================================
// 🏥 Health Check
// ============================================

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================
// 📊 Stats (public)
// ============================================

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
      supabase.from('products').select('count'),
      supabase.from('auctions').select('count'),
      supabase.from('orders').select('count'),
      supabase.from('users').select('count'),
    ]);
    
    res.json({
      success: true,
      data: {
        products: products.count || 0,
        auctions: auctions.count || 0,
        orders: orders.count || 0,
        users: users.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في جلب الإحصائيات',
    });
  }
});

module.exports = router;