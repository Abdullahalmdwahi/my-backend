// ============================================
// 🛒 ORDER CONTROLLER - معدل ✅
// ============================================

const { Order } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId, validateOrderQuantity, validateOrderAddress } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');

class OrderController {
  // ============================================
  // 📋 GET ALL ORDERS (Admin only)
  // ============================================
  static async getAll(req, res, next) {
    try {
      const {
        limit = 20,
        offset = 0,
        status,
        orderBy = 'created_at',
        ascending = false,
      } = req.query;

      const client = getSupabaseClient();
      let query = client
        .from(TABLES.orders)
        .select('*');

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query
        .order(orderBy, { ascending: ascending === 'true' })
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
  // 📋 GET USER ORDERS
  // ============================================
  static async getUserOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, limit = 20, orderBy = 'created_at', ascending = false } = req.query;

      const orders = await Order.findByUser(userId, {
        status,
        limit: parseInt(limit),
        orderBy,
        ascending: ascending === 'true',
      });

      res.json({
        success: true,
        data: orders,
        pagination: {
          limit: parseInt(limit),
          total: orders.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET SELLER ORDERS
  // ============================================
  static async getSellerOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, limit = 20, orderBy = 'created_at', ascending = false } = req.query;

      const orders = await Order.findBySeller(userId, {
        status,
        limit: parseInt(limit),
        orderBy,
        ascending: ascending === 'true',
      });

      res.json({
        success: true,
        data: orders,
        pagination: {
          limit: parseInt(limit),
          total: orders.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📦 GET ORDER BY ID
  // ============================================
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const order = await Order.findByIdWithDetails(id);
      if (!order) {
        throw new NotFoundError('الطلب');
      }

      // Check access
      if (order.user_id !== userId && order.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية عرض هذا الطلب');
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ➕ CREATE ORDER
  // ============================================
  static async create(req, res, next) {
    try {
      const userId = req.user.id;
      const orderData = req.body;

      // Validate
      const quantityValidation = validateOrderQuantity(orderData.quantity);
      if (!quantityValidation.valid) {
        throw new ValidationError(quantityValidation.message);
      }

      const addressValidation = validateOrderAddress(orderData.address);
      if (!addressValidation.valid) {
        throw new ValidationError(addressValidation.message);
      }

      // Calculate total
      const totalPrice = orderData.product_price * orderData.quantity;

      const order = await Order.create({
        ...orderData,
        user_id: userId,
        total_price: totalPrice,
        created_at: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: '✅ تم إنشاء الطلب بنجاح',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE ORDER STATUS
  // ============================================
  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { status, notes } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        throw new NotFoundError('الطلب');
      }

      // Check access (seller or admin)
      if (order.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية تحديث حالة هذا الطلب');
      }

      const updated = await Order.updateStatus(
        id,
        status,
        notes || null,
        userId
      );

      res.json({
        success: true,
        message: '✅ تم تحديث حالة الطلب',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 💬 ADD ORDER MESSAGE
  // ============================================
  static async addMessage(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { message, imageUrl } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        throw new NotFoundError('الطلب');
      }

      const isFromAdmin = req.user.isAdmin || false;

      const msg = await Order.addMessage(
        id,
        userId,
        sanitizeInput(message),
        imageUrl || null,
        isFromAdmin
      );

      res.status(201).json({
        success: true,
        message: '✅ تم إرسال الرسالة',
        data: msg,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET ORDER MESSAGES
  // ============================================
  static async getMessages(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const order = await Order.findById(id);
      if (!order) {
        throw new NotFoundError('الطلب');
      }

      // Check access
      if (order.user_id !== userId && order.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية عرض هذه الرسائل');
      }

      const messages = await Order.getMessages(id);

      // Mark messages as read
      await Order.markMessagesAsRead(id, userId);

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET ORDER STATS (Admin only)
  // ============================================
  static async getStats(req, res, next) {
    try {
      const stats = await Order.getStats();
      const revenue = await Order.getRevenue();

      res.json({
        success: true,
        data: {
          ...stats,
          revenue,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE ORDER (Admin only)
  // ============================================
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      await Order.delete(id);

      res.json({
        success: true,
        message: '✅ تم حذف الطلب بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;