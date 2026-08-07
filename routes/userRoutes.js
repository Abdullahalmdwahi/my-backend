// ============================================
// 👤 USER ROUTES - نسخة كاملة مع device
// ============================================

const express = require('express');
const router = express.Router(); // ✅ هذا السطر كان مفقوداً
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { getSupabaseClient } = require('../config/supabase');

// ============================================
// PROTECTED ROUTES
// ============================================

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: '❌ المستخدم غير موجود'
      });
    }

    delete user.password;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء جلب الملف الشخصي'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    const supabase = getSupabaseClient();

    delete updates.id;
    delete updates.password;
    delete updates.created_at;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: '⚠️ فشل تحديث البيانات'
      });
    }

    delete user.password;

    res.json({
      success: true,
      message: '✅ تم تحديث البيانات بنجاح',
      data: user
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء تحديث الملف الشخصي'
    });
  }
});

// ✅ @route   POST /api/users/device
// @desc    تسجيل جهاز جديد
// @access  Private
router.post('/device', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId, deviceName, fcmToken } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: '⚠️ deviceId مطلوب'
      });
    }

    const supabase = getSupabaseClient();

    // ✅ التحقق من وجود الجهاز
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (existingDevice) {
      // ✅ تحديث الجهاز الموجود
      const { data, error } = await supabase
        .from('devices')
        .update({
          device_name: deviceName || existingDevice.device_name,
          fcm_token: fcmToken || existingDevice.fcm_token,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDevice.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: '✅ تم تحديث الجهاز بنجاح',
        data
      });
    }

    // ✅ إدراج جهاز جديد
    const { data, error } = await supabase
      .from('devices')
      .insert({
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName || 'Unknown Device',
        fcm_token: fcmToken || null,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: '✅ تم تسجيل الجهاز بنجاح',
      data
    });

  } catch (error) {
    console.error('❌ Device registration error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء تسجيل الجهاز'
    });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // ✅ إزالة كلمات المرور
    const sanitizedUsers = users.map(user => {
      delete user.password;
      return user;
    });

    res.json({
      success: true,
      data: sanitizedUsers
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء جلب المستخدمين'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: '❌ المستخدم غير موجود'
      });
    }

    delete user.password;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء جلب المستخدم'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    // ✅ لا تسمح بحذف نفسك
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '⚠️ لا يمكنك حذف حسابك بنفسك'
      });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: '✅ تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء حذف المستخدم'
    });
  }
});

// @route   POST /api/users/:id/block
// @desc    Block user
// @access  Admin
router.post('/:id/block', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: false,
        blocked_reason: reason || 'تم الحظر من قبل الإدارة',
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: '✅ تم حظر المستخدم بنجاح',
      data
    });
  } catch (error) {
    console.error('❌ Block user error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء حظر المستخدم'
    });
  }
});

// @route   POST /api/users/:id/unblock
// @desc    Unblock user
// @access  Admin
router.post('/:id/unblock', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: true,
        blocked_reason: null,
        blocked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: '✅ تم إلغاء حظر المستخدم بنجاح',
      data
    });
  } catch (error) {
    console.error('❌ Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ أثناء إلغاء حظر المستخدم'
    });
  }
});

module.exports = router; // ✅ تأكد من وجود هذا السطر