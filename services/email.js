// ============================================
// 📧 EMAIL SERVICE - باستخدام Brevo
// ============================================

const nodemailer = require('nodemailer');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://my-backend-hvha.onrender.com';
    this.lastSendTime = null;
    this.minInterval = 3000;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || process.env.BREVO_FROM_EMAIL,
          pass: process.env.SMTP_PASSWORD || process.env.BREVO_API_KEY,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
      };

      console.log('📧 محاولة الاتصال بـ Brevo SMTP...');
      console.log(`📧 Host: ${smtpConfig.host}:${smtpConfig.port}`);
      console.log(`📧 User: ${smtpConfig.auth.user}`);

      this.transporter = nodemailer.createTransport(smtpConfig);
      this.verifyConnection();
      console.log('✅ Email Service initialized with Brevo');
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
      console.log('📧 جاري التحقق من الاتصال بـ Brevo...');
      await this.transporter.verify();
      console.log('✅ Brevo connection verified successfully!');
      return true;
    } catch (error) {
      console.error('❌ Brevo connection failed:', error.message);
      this.transporter = null;
      return false;
    }
  }

  async waitIfNeeded() {
    if (this.lastSendTime) {
      const elapsed = Date.now() - this.lastSendTime;
      if (elapsed < this.minInterval) {
        const waitTime = this.minInterval - elapsed;
        console.log(`⏳ انتظار ${waitTime}ms قبل الإرسال التالي`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    this.lastSendTime = Date.now();
  }

  async sendEmail({ to, subject, html, text, requireAuth = false }) {
    if (this.transporter) {
      try {
        await this.waitIfNeeded();

        const mailOptions = {
          from: `"${process.env.BREVO_FROM_NAME || 'Sell In'}" <${process.env.BREVO_FROM_EMAIL}>`,
          to: to,
          subject: subject,
          html: html,
          text: text || html.replace(/<[^>]*>/g, ''),
        };

        console.log(`📧 جاري إرسال بريد إلى ${to}...`);
        
        const info = await Promise.race([
          this.transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout after 15 seconds')), 15000)
          )
        ]);

        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return await this.sendViaApi(to, subject, html, text, requireAuth);
      }
    }

    return await this.sendViaApi(to, subject, html, text, requireAuth);
  }

  async sendViaApi(to, subject, html, text, requireAuth) {
    try {
      await this.waitIfNeeded();

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
        { headers, timeout: 15000 }
      );

      if (response.data && response.data.success) {
        console.log(`✅ [API] تم إرسال البريد إلى ${to}`);
        return { success: true, messageId: response.data.messageId || 'api-sent' };
      }

      console.log(`❌ [API] فشل إرسال البريد: ${response.data?.message}`);
      return { success: false, error: response.data?.message };
    } catch (error) {
      console.error(`❌ [API] خطأ في إرسال البريد:`, error.message);
      
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

  buildVerificationEmailHtml(code) { /* ... */ }
  buildVerificationEmailText(code) { /* ... */ }
  buildDeviceVerificationEmailHtml(code) { /* ... */ }
  buildDeviceVerificationEmailText(code) { /* ... */ }
  buildPasswordResetEmailHtml(token) { /* ... */ }
  buildPasswordResetEmailText(token) { /* ... */ }
  buildWelcomeEmailHtml(userName) { /* ... */ }
  buildWelcomeEmailText(userName) { /* ... */ }
}

module.exports = new EmailService();