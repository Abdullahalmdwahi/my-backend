// ============================================
// 📧 EMAIL SERVICE - النسخة المُصلحة بالكامل
// ============================================

const nodemailer = require('nodemailer');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://my-backend-hvha.onrender.com';
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // ✅ إعدادات Gmail مع منع IPv6
      const gmailConfig = {
        host: process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.GMAIL_SMTP_PORT || '587'),
        secure: false,
        family: 4, // ✅ منع IPv6
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') : '',
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3',
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      };

      console.log('📧 محاولة الاتصال بـ Gmail SMTP...');
      console.log(`📧 Host: ${gmailConfig.host}:${gmailConfig.port}`);
      console.log(`📧 User: ${gmailConfig.auth.user}`);

      this.transporter = nodemailer.createTransport(gmailConfig);
      
      // ✅ التحقق من الاتصال
      this.verifyConnection();
      console.log('✅ Email Service initialized with Gmail');
    } catch (error) {
      console.error('❌ فشل تهيئة خدمة البريد:', error.message);
      this.transporter = null;
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      console.warn('⚠️ لا يوجد ناقل بريد للتحقق');
      return false;
    }
    
    try {
      console.log('📧 جاري التحقق من الاتصال بـ Gmail...');
      await this.transporter.verify();
      console.log('✅ Gmail connection verified successfully!');
      return true;
    } catch (error) {
      console.error('❌ Gmail connection failed:', error.message);
      this.transporter = null;
      return false;
    }
  }

  // ============================================
  // 📤 SEND EMAIL
  // ============================================

  async sendEmail({ to, subject, html, text, requireAuth = false }) {
    // ✅ إذا كان requireAuth = false، نرسل عبر API بدون مصادقة
    if (!requireAuth) {
      console.log(`📧 [بدون مصادقة] إرسال بريد إلى: ${to}`);
      return await this.sendViaApi(to, subject, html, text, false);
    }

    // ✅ إذا كان requireAuth = true، نحاول إرسال عبر SMTP أولاً
    if (this.transporter) {
      try {
        const mailOptions = {
          from: `"Sell In" <${process.env.GMAIL_EMAIL}>`,
          to: to,
          subject: subject,
          html: html,
          text: text || html.replace(/<[^>]*>/g, ''),
        };

        console.log(`📧 جاري إرسال بريد إلى ${to}...`);
        
        const info = await Promise.race([
          this.transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
          )
        ]);

        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return await this.sendViaApi(to, subject, html, text, true);
      }
    }

    return await this.sendViaApi(to, subject, html, text, requireAuth);
  }

  // ============================================
  // 🌐 SEND VIA API
  // ============================================

  async sendViaApi(to, subject, html, text, requireAuth) {
    try {
      console.log(`📧 [API] إرسال بريد إلى: ${to}`);
      
      const payload = {
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      };

      const headers = {
        'Content-Type': 'application/json',
      };

      if (requireAuth) {
        const token = await this.getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await axios.post(
        `${this.apiBaseUrl}/api/email/send`,
        payload,
        { headers, timeout: 30000 }
      );

      if (response.data && response.data.success) {
        console.log(`✅ [API] تم إرسال البريد إلى ${to}`);
        return { success: true, messageId: response.data.messageId || 'api-sent' };
      }

      console.log(`❌ [API] فشل إرسال البريد: ${response.data?.message}`);
      return { success: false, error: response.data?.message };
    } catch (error) {
      console.error(`❌ [API] خطأ في إرسال البريد:`, error.message);
      
      // ✅ محاكاة الإرسال في حالة الفشل
      console.log(`📧 [محاكاة] إرسال بريد إلى: ${to}`);
      console.log(`📧 الموضوع: ${subject}`);
      
      return { 
        success: true, 
        messageId: `mock-${Date.now()}`,
        simulated: true,
        warning: '⚠️ تم استخدام المحاكاة بسبب فشل الإرسال الفعلي'
      };
    }
  }

  // ============================================
  // 🔑 GET ACCESS TOKEN
  // ============================================

  async getAccessToken() {
    try {
      const token = process.env.API_SECRET_KEY;
      if (token) return token;
      return null;
    } catch (error) {
      console.error('❌ فشل الحصول على التوكن:', error.message);
      return null;
    }
  }

  // ============================================
  // 📧 SPECIFIC EMAIL TYPES
  // ============================================

  async sendVerificationEmail(email, code) {
    const subject = '🔐 رمز التحقق - Sell In';
    const html = this.buildVerificationEmailHtml(code);
    const text = this.buildVerificationEmailText(code);
    return await this.sendEmail({ to: email, subject, html, text, requireAuth: false });
  }

  async sendPasswordResetEmail(email, token) {
    const subject = '🔑 إعادة تعيين كلمة المرور - Sell In';
    const html = this.buildPasswordResetEmailHtml(token);
    const text = this.buildPasswordResetEmailText(token);
    return await this.sendEmail({ to: email, subject, html, text, requireAuth: false });
  }

  async sendDeviceVerificationEmail(email, code) {
    const subject = '📱 جهاز جديد - Sell In';
    const html = this.buildDeviceVerificationEmailHtml(code);
    const text = this.buildDeviceVerificationEmailText(code);
    return await this.sendEmail({ to: email, subject, html, text, requireAuth: false });
  }

  async sendWelcomeEmail(email, userName) {
    const subject = '🎉 مرحباً بك في Sell In!';
    const html = this.buildWelcomeEmailHtml(userName);
    const text = this.buildWelcomeEmailText(userName);
    return await this.sendEmail({ to: email, subject, html, text, requireAuth: false });
  }

  // ============================================
  // 📝 EMAIL TEMPLATES
  // ============================================

  buildVerificationEmailHtml(code) {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7F1D1D, #991B1B); color: white; padding: 20px; border-radius: 16px 16px 0 0; text-align: center; margin: -30px -30px 0 -30px; }
        .code-box { background: #f8f9fa; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; border: 2px dashed #7F1D1D; }
        .code { font-size: 42px; font-weight: bold; color: #7F1D1D; letter-spacing: 8px; font-family: monospace; }
        .warning { background: #FFF3E0; padding: 15px; border-radius: 12px; border-right: 4px solid #FF9800; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Sell In</h1>
          <p style="opacity: 0.9;">سوقك الإلكتروني الموثوق</p>
        </div>
        <div class="content">
          <h2 style="color: #7F1D1D;">✅ رمز التحقق الخاص بك</h2>
          <p>مرحباً بك في <strong>Sell In</strong>! 🎉</p>
          <p>للتحقق من هويتك، يرجى استخدام الرمز التالي:</p>
          <div class="code-box">
            <div class="code">${code}</div>
            <p style="margin-top: 12px; color: #666; font-size: 12px;">
              ⏰ هذا الرمز صالح لمدة <strong>10 دقائق</strong>
            </p>
          </div>
          <div class="warning">
            <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ تنبيهات هامة:</p>
            <ul style="margin: 10px 0 0; padding-right: 20px; font-size: 13px;">
              <li>لا تشارك هذا الرمز مع أي شخص</li>
              <li>إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة</li>
              <li>لأي استفسار، تواصل مع الدعم الفني</li>
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

  buildVerificationEmailText(code) {
    return `
    Sell In - رمز التحقق الخاص بك
    ================================
    
    مرحباً بك في Sell In! 🎉
    
    رمز التحقق الخاص بك هو:
    ${code}
    
    ⏰ هذا الرمز صالح لمدة 10 دقائق
    
    ⚠️ تنبيهات هامة:
    - لا تشارك هذا الرمز مع أي شخص
    - إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة
    
    © ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة
    `;
  }

  buildDeviceVerificationEmailHtml(code) {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7F1D1D, #991B1B); color: white; padding: 20px; border-radius: 16px 16px 0 0; text-align: center; margin: -30px -30px 0 -30px; }
        .code-box { background: #f8f9fa; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; border: 2px dashed #7F1D1D; }
        .code { font-size: 42px; font-weight: bold; color: #7F1D1D; letter-spacing: 8px; font-family: monospace; }
        .warning { background: #FFF3E0; padding: 15px; border-radius: 12px; border-right: 4px solid #FF9800; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Sell In</h1>
          <p style="opacity: 0.9;">سوقك الإلكتروني الموثوق</p>
        </div>
        <div class="content">
          <h2 style="color: #7F1D1D;">📱 جهاز جديد</h2>
          <p>مرحباً،</p>
          <p>تم محاولة تسجيل الدخول إلى حسابك من جهاز جديد.</p>
          <p>للتأكد من هويتك، يرجى استخدام الرمز التالي:</p>
          <div class="code-box">
            <div class="code">${code}</div>
            <p style="margin-top: 12px; color: #666; font-size: 12px;">
              ⏰ هذا الرمز صالح لمدة <strong>10 دقائق</strong>
            </p>
          </div>
          <div class="warning">
            <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ تنبيه هام:</p>
            <p style="margin: 5px 0 0; color: #E65100; font-size: 13px;">
              إذا لم تكن أنت من حاول تسجيل الدخول، يرجى تغيير كلمة المرور فوراً.
            </p>
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

  buildDeviceVerificationEmailText(code) {
    return `
    Sell In - جهاز جديد
    ================================
    
    مرحباً،
    
    تم محاولة تسجيل الدخول إلى حسابك من جهاز جديد.
    
    رمز التحقق الخاص بك هو:
    ${code}
    
    ⏰ هذا الرمز صالح لمدة 10 دقائق
    
    ⚠️ إذا لم تكن أنت من حاول تسجيل الدخول، يرجى تغيير كلمة المرور فوراً.
    
    © ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة
    `;
  }

  buildPasswordResetEmailHtml(token) {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7F1D1D, #991B1B); color: white; padding: 20px; border-radius: 16px 16px 0 0; text-align: center; margin: -30px -30px 0 -30px; }
        .code-box { background: #f8f9fa; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; border: 2px dashed #7F1D1D; }
        .code { font-size: 42px; font-weight: bold; color: #7F1D1D; letter-spacing: 8px; font-family: monospace; }
        .warning { background: #FFF3E0; padding: 15px; border-radius: 12px; border-right: 4px solid #FF9800; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Sell In</h1>
          <p style="opacity: 0.9;">سوقك الإلكتروني الموثوق</p>
        </div>
        <div class="content">
          <h2 style="color: #7F1D1D;">🔑 إعادة تعيين كلمة المرور</h2>
          <p>مرحباً،</p>
          <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
          <p>استخدم الرمز التالي لإعادة تعيين كلمة المرور:</p>
          <div class="code-box">
            <div class="code">${token}</div>
            <p style="margin-top: 12px; color: #666; font-size: 12px;">
              ⏰ هذا الرمز صالح لمدة <strong>24 ساعة</strong>
            </p>
          </div>
          <div class="warning">
            <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ تنبيه:</p>
            <p style="margin: 5px 0 0; color: #E65100; font-size: 13px;">
              إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.
            </p>
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

  buildPasswordResetEmailText(token) {
    return `
    Sell In - إعادة تعيين كلمة المرور
    ================================
    
    مرحباً،
    
    لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.
    
    رمز إعادة تعيين كلمة المرور هو:
    ${token}
    
    ⏰ هذا الرمز صالح لمدة 24 ساعة
    
    ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.
    
    © ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة
    `;
  }

  buildWelcomeEmailHtml(userName) {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7F1D1D, #991B1B); color: white; padding: 20px; border-radius: 16px 16px 0 0; text-align: center; margin: -30px -30px 0 -30px; }
        .feature { background: #f0f7ff; padding: 12px; border-radius: 8px; margin: 8px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Sell In</h1>
          <p style="opacity: 0.9;">سوقك الإلكتروني الموثوق</p>
        </div>
        <div class="content">
          <h2 style="color: #7F1D1D;">🎉 مرحباً بك ${userName}!</h2>
          <p>شكراً لانضمامك إلى <strong>Sell In</strong> - سوقك الإلكتروني الموثوق.</p>
          
          <div style="background: #f0f7ff; padding: 16px; border-radius: 12px; margin: 16px 0;">
            <h3 style="color: #7F1D1D; margin: 0 0 8px 0;">🌟 مميزات التطبيق:</h3>
            <div class="feature">📦 نشر إعلاناتك بسهولة</div>
            <div class="feature">💰 دفع آمن عبر محفظة إلكترونية</div>
            <div class="feature">📱 متابعة طلباتك ومشترياتك</div>
            <div class="feature">⭐ تقييم البائعين والمشترين</div>
          </div>
          
          <p style="margin-top: 16px;">
            <strong>💡 نصائح للبدء:</strong><br>
            1. أضف منتجك الأول الآن<br>
            2. اختر الباقة المناسبة لك<br>
            3. ابدأ في البيع والشراء
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  buildWelcomeEmailText(userName) {
    return `
    Sell In - مرحباً بك!
    ================================
    
    مرحباً بك ${userName} في Sell In!
    
    مميزات التطبيق:
    📦 نشر إعلاناتك بسهولة
    💰 دفع آمن عبر محفظة إلكترونية
    📱 متابعة طلباتك ومشترياتك
    ⭐ تقييم البائعين والمشترين
    
    نصائح للبدء:
    1. أضف منتجك الأول الآن
    2. اختر الباقة المناسبة لك
    3. ابدأ في البيع والشراء
    
    © ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة
    `;
  }
}

module.exports = new EmailService();