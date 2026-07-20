// ============================================
// 🚀 خادم تطبيق السوق - مع Gmail SMTP مباشر
// ============================================

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 🔐 إعداد Supabase
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// ⚙️ إعدادات الخادم
// ============================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================
// 📧 إعداد Gmail SMTP (مباشر)
// ============================================
const GMAIL_USER = process.env.GMAIL_USER || 'iiuuyy2021@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS; // dbex aoyh Irdo hhbn

// ✅ إعداد Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ✅ التحقق من اتصال Gmail SMTP عند بدء التشغيل
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ فشل الاتصال بـ Gmail SMTP:', error.message);
  } else {
    console.log('✅ Gmail SMTP متصل بنجاح');
  }
});

// ✅ دالة إرسال إيميل عبر Gmail
async function sendEmailViaGmail(to, subject, html, text) {
  try {
    console.log(`📧 [Gmail SMTP] بدء إرسال إلى: ${to}`);

    const mailOptions = {
      from: `"Sell In" <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [Gmail SMTP] تم الإرسال بنجاح إلى: ${to}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ [Gmail SMTP] فشل الإرسال:', error.message);
    return false;
  }
}

// ============================================
// 🏠 نقطة نهاية اختبار الاتصال
// ============================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 خادم السوق يعمل بنجاح!',
    timestamp: new Date().toISOString()
  });
});

// ✅ نقطة اختبار Gmail SMTP
app.get('/api/email/test', async (req, res) => {
  try {
    if (!GMAIL_USER || !GMAIL_PASS) {
      return res.status(400).json({
        success: false,
        message: '❌ GMAIL_USER أو GMAIL_PASS غير موجود في المتغيرات البيئية',
      });
    }

    const testResult = await sendEmailViaGmail(
      GMAIL_USER,
      '🧪 اختبار Gmail SMTP',
      '<h1>✅ نجاح الاتصال!</h1><p>تم إرسال هذا الإيميل عبر Gmail SMTP مباشرة.</p>'
    );

    if (testResult) {
      res.json({
        success: true,
        message: '✅ Gmail SMTP يعمل بشكل صحيح! تم إرسال إيميل اختبار.',
        config: {
          from: GMAIL_USER,
          hasPassword: !!GMAIL_PASS,
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال إيميل الاختبار، تحقق من كلمة مرور التطبيق',
      });
    }
  } catch (error) {
    console.error('❌ فشل اختبار Gmail SMTP:', error);
    res.status(500).json({
      success: false,
      message: '❌ فشل الاتصال بـ Gmail SMTP',
      error: error.message,
    });
  }
});

// ============================================
// 🔐 1. مجموعة المصادقة (Auth) - مختصرة
// ============================================

// ✅ تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName, deviceId, userTypeId, specializations } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البريد الإلكتروني وكلمة المرور مطلوبة' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
      });
    }
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البريد الإلكتروني مسجل مسبقاً' 
      });
    }
    
    if (businessName) {
      const { data: existingBusiness } = await supabase
        .from('users')
        .select('business_name')
        .eq('business_name', businessName)
        .maybeSingle();
      
      if (existingBusiness) {
        return res.status(400).json({ 
          success: false, 
          message: '❌ الاسم التجاري مستخدم مسبقاً' 
        });
      }
    }
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
          business_name: businessName || '',
          device_id: deviceId || '',
          is_verified: false,
          user_type_id: userTypeId || '1',
          specializations: specializations || []
        }
      }
    });
    
    if (authError) {
      if (authError.message.includes('rate limit')) {
        return res.status(429).json({ 
          success: false, 
          message: '❌ محاولات كثيرة، حاول لاحقاً' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: `❌ فشل التسجيل: ${authError.message}` 
      });
    }
    
    if (!authData.user) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ فشل إنشاء المستخدم' 
      });
    }
    
    const userId = authData.user.id;
    
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        name: name || email.split('@')[0],
        business_name: businessName || '',
        phone: '',
        device_id: deviceId || '',
        is_verified: false,
        free_posts_remaining: 1,
        notifications_remaining: 0,
        role: 'user',
        user_type_id: userTypeId || '1',
        specializations: specializations || [],
        created_at: new Date().toISOString()
      });
    
    if (userError) {
      console.error('❌ فشل إنشاء المستخدم في جدول users:', userError);
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل حفظ بيانات المستخدم' 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم تسجيل المستخدم بنجاح',
      data: {
        id: userId,
        email: email,
        name: name || email.split('@')[0]
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في التسجيل:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البريد الإلكتروني وكلمة المرور مطلوبة' 
      });
    }
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        return res.status(401).json({ 
          success: false, 
          message: '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة' 
        });
      }
      if (authError.message.includes('Email not confirmed')) {
        return res.status(403).json({ 
          success: false, 
          message: '❌ البريد الإلكتروني غير مفعل، تأكد من بريدك' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: `❌ فشل تسجيل الدخول: ${authError.message}` 
      });
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    if (userError || !userData) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ لم يتم العثور على بيانات المستخدم' 
      });
    }
    
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', authData.user.id);
    
    res.json({
      success: true,
      message: '✅ تم تسجيل الدخول بنجاح',
      data: {
        user: userData,
        session: authData.session
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تسجيل الخروج
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: `❌ فشل تسجيل الخروج: ${error.message}` 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم تسجيل الخروج بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الخروج:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ إعادة تعيين كلمة المرور
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البريد الإلكتروني مطلوب' 
      });
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: `❌ فشل إعادة تعيين كلمة المرور: ${error.message}` 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك'
    });
    
  } catch (error) {
    console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 💰 2. مجموعة المدفوعات (Payments) - مختصرة
// ============================================

// ✅ جلب الباقات المتاحة
app.get('/api/payments/subscriptions', async (req, res) => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('duration_days', { ascending: true });
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب الباقات' 
      });
    }
    
    res.json({
      success: true,
      subscriptions: subscriptions || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الباقات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 📧 7. مجموعة الإيميلات (Email) - مع Gmail SMTP
// ============================================

// ✅ إرسال إيميل عام
app.post('/api/email/send', async (req, res) => {
  const startTime = Date.now();
  console.log(`📧 [${new Date().toISOString()}] بدء إرسال إيميل (Gmail SMTP)`);

  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: '❌ البريد الإلكتروني والموضوع مطلوبان',
      });
    }

    console.log(`📧 إلى: ${to}`);
    console.log(`📧 الموضوع: ${subject}`);

    const result = await sendEmailViaGmail(to, subject, html, text);

    const duration = Date.now() - startTime;

    if (result) {
      console.log(`✅ [${new Date().toISOString()}] تم الإرسال في ${duration}ms`);
      res.json({
        success: true,
        message: '✅ تم إرسال الإيميل بنجاح',
        duration: duration,
      });
    } else {
      console.error(`❌ [${new Date().toISOString()}] فشل الإرسال بعد ${duration}ms`);
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال الإيميل، حاول مرة أخرى',
        duration: duration,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${new Date().toISOString()}] خطأ:`, error.message);
    res.status(500).json({
      success: false,
      message: '❌ فشل إرسال الإيميل',
      error: error.message,
    });
  }
});

