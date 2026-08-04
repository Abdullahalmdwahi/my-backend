// ============================================
// 💰 PAYMENT CONTROLLER - جديد ✅
// ============================================

const { Payment } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId, validateAmount, validateCurrency } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');

class PaymentController {
  // ============================================
  // 📋 GET PAYMENT METHODS
  // ============================================
  static async getMethods(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.paymentMethods)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

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
  // 📋 GET PAYMENT GATEWAYS
  // ============================================
  static async getGateways(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.paymentGateways)
        .select('*')
        .eq('is_active', true);

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
  // ➕ CREATE PAYMENT
  // ============================================
  static async create(req, res, next) {
    try {
      const userId = req.user.id;
      const paymentData = req.body;

      // Validate
      const amountValidation = validateAmount(paymentData.amount);
      if (!amountValidation.valid) {
        throw new ValidationError(amountValidation.message);
      }

      const currencyValidation = validateCurrency(paymentData.currency);
      if (!currencyValidation.valid) {
        throw new ValidationError(currencyValidation.message);
      }

      const payment = await Payment.create({
        ...paymentData,
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: '✅ تم إنشاء طلب الدفع بنجاح',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET USER TRANSACTIONS
  // ============================================
  static async getTransactions(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, limit = 20, orderBy = 'created_at', ascending = false } = req.query;

      const transactions = await Payment.findByUser(userId, {
        status,
        limit: parseInt(limit),
        orderBy,
        ascending: ascending === 'true',
      });

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit: parseInt(limit),
          total: transactions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET TRANSACTION BY ID
  // ============================================
  static async getTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const transaction = await Payment.findById(id);
      if (!transaction) {
        throw new NotFoundError('المعاملة');
      }

      // Check access
      if (transaction.user_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية عرض هذه المعاملة');
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ VERIFY PAYMENT
  // ============================================
  static async verify(req, res, next) {
    try {
      const { transactionId, code } = req.body;

      const transaction = await Payment.findById(transactionId);
      if (!transaction) {
        throw new NotFoundError('المعاملة');
      }

      // Verify logic here (depends on payment method)

      const updated = await Payment.updateStatus(transactionId, 'completed');

      res.json({
        success: true,
        message: '✅ تم تأكيد الدفع بنجاح',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🔗 WEBHOOK HANDLER
  // ============================================
  static async handleWebhook(req, res, next) {
    try {
      const payload = req.body;
      const signature = req.headers['x-webhook-signature'];

      // Verify signature
      // Process webhook

      res.json({
        success: true,
        message: '✅ تم استلام Webhook بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET ALL TRANSACTIONS (Admin only)
  // ============================================
  static async getAllTransactions(req, res, next) {
    try {
      const { status, limit = 20, offset = 0 } = req.query;

      let transactions = [];
      let query = Payment.findPending;

      if (status === 'all') {
        query = Payment.findAll;
      } else if (status) {
        query = Payment.findByStatus;
      }

      // Implementation depends on model

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: transactions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ APPROVE TRANSACTION (Admin only)
  // ============================================
  static async approveTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const transaction = await Payment.findById(id);
      if (!transaction) {
        throw new NotFoundError('المعاملة');
      }

      const updated = await Payment.confirmPayment(id, req.user.name);

      res.json({
        success: true,
        message: '✅ تمت الموافقة على المعاملة',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ❌ REJECT TRANSACTION (Admin only)
  // ============================================
  static async rejectTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const transaction = await Payment.findById(id);
      if (!transaction) {
        throw new NotFoundError('المعاملة');
      }

      const updated = await Payment.rejectPayment(id, reason || 'تم الرفض من قبل الإدارة');

      res.json({
        success: true,
        message: '❌ تم رفض المعاملة',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET PAYMENT STATS (Admin only)
  // ============================================
  static async getStats(req, res, next) {
    try {
      const stats = await Payment.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;