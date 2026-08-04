// ============================================
// 👤 USER CONTROLLER - معدل ✅
// ============================================

const { User } = require('../models');
const { AuthError, NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');

class UserController {
  // ============================================
  // 📋 GET ALL USERS (Admin only)
  // ============================================
  static async getAll(req, res, next) {
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
  // 👤 GET USER BY ID
  // ============================================
  static async getById(req, res, next) {
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

      // Remove sensitive data
      delete user.password;
      delete user.verification_token;

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 👤 GET CURRENT USER PROFILE
  // ============================================
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const profile = await User.getProfile(userId);
      if (!profile) {
        throw new NotFoundError('المستخدم');
      }

      // Remove sensitive data
      delete profile.password;
      delete profile.verification_token;

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE CURRENT USER
  // ============================================
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Sanitize
      const sanitized = {};
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeInput(value);
        } else {
          sanitized[key] = value;
        }
      }

      // Don't allow updating sensitive fields
      delete sanitized.id;
      delete sanitized.password;
      delete sanitized.email;
      delete sanitized.role;
      delete sanitized.created_at;
      delete sanitized.updated_at;

      const user = await User.update(userId, sanitized);
      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      delete user.password;
      delete user.verification_token;

      res.json({
        success: true,
        message: '✅ تم تحديث البيانات بنجاح',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🔑 CHANGE PASSWORD
  // ============================================
  static async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('كلمة المرور الحالية والجديدة مطلوبة');
      }

      if (newPassword.length < 6) {
        throw new ValidationError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      const isValid = await User.verifyPassword(user, currentPassword);
      if (!isValid) {
        throw new AuthError('⚠️ كلمة المرور الحالية غير صحيحة', 401);
      }

      await User.update(userId, { password: newPassword });

      res.json({
        success: true,
        message: '✅ تم تغيير كلمة المرور بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📋 GET USER SPECIALIZATIONS
  // ============================================
  static async getSpecializations(req, res, next) {
    try {
      const userId = req.params.id || req.user.id;

      const specializations = await User.getSpecializations(userId);

      res.json({
        success: true,
        data: specializations,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE USER SPECIALIZATIONS
  // ============================================
  static async updateSpecializations(req, res, next) {
    try {
      const userId = req.user.id;
      const { specializations } = req.body;

      if (!Array.isArray(specializations)) {
        throw new ValidationError('التخصصات يجب أن تكون مصفوفة');
      }

      const user = await User.updateSpecializations(userId, specializations);

      res.json({
        success: true,
        message: '✅ تم تحديث التخصصات بنجاح',
        data: user.specializations,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET USER STATS
  // ============================================
  static async getStats(req, res, next) {
    try {
      const userId = req.params.id || req.user.id;

      const stats = await User.getStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE USER (Admin only)
  // ============================================
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const validation = validateId(id);
      if (!validation.valid) {
        throw new ValidationError(validation.message);
      }

      // Don't allow deleting self
      if (id === req.user.id) {
        throw new ValidationError('لا يمكنك حذف حسابك بنفسك');
      }

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
  // 🚫 BLOCK USER (Admin only)
  // ============================================
  static async block(req, res, next) {
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
  // ✅ UNBLOCK USER (Admin only)
  // ============================================
  static async unblock(req, res, next) {
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
}

module.exports = UserController;