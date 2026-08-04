// ============================================
// 🔐 AUTH CONTROLLER - تم إصلاحه ✅
// ============================================

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient } = require('../config/supabase');
const emailService = require('../services/email');
const jwtService = require('../services/jwtService');
const { verifyToken } = require('../middleware/auth');

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
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
// AUTH CONTROLLER - تم إصلاحه ✅
// ============================================

const authController = {
  // ============================================
  // REGISTER - تم إصلاحه للتعامل مع UUID ✅
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

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني وكلمة المرور مطلوبة',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني غير صحيح',
        });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: '⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        });
      }

      const supabase = getSupabaseClient();

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '⚠️ البريد الإلكتروني مسجل بالفعل',
        });
      }

      // Check business name
      if (businessName) {
        const { data: existingBusiness } = await supabase
          .from('users')
          .select('id')
          .eq('business_name', businessName)
          .maybeSingle();

        if (existingBusiness) {
          return res.status(409).json({
            success: false,
            message: '⚠️ هذا الاسم التجاري مستخدم بالفعل',
          });
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user - استخدام UUID
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
        return res.status(500).json({
          success: false,
          message: '❌ فشل إنشاء الحساب',
          error: error.message,
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      // Save OTP
      await supabase.from('verification_tokens').insert({
        email: email,
        token: otp,
        type: 'verification',
        expires_at: otpExpiry.toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      });

      // Send verification email
      await emailService.sendVerificationEmail(email, otp);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Save refresh token
      await supabase.from('refresh_tokens').insert({
        user_id: userId,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      // Remove password from response
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
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء إنشاء الحساب',
        error: error.message,
      });
    }
  },

  // ============================================
  // LOGIN - تم إصلاحه ✅
  // ============================================
  login: async (req, res) => {
    try {
      const { email, password, deviceId, deviceName } = req.body;

      // Validate
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني وكلمة المرور مطلوبة',
        });
      }

      const supabase = getSupabaseClient();

      // Get user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim())
        .maybeSingle();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          message: '⚠️ البريد الإلكتروني أو كلمة المرور غير صحيحة',
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: '⚠️ هذا الحساب معطل، يرجى التواصل مع الدعم',
        });
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '⚠️ البريد الإلكتروني أو كلمة المرور غير صحيحة',
        });
      }

      // Check if user is verified
      if (!user.is_verified) {
        // Send new OTP
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

        return res.status(403).json({
          success: false,
          message: '⚠️ الحساب غير مفعل. تم إرسال رمز التفعيل إلى بريدك الإلكتروني',
          requiresVerification: true,
        });
      }

      // Check device
      const { data: device } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_id', deviceId || 'unknown')
        .maybeSingle();

      if (!device) {
        // New device detected, send OTP
        const otp = generateOTP();
        await supabase.from('verification_tokens').insert({
          email: email,
          token: otp,
          type: 'device_verification',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          is_used: false,
          created_at: new Date().toISOString(),
        });
        await emailService.sendDeviceVerificationEmail(email, otp);

        return res.status(403).json({
          success: false,
          message: '📱 جهاز جديد غير معروف. تم إرسال رمز التحقق إلى بريدك الإلكتروني',
          requiresDeviceVerification: true,
        });
      }

      // Update device last seen
      await supabase
        .from('devices')
        .update({
          last_seen: new Date().toISOString(),
          device_name: deviceName || device.device_name,
        })
        .eq('id', device.id);

      // Update user last login
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Save refresh token
      await supabase.from('refresh_tokens').insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      // Remove password from response
      delete user.password;

      res.json({
        success: true,
        message: '✅ تم تسجيل الدخول بنجاح',
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء تسجيل الدخول',
        error: error.message,
      });
    }
  },

  // ============================================
  // VERIFY - تم إصلاحه ✅
  // ============================================
  verify: async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني والرمز مطلوبان',
        });
      }

      const supabase = getSupabaseClient();

      // Find token
      const { data: token, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', code)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !token) {
        return res.status(400).json({
          success: false,
          message: '❌ رمز التحقق غير صحيح أو منتهي الصلاحية',
        });
      }

      // Mark token as used
      await supabase
        .from('verification_tokens')
        .update({
          is_used: true,
        })
        .eq('id', token.id);

      // Verify user
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
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء التحقق',
        error: error.message,
      });
    }
  },

  // ============================================
  // SEND VERIFICATION
  // ============================================
  sendVerification: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني مطلوب',
        });
      }

      const supabase = getSupabaseClient();

      // Check if user exists
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '⚠️ لا يوجد حساب بهذا البريد الإلكتروني',
        });
      }

      // Generate and save OTP
      const otp = generateOTP();
      await supabase.from('verification_tokens').insert({
        email: email,
        token: otp,
        type: 'verification',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      });

      // Send email
      await emailService.sendVerificationEmail(email, otp);

      res.json({
        success: true,
        message: '✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      });

    } catch (error) {
      console.error('❌ Send verification error:', error);
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء إرسال رمز التحقق',
        error: error.message,
      });
    }
  },

  // ============================================
  // FORGOT PASSWORD
  // ============================================
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: '⚠️ البريد الإلكتروني مطلوب',
        });
      }

      const supabase = getSupabaseClient();

      // Check if user exists
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '⚠️ لا يوجد حساب بهذا البريد الإلكتروني',
        });
      }

      // Generate and save reset token
      const resetToken = generateOTP();
      await supabase.from('verification_tokens').insert({
        email: email,
        token: resetToken,
        type: 'password_reset',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      });

      // Send email
      await emailService.sendPasswordResetEmail(email, resetToken);

      res.json({
        success: true,
        message: '✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      });

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء إرسال رابط إعادة التعيين',
        error: error.message,
      });
    }
  },

  // ============================================
  // RESET PASSWORD
  // ============================================
  resetPassword: async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;

      if (!email || !token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '⚠️ جميع الحقول مطلوبة',
        });
      }

      // Validate password
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: '⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        });
      }

      const supabase = getSupabaseClient();

      // Find token
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
        return res.status(400).json({
          success: false,
          message: '❌ الرمز غير صحيح أو منتهي الصلاحية',
        });
      }

      // Mark token as used
      await supabase
        .from('verification_tokens')
        .update({
          is_used: true,
        })
        .eq('id', resetToken.id);

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await supabase
        .from('users')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      // Delete all refresh tokens
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
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء إعادة تعيين كلمة المرور',
        error: error.message,
      });
    }
  },

  // ============================================
  // REFRESH TOKEN
  // ============================================
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: '⚠️ Refresh token مطلوب',
        });
      }

      const supabase = getSupabaseClient();

      // Validate refresh token
      const { data: tokenData } = await supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token', refreshToken)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!tokenData) {
        return res.status(401).json({
          success: false,
          message: '⚠️ Refresh token غير صالح',
        });
      }

      // Get user
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', tokenData.user_id)
        .single();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '⚠️ المستخدم غير موجود',
        });
      }

      // Delete old refresh token
      await supabase
        .from('refresh_tokens')
        .delete()
        .eq('id', tokenData.id);

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      // Save new refresh token
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
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء تحديث التوكن',
        error: error.message,
      });
    }
  },

  // ============================================
  // LOGOUT
  // ============================================
  logout: async (req, res) => {
    try {
      const userId = req.user?.id;

      if (userId) {
        const supabase = getSupabaseClient();
        // Delete refresh tokens
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
        error: error.message,
      });
    }
  },

  // ============================================
  // GET CURRENT USER
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
        return res.status(404).json({
          success: false,
          message: '⚠️ المستخدم غير موجود',
        });
      }

      delete user.password;

      res.json({
        success: true,
        data: user,
      });

    } catch (error) {
      console.error('❌ Get me error:', error);
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء جلب بيانات المستخدم',
        error: error.message,
      });
    }
  },

  // ============================================
  // UPDATE CURRENT USER
  // ============================================
  updateMe: async (req, res) => {
    try {
      const userId = req.user?.id;
      const updates = req.body;
      const supabase = getSupabaseClient();

      // Remove sensitive fields
      delete updates.id;
      delete updates.password;
      delete updates.created_at;
      delete updates.updated_at;

      // Update user
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
          message: '⚠️ فشل تحديث البيانات',
          error: error.message,
        });
      }

      delete user.password;

      res.json({
        success: true,
        message: '✅ تم تحديث البيانات بنجاح',
        data: user,
      });

    } catch (error) {
      console.error('❌ Update me error:', error);
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء تحديث البيانات',
        error: error.message,
      });
    }
  },

  // ============================================
  // CHANGE PASSWORD
  // ============================================
  changePassword: async (req, res) => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;
      const supabase = getSupabaseClient();

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '⚠️ كلمة المرور الحالية والجديدة مطلوبة',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: '⚠️ كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل',
        });
      }

      // Get current user
      const { data: user } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '⚠️ المستخدم غير موجود',
        });
      }

      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '⚠️ كلمة المرور الحالية غير صحيحة',
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await supabase
        .from('users')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Delete all refresh tokens
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
      res.status(500).json({
        success: false,
        message: '❌ حدث خطأ أثناء تغيير كلمة المرور',
        error: error.message,
      });
    }
  },
};

module.exports = authController;