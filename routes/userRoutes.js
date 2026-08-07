// ============================================
// 📱 DEVICE ROUTES
// ============================================

// @route   POST /api/users/device
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