// ✅ إرسال إيميل التفعيل
app.post('/api/email/send-verification', async (req, res) => {
  try {
    const { to, token } = req.body;

    if (!to || !token) {
      return res.status(400).json({
        success: false,
        message: '❌ البريد الإلكتروني والرمز مطلوبان',
      });
    }

    const subject = '✅ تفعيل حسابك في Sell In';
    const html = buildVerificationEmailHtml(token);

    const result = await sendEmailViaGmail(to, subject, html);

    if (result) {
      res.json({
        success: true,
        message: '✅ تم إرسال إيميل التفعيل بنجاح',
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال إيميل التفعيل',
      });
    }
  } catch (error) {
    console.error('❌ فشل إرسال إيميل التفعيل:', error);
    res.status(500).json({
      success: false,
      message: '❌ فشل إرسال إيميل التفعيل',
    });
  }
});

// ✅ إرسال إيميل إعادة تعيين كلمة المرور
app.post('/api/email/send-password-reset', async (req, res) => {
  try {
    const { to, token } = req.body;

    if (!to || !token) {
      return res.status(400).json({
        success: false,
        message: '❌ البريد الإلكتروني والرمز مطلوبان',
      });
    }

    console.log(`📧 إرسال إعادة تعيين كلمة المرور إلى: ${to}`);

    const subject = '🔐 إعادة تعيين كلمة المرور - Sell In';
    const html = buildPasswordResetEmailHtml(token);

    const result = await sendEmailViaGmail(to, subject, html);

    if (result) {
      res.json({
        success: true,
        message: '✅ تم إرسال إيميل إعادة تعيين كلمة المرور بنجاح',
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال الإيميل، حاول مرة أخرى',
      });
    }
  } catch (error) {
    console.error('❌ فشل إرسال إعادة تعيين كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: '❌ فشل إرسال الإيميل',
    });
  }
});

