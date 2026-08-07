// ============================================
// 🔐 AUTH CONTROLLER - النسخة المُصلحة
// ============================================

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient } = require('../config/supabase');
const emailService = require('../services/email');
const jwtService = require('../services/jwtService');
const { AppError, ValidationError, AuthError, ConflictError } = require('../middleware/errorHandler');

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateTokens = (user) => {
  const accessToken = jwtService.generateAccessToken(user);
  const refreshToken = jwtService.generateRefreshToken(user);
  return { accessToken, refreshToken };
};

// ============================================
// 🎯 AUTH CONTROLLER
// ============================================

const authController = {

  // ============================================
  // 📝 REGISTER
  // ============================================
  register: async (req, res) => {
    try {
      const {
        email,
        password,
        businessName,
        userTypeId,
        specializations = [],
        deviceId,
        deviceName,
      } = req.body;

      if (!email || !password) {
        throw new ValidationError('⚠️ البريد الإلكتروني وكلمة المرور مطلوبة');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('⚠️ البريد الإلكتروني غير صحيح');
      }

      if (password.length < 6) {
        throw new ValidationError('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      }

      const supabase = getSupabaseClient();

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        throw new ConflictError('⚠️ البريد الإلكتروني مسجل بالفعل');
      }

      if (businessName) {
        const { data: existingBusiness } = await supabase
          .from('users')
          .select('id')
          .eq('business_name', businessName)
          .maybeSingle();

        if (existingBusiness) {
          throw new ConflictError('⚠️ هذا الاسم التجاري مستخدم بالفعل');
        }
      }

      const hashedPassword = await hashPassword(password);

      const userId = uuidv4();
      const userData = {
        id: userId,
        email: email.trim(),
        password: hashedPassword,
        business_name: businessName || '',
        user_type_id: userTypeId || '1',
        specializations: specializations,
        device_id: deviceId || 'unknown',
        device_name: deviceName || 'Unknown Device',
        role: 'user',
        is_verified: false,
        is_active: true,
        free_posts_remaining: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: user, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        console.error('❌ User creation error:', error);
        throw new AppError('❌ فشل إنشاء الحساب', 500, 'DB_ERROR');
      }

      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from('verification_tokens').insert({
        email: email,
        token: otp,
        type: 'verification',
        expires_at: otpExpiry.toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      });

      await emailService.sendVerificationEmail(email, otp);

      const { accessToken, refreshToken } = generateTokens(user);

      await supabase.from('refresh_tokens').insert({
        user_id: userId,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      delete user.password;

      res.status(201).json({
        success: true,
        message: '✅ تم إنشاء الحساب بنجاح',
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });

    } catch (error) {
      console.error('❌ Register error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء إنشاء الحساب',
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  },

  // ============================================
  // 🔑 LOGIN
  // ============================================
  login: async (req, res) => {
    try {
      console.log('🔐 [LOGIN] Request received');
      
      const { email, password, deviceId, deviceName } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني وكلمة المرور مطلوبة'
        });
      }

      console.log(`✅ [LOGIN] محاولة للمستخدم: ${email}`);

      const supabase = getSupabaseClient();

      // ✅ Step 1: Authenticate via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError || !authData?.user) {
        console.error('❌ [LOGIN] فشل المصادقة:', authError);
        
        if (authError?.message?.includes('Email not confirmed')) {
          return res.status(403).json({
            success: false,
            message: '⚠️ الحساب غير مفعل. يرجى التحقق من بريدك الإلكتروني',
            requiresVerification: true,
            code: 'ACCOUNT_NOT_VERIFIED'
          });
        }

        return res.status(401).json({
          success: false,
          message: '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
      }

      const authUser = authData.user;
      console.log(`✅ [LOGIN] تم المصادقة بنجاح: ${authUser.id}`);

      // ✅ Step 2: Get user data from users table
      let userData = {};
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (!userError && user) {
          userData = user;
        }
      } catch (err) {
        console.warn('⚠️ [LOGIN] فشل جلب بيانات إضافية:', err.message);
      }

      // ✅ Step 3: Merge data
      const user = {
        id: authUser.id,
        email: authUser.email,
        name: userData.name || authUser.email?.split('@')[0] || 'مستخدم',
        business_name: userData.business_name || '',
        phone: userData.phone || '',
        role: userData.role || 'user',
        is_verified: authUser.email_confirmed_at != null,
        free_posts_remaining: userData.free_posts_remaining ?? 1,
        is_active: userData.is_active !== false,
        created_at: userData.created_at || authUser.created_at,
        last_login_at: new Date().toISOString(),
        full_name: userData.full_name || null,
        national_id: userData.national_id || null,
        wallet_phone: userData.wallet_phone || null,
        display_phone: userData.display_phone || null,
        user_type_id: userData.user_type_id || '1',
        specializations: userData.specializations || [],
      };

      // ✅ Step 4: Check if account is active
      if (user.is_active === false) {
        return res.status(403).json({
          success: false,
          message: '⚠️ هذا الحساب معطل، يرجى التواصل مع الدعم',
          code: 'ACCOUNT_DISABLED'
        });
      }

      // ✅ Step 5: Device verification
      const deviceIdToCheck = deviceId || 'unknown';
      const { data: device } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_id', deviceIdToCheck)
        .maybeSingle();

      if (!device) {
        const otp = generateOTP();
        
        await supabase.from('verification_tokens').insert({
          email: email,
          token: otp,
          type: 'device_verification',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          is_used: false,
          created_at: new Date().toISOString(),
        });
        
        console.log(`📧 محاولة إرسال بريد تحقق الجهاز إلى ${email}`);
        const emailResult = await emailService.sendDeviceVerificationEmail(email, otp);
        
        if (emailResult.success && !emailResult.simulated) {
          console.log(`✅ تم إرسال رمز التحقق إلى ${email}`);
        } else {
          console.warn(`⚠️ تم استخدام المحاكاة لإرسال رمز التحقق إلى ${email}`);
          console.log(`📧 [محاكاة] رمز التحقق: ${otp}`);
        }

        return res.status(403).json({
          success: false,
          message: '📱 جهاز جديد غير معروف. تم إرسال رمز التحقق إلى بريدك الإلكتروني',
          requiresDeviceVerification: true,
          code: 'NEW_DEVICE_DETECTED',
          email: email,
          ...(emailResult.simulated && { 
            debug_code: otp,
            debug_message: '⚠️ وضع المحاكاة: استخدم هذا الرمز للتحقق'
          })
        });
      }

      // ✅ Step 6: Update device last seen
      await supabase
        .from('devices')
        .update({
          last_seen: new Date().toISOString(),
          device_name: deviceName || device.device_name,
        })
        .eq('id', device.id);

      // ✅ Step 7: Update user last login
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // ✅ Step 8: Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      await supabase.from('refresh_tokens').insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      delete user.password;

      console.log(`✅ [LOGIN] تسجيل دخول ناجح للمستخدم: ${email}`);

      return res.json({
        success: true,
        message: '✅ تم تسجيل الدخول بنجاح',
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });

    } catch (error) {
      console.error('❌ [LOGIN] خطأ غير متوقع:', error);
      return res.status(500).json({
        success: false,
        message: '❌ حدث خطأ في الخادم: ' + (error.message || 'غير معروف'),
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  },

  // ============================================
  // ✅ VERIFY DEVICE - المُضافة حديثاً
  // ============================================
  verifyDevice: async (req, res) => {
    try {
      const { email, code, deviceId, deviceName } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني والرمز مطلوبان'
        });
      }

      const supabase = getSupabaseClient();

      // ✅ التحقق من الرمز
      const { data: token, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', code)
        .eq('type', 'device_verification')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !token) {
        return res.status(400).json({
          success: false,
          message: '❌ رمز التحقق غير صحيح أو منتهي الصلاحية'
        });
      }

      // ✅ الحصول على المستخدم
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '❌ المستخدم غير موجود'
        });
      }

      // ✅ تسجيل الجهاز
      const deviceIdToRegister = deviceId || 'verified-device';
      await supabase
        .from('devices')
        .insert({
          user_id: user.id,
          device_id: deviceIdToRegister,
          device_name: deviceName || 'Verified Device',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      // ✅ تحديث الرمز كمستخدم
      await supabase
        .from('verification_tokens')
        .update({ is_used: true })
        .eq('id', token.id);

      return res.json({
        success: true,
        message: '✅ تم التحقق من الجهاز بنجاح',
        data: {
          deviceId: deviceIdToRegister,
          deviceName: deviceName || 'Verified Device',
        }
      });

    } catch (error) {
      console.error('❌ [VERIFY_DEVICE] خطأ:', error);
      return res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء التحقق من الجهاز'
      });
    }
  },

  // ============================================
  // ✅ VERIFY
  // ============================================
  verify: async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        throw new ValidationError('⚠️ البريد الإلكتروني والرمز مطلوبان');
      }

      const supabase = getSupabaseClient();

      const { data: token, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', code)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !token) {
        throw new ValidationError('❌ رمز التحقق غير صحيح أو منتهي الصلاحية');
      }

      await supabase
        .from('verification_tokens')
        .update({ is_used: true })
        .eq('id', token.id);

      await supabase
        .from('users')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq('email', email);

      res.json({
        success: true,
        message: '✅ تم التحقق بنجاح',
      });

    } catch (error) {
      console.error('❌ Verify error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء التحقق',
      });
    }
  },

  // ============================================
  // 📧 SEND VERIFICATION
  // ============================================
  sendVerification: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('⚠️ البريد الإلكتروني مطلوب');
      }

      const supabase = getSupabaseClient();

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      const otp = generateOTP();
      await supabase.from('verification_tokens').insert({
        email: email,
        token: otp,
        type: 'verification',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      });

      await emailService.sendVerificationEmail(email, otp);

      res.json({
        success: true,
        message: '✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      });

    } catch (error) {
      console.error('❌ Send verification error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء إرسال رمز التحقق',
      });
    }
  },

  // ============================================
  // 🔄 REFRESH TOKEN
  // ============================================
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('⚠️ Refresh token مطلوب');
      }

      const supabase = getSupabaseClient();

      const { data: tokenData } = await supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token', refreshToken)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!tokenData) {
        throw new AuthError('⚠️ Refresh token غير صالح');
      }

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', tokenData.user_id)
        .single();

      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      await supabase
        .from('refresh_tokens')
        .delete()
        .eq('id', tokenData.id);

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      await supabase.from('refresh_tokens').insert({
        user_id: user.id,
        token: newRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });

    } catch (error) {
      console.error('❌ Refresh token error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء تحديث التوكن',
      });
    }
  },

  // ============================================
  // 🚪 LOGOUT
  // ============================================
  logout: async (req, res) => {
    try {
      const userId = req.user?.id;

      if (userId) {
        const supabase = getSupabaseClient();
        await supabase
          .from('refresh_tokens')
          .delete()
          .eq('user_id', userId);
      }

      res.json({
        success: true,
        message: '✅ تم تسجيل الخروج بنجاح',
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء تسجيل الخروج',
      });
    }
  },

  // ============================================
  // 👤 GET ME
  // ============================================
  getMe: async (req, res) => {
    try {
      const userId = req.user?.id;
      const supabase = getSupabaseClient();

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new NotFoundError('المستخدم');
      }

      delete user.password;

      res.json({
        success: true,
        data: user,
      });

    } catch (error) {
      console.error('❌ Get me error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء جلب بيانات المستخدم',
      });
    }
  },

  // ============================================
  // ✏️ UPDATE ME
  // ============================================
  updateMe: async (req, res) => {
    try {
      const userId = req.user?.id;
      const updates = req.body;
      const supabase = getSupabaseClient();

      delete updates.id;
      delete updates.password;
      delete updates.created_at;
      delete updates.updated_at;

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
        throw new AppError('⚠️ فشل تحديث البيانات', 400, 'UPDATE_ERROR');
      }

      delete user.password;

      res.json({
        success: true,
        message: '✅ تم تحديث البيانات بنجاح',
        data: user,
      });

    } catch (error) {
      console.error('❌ Update me error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء تحديث البيانات',
      });
    }
  },

  // ============================================
  // 🔑 CHANGE PASSWORD
  // ============================================
  changePassword: async (req, res) => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;
      const supabase = getSupabaseClient();

      if (!currentPassword || !newPassword) {
        throw new ValidationError('⚠️ كلمة المرور الحالية والجديدة مطلوبة');
      }

      if (newPassword.length < 6) {
        throw new ValidationError('⚠️ كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      }

      const { data: user } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new AuthError('⚠️ كلمة المرور الحالية غير صحيحة');
      }

      const hashedPassword = await hashPassword(newPassword);

      await supabase
        .from('users')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      await supabase
        .from('refresh_tokens')
        .delete()
        .eq('user_id', userId);

      res.json({
        success: true,
        message: '✅ تم تغيير كلمة المرور بنجاح',
      });

    } catch (error) {
      console.error('❌ Change password error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء تغيير كلمة المرور',
      });
    }
  },

  // ============================================
  // 🔓 FORGOT PASSWORD
  // ============================================
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('⚠️ البريد الإلكتروني مطلوب');
      }

      const supabase = getSupabaseClient();

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      const resetToken = generateOTP();
      await supabase.from('verification_tokens').insert({
        email: email,
        token: resetToken,
        type: 'password_reset',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      });

      await emailService.sendPasswordResetEmail(email, resetToken);

      res.json({
        success: true,
        message: '✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      });

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء إرسال رابط إعادة التعيين',
      });
    }
  },

  // ============================================
  // 🔄 RESET PASSWORD
  // ============================================
  resetPassword: async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;

      if (!email || !token || !newPassword) {
        throw new ValidationError('⚠️ جميع الحقول مطلوبة');
      }

      if (newPassword.length < 6) {
        throw new ValidationError('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      }

      const supabase = getSupabaseClient();

      const { data: resetToken, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', token)
        .eq('type', 'password_reset')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !resetToken) {
        throw new ValidationError('❌ الرمز غير صحيح أو منتهي الصلاحية');
      }

      await supabase
        .from('verification_tokens')
        .update({ is_used: true })
        .eq('id', resetToken.id);

      const hashedPassword = await hashPassword(newPassword);

      await supabase
        .from('users')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      await supabase
        .from('refresh_tokens')
        .delete()
        .eq('user_id', resetToken.user_id);

      res.json({
        success: true,
        message: '✅ تم إعادة تعيين كلمة المرور بنجاح',
      });

    } catch (error) {
      console.error('❌ Reset password error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '❌ حدث خطأ أثناء إعادة تعيين كلمة المرور',
      });
    }
  },
};

module.exports = authController;