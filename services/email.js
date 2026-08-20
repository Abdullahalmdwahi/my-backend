// ============================================
// 📧 EMAIL SERVICE - استخدام Brevo API مباشرة
// ============================================

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// ✅ سجلات التصحيح عند تحميل الخدمة
console.log('🔍 [DEBUG] ===== EMAIL SERVICE LOADED =====');
console.log('🔍 [DEBUG] BREVO_API_KEY exists in process.env:', !!process.env.BREVO_API_KEY);
console.log('🔍 [DEBUG] BREVO_API_KEY length:', process.env.BREVO_API_KEY?.length || 0);
console.log('🔍 [DEBUG] BREVO_FROM_EMAIL:', process.env.BREVO_FROM_EMAIL || 'NOT SET');
console.log('🔍 [DEBUG] =====================================');

class EmailService {
  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'no-reply@mail.sell-in.app';
    this.fromName = process.env.BREVO_FROM_NAME || 'Sell In';
    this.maxRetries = 3;
    this.retryDelay = 3000;
    this.timeout = 30000;
    
    console.log('🔍 [DEBUG] EmailService constructor:');
    console.log('  - brevoApiKey exists:', !!this.brevoApiKey);
    console.log('  - brevoApiKey length:', this.brevoApiKey?.length || 0);
    console.log('  - fromEmail:', this.fromEmail);
    console.log('  - fromName:', this.fromName);
  }

  // ✅ الإرسال عبر Brevo API مباشرة
  async sendEmail({ to, subject, html, text }) {
    console.log('🔍 [DEBUG] ===== START EMAIL SEND =====');
    console.log('🔍 [DEBUG] to:', to);
    console.log('🔍 [DEBUG] subject:', subject);
    console.log('🔍 [DEBUG] BREVO_API_KEY exists:', !!this.brevoApiKey);
    console.log('🔍 [DEBUG] BREVO_API_KEY length:', this.brevoApiKey?.length || 0);
    console.log('🔍 [DEBUG] =============================');

    if (!html) {
      return { success: false, error: 'html content is required' };
    }

    // ✅ إذا لم يكن هناك مفتاح، استخدم المحاكاة فوراً
    if (!this.brevoApiKey || this.brevoApiKey.length < 10) {
      console.error('❌ [DEBUG] BREVO_API_KEY is missing or invalid!');
      return this.simulateEmailSend(to, html);
    }

    console.log(`📧 إرسال بريد إلى: ${to}`);
    console.log(`📌 الموضوع: ${subject}`);

    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        console.log(`🔄 Attempt ${attempt}/${this.maxRetries}`);
        
        const result = await Promise.race([
          this._sendViaBrevoApi({ to, subject, html, text }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout after ${this.timeout}ms`)), this.timeout)
          )
        ]);

        if (result && result.success) {
          console.log(`✅ Email sent to ${to} (attempt ${attempt})`);
          return result;
        }
        throw new Error(result?.error || 'Send failed');
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt}/${this.maxRetries} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retry ${attempt + 1}/${this.maxRetries} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ All ${this.maxRetries} attempts failed for ${to}`);
    return this.simulateEmailSend(to, html);
  }

  // ✅ الإرسال عبر Brevo API
  async _sendViaBrevoApi({ to, subject, html, text }) {
    try {
      const plainText = text || html.replace(/<[^>]*>/g, '').trim();
      
      const payload = {
        sender: {
          name: this.fromName,
          email: this.fromEmail,
        },
        to: [
          {
            email: to,
            name: to.split('@')[0] || 'User',
          }
        ],
        subject: subject,
        htmlContent: html,
        textContent: plainText,
      };

      console.log(`📤 إرسال إلى Brevo API:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.brevoApiKey,
          },
          timeout: 30000,
        }
      );

      console.log(`✅ Brevo response:`, response.data);

      if (response.data && response.data.messageId) {
        return {
          success: true,
          messageId: response.data.messageId,
          simulated: false,
        };
      }

      return { success: false, error: 'No messageId received' };
    } catch (error) {
      console.error(`❌ Brevo API failed:`, error.response?.data || error.message);
      
      if (error.response?.data?.code === 'unauthorized') {
        console.log(`⚠️ IP not authorized, will retry...`);
        throw new Error('IP not authorized, retrying...');
      }
      
      return { success: false, error: error.message };
    }
  }

  // ✅ محاكاة الإرسال
  simulateEmailSend(to, html) {
    let code = 'N/A';
    if (html && typeof html === 'string') {
      const codeMatch = html.match(/<div class="code">([^<]+)<\/div>/);
      if (codeMatch) code = codeMatch[1];
    }
    
    console.log(`📧 [محاكاة] إرسال بريد إلى: ${to}`);
    console.log(`📧 [محاكاة] رمز التحقق: ${code}`);
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      simulated: true,
      warning: '⚠️ تم استخدام المحاكاة بسبب فشل الإرسال الفعلي',
      code: code,
    };
  }

  // ============================================
  // 📧 دوال بناء البريد الإلكتروني
  // ============================================

  async sendVerificationEmail(email, code) {
    const subject = '✅ تفعيل حسابك في Sell In';
    const html = this.buildVerificationEmailHtml(code);
    const text = this.buildVerificationEmailText(code);
    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendPasswordResetEmail(email, token) {
    const subject = '🔐 إعادة تعيين كلمة المرور - Sell In';
    const html = this.buildPasswordResetEmailHtml(token);
    const text = this.buildPasswordResetEmailText(token);
    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendDeviceVerificationEmail(email, code) {
    const subject = '📱 جهاز جديد - Sell In';
    const html = this.buildDeviceVerificationEmailHtml(code);
    const text = this.buildDeviceVerificationEmailText(code);
    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendWelcomeEmail(email, userName) {
    const subject = '🎉 مرحباً بك في Sell In!';
    const html = this.buildWelcomeEmailHtml(userName);
    const text = this.buildWelcomeEmailText(userName);
    return await this.sendEmail({ to: email, subject, html, text });
  }

  // ============================================
  // 🏗️ بناء قوالب HTML (مختصرة للاختبار)
  // ============================================

  buildVerificationEmailHtml(code) {
    return `<h1>✅ تفعيل حسابك</h1><p>رمز التفعيل: <strong>${code}</strong></p>`;
  }

  buildVerificationEmailText(code) {
    return `تفعيل حسابك\nرمز التفعيل: ${code}`;
  }

  buildPasswordResetEmailHtml(token) {
    return `<h1>🔐 إعادة تعيين كلمة المرور</h1><p>رمز التحقق: <strong>${token}</strong></p>`;
  }

  buildPasswordResetEmailText(token) {
    return `إعادة تعيين كلمة المرور\nرمز التحقق: ${token}`;
  }

  buildDeviceVerificationEmailHtml(code) {
    return `<h1>📱 جهاز جديد</h1><p>رمز التحقق: <strong>${code}</strong></p>`;
  }

  buildDeviceVerificationEmailText(code) {
    return `جهاز جديد\nرمز التحقق: ${code}`;
  }

  buildWelcomeEmailHtml(userName) {
    return `<h1>🎉 مرحباً ${userName || ''}</h1><p>مرحباً بك في Sell In!</p>`;
  }

  buildWelcomeEmailText(userName) {
    return `مرحباً ${userName || ''}!\nمرحباً بك في Sell In!`;
  }
}

module.exports = new EmailService();