// ✅ إرسال إيميل التحقق من الجهاز
app.post('/api/email/send-device-verification', async (req, res) => {
  try {
    const { to, token } = req.body;

    if (!to || !token) {
      return res.status(400).json({
        success: false,
        message: '❌ البريد الإلكتروني والرمز مطلوبان',
      });
    }

    const subject = '🔐 رمز التحقق لتسجيل الدخول - Sell In';
    const html = buildDeviceVerificationEmailHtml(token);

    const result = await sendEmailViaGmail(to, subject, html);

    if (result) {
      res.json({
        success: true,
        message: '✅ تم إرسال رمز التحقق بنجاح',
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال رمز التحقق',
      });
    }
  } catch (error) {
    console.error('❌ فشل إرسال رمز التحقق:', error);
    res.status(500).json({
      success: false,
      message: '❌ فشل إرسال رمز التحقق',
    });
  }
});

// ============================================
// 📧 قوالب الإيميلات
// ============================================

function buildVerificationEmailHtml(token) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; padding: 0; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7F1D1D, #991B1B); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .code-box { text-align: center; background: #f8f9fa; padding: 25px; border-radius: 16px; margin: 20px 0; border: 2px dashed #7F1D1D; }
        .code { font-size: 42px; font-weight: bold; color: #7F1D1D; letter-spacing: 8px; font-family: 'Courier New', monospace; background: white; padding: 10px 20px; border-radius: 8px; display: inline-block; }
        .footer { text-align: center; font-size: 12px; color: #999; padding: 20px; border-top: 1px solid #eee; background: #fafafa; }
        .warning { background: #FFF3E0; padding: 15px; border-radius: 12px; margin: 20px 0; border-right: 4px solid #FF9800; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Sell In</h1>
          <p>سوقك الإلكتروني الموثوق</p>
        </div>
        <div class="content">
          <h2 style="color: #7F1D1D;">✅ مرحباً بك في Sell In!</h2>
          <p>شكراً لانضمامك إلى سوقنا الإلكتروني. 🎉</p>
          <div class="code-box">
            <p style="margin-bottom: 12px; color: #666; font-size: 14px;">🔑 رمز التفعيل الخاص بك هو:</p>
            <div class="code">${token}</div>
            <p style="margin-top: 12px; color: #666; font-size: 12px;">أدخل هذا الرمز في التطبيق لتفعيل حسابك</p>
          </div>
          <div class="warning">
            <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ تنبيهات هامة:</p>
            <ul style="margin: 10px 0 0; color: #E65100; font-size: 13px; padding-right: 20px;">
              <li>هذا الرمز صالح لمدة <strong>24 ساعة</strong> فقط</li>
              <li>إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا البريد</li>
              <li>لا تشارك هذا الرمز مع أي شخص آخر</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildPasswordResetEmailHtml(token) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; padding: 0; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7F1D1D, #991B1B); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .code-box { text-align: center; background: #f8f9fa; padding: 25px; border-radius: 16px; margin: 20px 0; border: 2px dashed #7F1D1D; }
        .code { font-size: 42px; font-weight: bold; color: #7F1D1D; letter-spacing: 8px; font-family: 'Courier New', monospace; background: white; padding: 10px 20px; border-radius: 8px; display: inline-block; }
        .footer { text-align: center; font-size: 12px; color: #999; padding: 20px; border-top: 1px solid #eee; background: #fafafa; }
        .warning { background: #FFF3E0; padding: 15px; border-radius: 12px; margin: 20px 0; border-right: 4px solid #FF9800; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Sell In</h1>
          <p>سوقك الإلكتروني الموثوق</p>
        </div>
        <div class="content">
          <h2 style="color: #7F1D1D;">🔐 إعادة تعيين كلمة المرور</h2>
          <p>مرحباً،</p>
          <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>Sell In</strong>.</p>
          <div class="code-box">
            <p style="margin-bottom: 12px; color: #666; font-size: 14px;">📱 رمز التحقق الخاص بك هو:</p>
            <div class="code">${token}</div>
            <p style="margin-top: 12px; color: #666; font-size: 12px;">أدخل هذا الرمز في التطبيق لإعادة تعيين كلمة المرور</p>
          </div>
          <div class="warning">
            <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ تنبيهات هامة:</p>
            <ul style="margin: 10px 0 0; color: #E65100; font-size: 13px; padding-right: 20px;">
              <li>هذا الرمز صالح لمدة <strong>24 ساعة</strong> فقط</li>
              <li>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد</li>
              <li>لا تشارك هذا الرمز مع أي شخص آخر</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildDeviceVerificationEmailHtml(token) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; padding: 0; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7F1D1D, #991B1B); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .code-box { text-align: center; background: #f8f9fa; padding: 25px; border-radius: 16px; margin: 20px 0; border: 2px dashed #7F1D1D; }
        .code { font-size: 42px; font-weight: bold; color: #7F1D1D; letter-spacing: 8px; font-family: 'Courier New', monospace; background: white; padding: 10px 20px; border-radius: 8px; display: inline-block; }
        .warning { background: #FFF3E0; padding: 15px; border-radius: 12px; margin: 20px 0; border-right: 4px solid #FF9800; }
        .footer { text-align: center; font-size: 12px; color: #999; padding: 20px; border-top: 1px solid #eee; background: #fafafa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Sell In</h1>
          <p>سوقك الإلكتروني الموثوق</p>
        </div>
        <div class="content">
          <h2 style="color: #7F1D1D;">🔐 التحقق من جهاز جديد</h2>
          <p>مرحباً،</p>
          <p>تم طلب تسجيل الدخول إلى حسابك من جهاز جديد.</p>
          <div class="code-box">
            <p style="margin-bottom: 12px; color: #666; font-size: 14px;">🔑 رمز التحقق الخاص بك هو:</p>
            <div class="code">${token}</div>
            <p style="margin-top: 12px; color: #666; font-size: 12px;">أدخل هذا الرمز في التطبيق لتأكيد الجهاز</p>
          </div>
          <div class="warning">
            <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط</p>
            <p style="margin: 5px 0 0; color: #E65100; font-size: 13px;">🔒 إذا لم تكن أنت من حاول تسجيل الدخول، يرجى تغيير كلمة المرور فوراً.</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// 📊 8. مجموعة المدير (Admin) - مختصرة
// ============================================

// ✅ إحصائيات النظام
app.get('/api/admin/stats', async (req, res) => {
  try {
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    const today = new Date().toISOString().split('T')[0];
    const { count: todayOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);
    
    const { data: revenue } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed');
    
    const totalRevenue = revenue?.reduce((sum, r) => sum + r.amount, 0) || 0;
    
    const { count: activeSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    res.json({
      success: true,
      stats: {
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        todayOrders: todayOrders || 0,
        totalRevenue: totalRevenue,
        activeSubscriptions: activeSubscriptions || 0
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب قائمة المستخدمين (للمدير)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المستخدمين' 
      });
    }
    
    res.json({
      success: true,
      users: users || [],
      count: users?.length || 0
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المستخدمين:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب جميع المعاملات (للمدير)
app.get('/api/admin/transactions', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المعاملات' 
      });
    }
    
    res.json({
      success: true,
      transactions: transactions || [],
      count: transactions?.length || 0
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المعاملات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 🚀 تشغيل الخادم
// ============================================
app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📧 Gmail SMTP: ${GMAIL_USER ? '✅ تم الإعداد' : '❌ مفقود'}`);
  console.log(`📧 كلمة المرور: ${GMAIL_PASS ? '✅ موجودة' : '❌ مفقودة'}`);
});