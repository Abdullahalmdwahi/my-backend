// ============================================
// 💳 WALLET CONTROLLER - جديد ✅
// ============================================

const { Wallet } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');

class WalletController {
  // ============================================
  // 📋 GET WALLET TYPES
  // ============================================
  static async getTypes(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.walletTypes)
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
  // 📋 GET USER WALLETS
  // ============================================
  static async getUserWallets(req, res, next) {
    try {
      const userId = req.user.id;

      const wallets = await Wallet.getUserWallets(userId);

      res.json({
        success: true,
        data: wallets,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 💰 GET BALANCE
  // ============================================
  static async getBalance(req, res, next) {
    try {
      const userId = req.user.id;

      const balance = await Wallet.getUserBalance(userId);

      res.json({
        success: true,
        data: { balance },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET TRANSACTIONS
  // ============================================
  static async getTransactions(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 50, type, status } = req.query;

      const transactions = await Wallet.getUserTransactions(userId, {
        limit: parseInt(limit),
        type,
        status,
        orderBy: 'created_at',
        ascending: false,
      });

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ➕ ADD BALANCE
  // ============================================
  static async addBalance(req, res, next) {
    try {
      const userId = req.user.id;
      const { amount, walletId, description, referenceId } = req.body;

      if (!amount || amount <= 0) {
        throw new ValidationError('⚠️ المبلغ يجب أن يكون أكبر من صفر');
      }

      const result = await Wallet.addBalance(userId, amount, {
        walletId,
        description,
        referenceId,
      });

      res.json({
        success: true,
        message: '✅ تم إضافة الرصيد بنجاح',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🔑 GENERATE CODE
  // ============================================
  static async generateCode(req, res, next) {
    try {
      const userId = req.user.id;
      const { walletId, amount, purpose } = req.body;

      if (!walletId) {
        throw new ValidationError('⚠️ معرف المحفظة مطلوب');
      }

      if (!amount || amount <= 0) {
        throw new ValidationError('⚠️ المبلغ يجب أن يكون أكبر من صفر');
      }

      const code = await Wallet.generateCode(userId, walletId, amount, purpose);

      res.json({
        success: true,
        message: '✅ تم إنشاء الكود بنجاح',
        data: code,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ VERIFY CODE
  // ============================================
  static async verifyCode(req, res, next) {
    try {
      const userId = req.user.id;
      const { code, walletId, expectedAmount, purpose } = req.body;

      if (!code || !walletId) {
        throw new ValidationError('⚠️ الكود ومعرف المحفظة مطلوبان');
      }

      const result = await Wallet.verifyCode(userId, code, walletId, {
        expectedAmount,
        purpose,
      });

      res.json({
        success: true,
        message: '✅ تم التحقق من الكود بنجاح',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🔄 USE CODE
  // ============================================
  static async useCode(req, res, next) {
    try {
      const userId = req.user.id;
      const { codeId, referenceId } = req.body;

      if (!codeId) {
        throw new ValidationError('⚠️ معرف الكود مطلوب');
      }

      const result = await Wallet.useCode(userId, codeId, referenceId);

      res.json({
        success: true,
        message: '✅ تم استخدام الكود بنجاح',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET ALL WALLETS (Admin only)
  // ============================================
  static async getAllWallets(req, res, next) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.wallets)
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
  // ➕ CREATE WALLET (Admin only)
  // ============================================
  static async createWallet(req, res, next) {
    try {
      const walletData = req.body;

      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.wallets)
        .insert({
          ...walletData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        message: '✅ تم إنشاء المحفظة بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE WALLET (Admin only)
  // ============================================
  static async updateWallet(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.wallets)
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
        message: '✅ تم تحديث المحفظة بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE WALLET (Admin only)
  // ============================================
  static async deleteWallet(req, res, next) {
    try {
      const { id } = req.params;

      const client = getSupabaseClient();
      const { error } = await client
        .from(TABLES.wallets)
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: '✅ تم حذف المحفظة بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WalletController;