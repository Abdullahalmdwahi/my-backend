// ============================================
// 🔐 AUTH MIDDLEWARE - تم إصلاحه ✅
// ============================================

const jwt = require('jsonwebtoken');
const { getSupabaseClient } = require('../config/supabase');

// ============================================
// VERIFY TOKEN MIDDLEWARE
// ============================================
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '⚠️ لا يوجد توكن مصادقة',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '⏰ انتهت صلاحية التوكن',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: '⚠️ توكن غير صالح',
        code: 'INVALID_TOKEN',
      });
    }

    // Get user from database - المعرف هو UUID
    const supabase = getSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id) // مباشرة كـ String (UUID)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '⚠️ المستخدم غير موجود',
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: '⚠️ هذا الحساب معطل',
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في المصادقة',
    });
  }
};

// ============================================
// VERIFY ADMIN MIDDLEWARE
// ============================================
const verifyAdmin = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({
          success: false,
          message: '⚠️ غير مصرح بهذه العملية',
        });
      }
      next();
    });
  } catch (error) {
    console.error('❌ Admin middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في التحقق من الصلاحيات',
    });
  }
};

// ============================================
// VERIFY SUPER ADMIN MIDDLEWARE
// ============================================
const verifySuperAdmin = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: '⚠️ غير مصرح بهذه العملية',
        });
      }
      next();
    });
  } catch (error) {
    console.error('❌ Super admin middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في التحقق من الصلاحيات',
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifySuperAdmin,
};