// ============================================
// 👑 ADMIN CONTROLLER - جديد ✅
// ============================================

const { User, Product, Auction, Order, Payment } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');
const NotificationService = require('../services/notificationService');

class AdminController {
  // ============================================
  // 📊 GET DASHBOARD STATS
  // ============================================
  static async getStats(req, res, next) {
    try {
      const client = getSupabaseClient();

      const [
        users,
        products,
        auctions,
        orders,
        payments,
      ] = await Promise.all([
        client.from(TABLES.users).select('count'),
        client.from(TABLES.products).select('count'),
        client.from(TABLES.auctions).select('count'),
        client.from(TABLES.orders).select('count'),
        client.from(TABLES.paymentTransactions).select('count'),
      ]);

      res.json({
        success: true,
        data: {
          users: users.count || 0,
          products: products.count || 0,
          auctions: auctions.count || 0,
          orders: orders.count || 0,
          payments: payments.count || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET REVENUE STATS
  // ============================================
  static async getRevenueStats(req, res, next) {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from(TABLES.paymentTransactions)
        .select('amount, created_at')
        .eq('status', 'completed');

      if (error) throw error;

      const totalRevenue = data.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Group by month
      const monthlyRevenue = {};
      for (const item of data) {
        const month = new Date(item.created_at).toISOString().substring(0, 7);
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (item.amount || 0);
      }

      res.json({
        success: true,
        data: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          count: data.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 👤 GET USERS
  // ============================================
  static async getUsers(req, res, next) {
    try {
      const { limit = 20, offset = 0, role, isActive } = req.query;

      const users = await User.findAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        role,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        orderBy: 'created_at',
        ascending: false,
      });

      res.json({
        success: true,
        data: users,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: users.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 👤 GET USER DETAILS
  // ============================================
  static async getUserDetails(req, res, next) {
    try {
      const { id } = req.params;
      const validation = validateId(id);
      if (!validation.valid) {
        throw new ValidationError(validation.message);
      }

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      // Get user stats
      const stats = await User.getStats(id);

      res.json({
        success: true,
        data: {
          ...user,
          stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE USER ROLE
  // ============================================
  static async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['user', 'admin', 'super_admin'].includes(role)) {
        throw new ValidationError('⚠️ دور غير صالح');
      }

      const user = await User.update(id, { role });
      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      res.json({
        success: true,
        message: '✅ تم تحديث دور المستخدم بنجاح',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🚫 BLOCK USER
  // ============================================
  static async blockUser(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const user = await User.update(id, {
        is_active: false,
        blocked_reason: reason || 'تم الحظر من قبل الإدارة',
        blocked_at: new Date().toISOString(),
      });

      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      res.json({
        success: true,
        message: '✅ تم حظر المستخدم بنجاح',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ UNBLOCK USER
  // ============================================
  static async unblockUser(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.update(id, {
        is_active: true,
        blocked_reason: null,
        blocked_at: null,
      });

      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      res.json({
        success: true,
        message: '✅ تم إلغاء حظر المستخدم بنجاح',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE USER
  // ============================================
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      await User.delete(id);

      res.json({
        success: true,
        message: '✅ تم حذف المستخدم بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📦 GET PRODUCTS
  // ============================================
  static async getProducts(req, res, next) {
    try {
      const { status, limit = 20, offset = 0 } = req.query;

      const products = await Product.findAll({
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: 'created_at',
        ascending: false,
      });

      res.json({
        success: true,
        data: products,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: products.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📦 GET PENDING PRODUCTS
  // ============================================
  static async getPendingProducts(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.pendingProducts)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ APPROVE PRODUCT
  // ============================================
  static async approveProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { durationHours = 168 } = req.body;

      const product = await Product.approvePending(id, durationHours);

      // Send notification to seller
      await NotificationService.sendToUser(
        product.seller_id,
        '✅ تمت الموافقة على إعلانك',
        `تمت الموافقة على إعلان "${product.title}" ونشره`,
        { productId: product.id, type: 'approval' }
      );

      res.json({
        success: true,
        message: '✅ تمت الموافقة على المنتج ونشره',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ❌ REJECT PRODUCT
  // ============================================
  static async rejectProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const product = await Product.rejectPending(id, reason || 'تم رفض المنتج');

      // Send notification to seller
      await NotificationService.sendToUser(
        product.seller_id,
        '❌ تم رفض إعلانك',
        `تم رفض إعلان "${product.title}" بسبب: ${reason || 'لم يتم تحديد سبب'}`,
        { productId: product.id, type: 'rejection' }
      );

      res.json({
        success: true,
        message: '❌ تم رفض المنتج',
        reason: reason || 'تم رفض المنتج',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE PRODUCT
  // ============================================
  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      await Product.delete(id);

      res.json({
        success: true,
        message: '✅ تم حذف المنتج بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🔨 GET AUCTIONS
  // ============================================
  static async getAuctions(req, res, next) {
    try {
      const { status, limit = 20, offset = 0 } = req.query;

      const auctions = await Auction.findActive({
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: 'created_at',
        ascending: false,
      });

      res.json({
        success: true,
        data: auctions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: auctions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🏁 END AUCTION
  // ============================================
  static async endAuction(req, res, next) {
    try {
      const { id } = req.params;

      const auction = await Auction.endAuction(id);

      res.json({
        success: true,
        message: '✅ تم إنهاء المزاد بنجاح',
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ❌ CANCEL AUCTION
  // ============================================
  static async cancelAuction(req, res, next) {
    try {
      const { id } = req.params;

      const auction = await Auction.cancelAuction(id);

      res.json({
        success: true,
        message: '✅ تم إلغاء المزاد بنجاح',
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 💰 GET PAYMENTS
  // ============================================
  static async getPayments(req, res, next) {
    try {
      const { status, limit = 20, offset = 0 } = req.query;

      const payments = await Payment.findByStatus(status, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: 'created_at',
        ascending: false,
      });

      res.json({
        success: true,
        data: payments,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: payments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ APPROVE PAYMENT
  // ============================================
  static async approvePayment(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const payment = await Payment.confirmPayment(id, req.user.name);

      // Send notification to user
      await NotificationService.sendToUser(
        payment.user_id,
        '✅ تم تأكيد الدفع',
        `تم تأكيد دفعتك بقيمة ${payment.amount} ${payment.currency}`,
        { paymentId: payment.id, type: 'payment' }
      );

      res.json({
        success: true,
        message: '✅ تمت الموافقة على الدفع',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ❌ REJECT PAYMENT
  // ============================================
  static async rejectPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const payment = await Payment.rejectPayment(id, reason || 'تم الرفض من قبل الإدارة');

      // Send notification to user
      await NotificationService.sendToUser(
        payment.user_id,
        '❌ تم رفض الدفع',
        `تم رفض دفعتك بقيمة ${payment.amount} ${payment.currency} بسبب: ${reason || 'لم يتم تحديد سبب'}`,
        { paymentId: payment.id, type: 'payment' }
      );

      res.json({
        success: true,
        message: '❌ تم رفض الدفع',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📱 SEND NOTIFICATION
  // ============================================
  static async sendNotification(req, res, next) {
    try {
      const { userId, title, body, data, type } = req.body;

      if (!userId || !title || !body) {
        throw new ValidationError('⚠️ معرف المستخدم والعنوان والمحتوى مطلوبة');
      }

      await NotificationService.sendToUser(userId, title, body, data || {}, type || 'admin');

      res.json({
        success: true,
        message: '✅ تم إرسال الإشعار بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📱 SEND GLOBAL NOTIFICATION
  // ============================================
  static async sendGlobalNotification(req, res, next) {
    try {
      const { title, body, data, type } = req.body;

      if (!title || !body) {
        throw new ValidationError('⚠️ العنوان والمحتوى مطلوبة');
      }

      await NotificationService.createGlobalNotification(title, body, data || {}, type || 'global');

      res.json({
        success: true,
        message: '✅ تم إرسال الإشعار لجميع المستخدمين',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET ADMIN NOTIFICATIONS
  // ============================================
  static async getAdminNotifications(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.adminNotifications)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ MARK NOTIFICATION AS READ
  // ============================================
  static async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;

      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.adminNotifications)
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: '✅ تم تحديد الإشعار كمقروء',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ⚙️ GET SETTINGS
  // ============================================
  static async getSettings(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.appSettings)
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ⚙️ UPDATE SETTINGS
  // ============================================
  static async updateSettings(req, res, next) {
    try {
      const settings = req.body;

      const client = getSupabaseClient();
      const results = [];

      for (const [key, value] of Object.entries(settings)) {
        const { data, error } = await client
          .from(TABLES.appSettings)
          .upsert({
            key,
            value: JSON.stringify(value),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        results.push(data);
      }

      res.json({
        success: true,
        message: '✅ تم تحديث الإعدادات بنجاح',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📂 GET CATEGORIES
  // ============================================
  static async getCategories(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.categories)
        .select('*')
        .eq('is_active', true)
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ➕ CREATE CATEGORY
  // ============================================
  static async createCategory(req, res, next) {
    try {
      const categoryData = req.body;

      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.categories)
        .insert({
          ...categoryData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        message: '✅ تم إنشاء القسم بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE CATEGORY
  // ============================================
  static async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.categories)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: '✅ تم تحديث القسم بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE CATEGORY
  // ============================================
  static async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;

      const client = getSupabaseClient();
      const { error } = await client
        .from(TABLES.categories)
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: '✅ تم حذف القسم بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET REPORTS
  // ============================================
  static async getReports(req, res, next) {
    try {
      const { type, startDate, endDate } = req.query;

      // Implementation depends on report type
      // This is a placeholder

      res.json({
        success: true,
        data: {
          type: type || 'general',
          startDate,
          endDate,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GENERATE REPORT
  // ============================================
  static async generateReport(req, res, next) {
    try {
      const { type, startDate, endDate, format = 'json' } = req.body;

      // Implementation depends on report type
      // This is a placeholder

      res.json({
        success: true,
        message: '✅ تم إنشاء التقرير بنجاح',
        data: {
          type,
          startDate,
          endDate,
          format,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 EXPORT REPORT
  // ============================================
  static async exportReport(req, res, next) {
    try {
      const { type } = req.params;
      const { format = 'pdf' } = req.query;

      // Implementation depends on export type
      // This is a placeholder

      res.json({
        success: true,
        message: '✅ تم تصدير التقرير بنجاح',
        data: {
          type,
          format,
          exportedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;