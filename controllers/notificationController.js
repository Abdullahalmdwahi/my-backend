// ============================================
// 📱 NOTIFICATION CONTROLLER - جديد ✅
// ============================================

const NotificationService = require('../services/notificationService');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId } = require('../utils/validators');

class NotificationController {
  // ============================================
  // 📋 GET USER NOTIFICATIONS
  // ============================================
  static async getNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 50, unreadOnly = false } = req.query;

      const notifications = await NotificationService.getUserNotifications(userId, {
        limit: parseInt(limit),
        unreadOnly: unreadOnly === 'true',
      });

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET UNREAD COUNT
  // ============================================
  static async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;

      const count = await NotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ MARK AS READ
  // ============================================
  static async markAsRead(req, res, next) {
    try {
      const { id } = req.params;

      await NotificationService.markAsRead(id);

      res.json({
        success: true,
        message: '✅ تم تحديد الإشعار كمقروء',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ MARK ALL AS READ
  // ============================================
  static async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;

      await NotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: '✅ تم تحديد جميع الإشعارات كمقروءة',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE NOTIFICATION
  // ============================================
  static async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;

      await NotificationService.deleteNotification(id);

      res.json({
        success: true,
        message: '✅ تم حذف الإشعار',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE ALL NOTIFICATIONS
  // ============================================
  static async deleteAllNotifications(req, res, next) {
    try {
      const userId = req.user.id;

      await NotificationService.deleteAllForUser(userId);

      res.json({
        success: true,
        message: '✅ تم حذف جميع الإشعارات',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📱 SEND TO USER (Admin only)
  // ============================================
  static async sendToUser(req, res, next) {
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
  // 📱 SEND GLOBAL (Admin only)
  // ============================================
  static async sendGlobal(req, res, next) {
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
  // 📋 GET GLOBAL NOTIFICATIONS (Admin only)
  // ============================================
  static async getGlobalNotifications(req, res, next) {
    try {
      const { limit = 50 } = req.query;

      const notifications = await NotificationService.getGlobalNotifications({
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;