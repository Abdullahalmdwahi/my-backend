// ============================================
// 📧 EMAIL SERVICE - استخدام Brevo API مباشرة
// ============================================

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'no-reply@mail.sell-in.app';
    this.fromName = process.env.BREVO_FROM_NAME || 'Sell In';
    this.maxRetries = 3;
    this.retryDelay = 3000;
    this.timeout = 30000;
  }

  // ✅ الإرسال عبر Brevo API مباشرة
  async sendEmail({ to, subject, html, text }) {
    if (!html) {
      return { success: false, error: 'html content is required' };
    }

    console.log(`📧 إرسال بريد إلى: ${to}`);
    console.log(`📌 الموضوع: ${subject}`);

    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const result = await Promise.race([
          this._sendViaBrevoApi({ to, subject, html, text }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout after ${this.timeout}ms`)), this.timeout)
          )
        ]);

        if (result.success) {
          console.log(`✅ Email sent to ${to} (attempt ${attempt})`);
          return result;
        }
        throw new Error(result.error || 'Send failed');
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

    // ✅ محاكاة في حالة الفشل النهائي
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
      
      // ✅ إذا كان الخطأ بسبب IP، حاول مرة أخرى
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
  // 🏗️ بناء قوالب HTML
  // ============================================

  buildVerificationEmailHtml(code) {
    return `<!DOCTYPE html>
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
    .warning ul { margin: 10px 0 0; color: #E65100; font-size: 13px; padding-right: 20px; }
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
        <div class="code">${code}</div>
        <p style="margin-top: 12px; color: #666; font-size: 12px;">أدخل هذا الرمز في التطبيق لتفعيل حسابك</p>
      </div>
      <div class="warning">
        <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ تنبيهات هامة:</p>
        <ul>
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
</html>`;
  }

  buildVerificationEmailText(code) {
    return `Sell In - رمز التحقق\n\nمرحباً بك في Sell In!\n\nرمز التفعيل الخاص بك هو: ${code}\n\nأدخل هذا الرمز في التطبيق لتفعيل حسابك.\n\n⚠️ هذا الرمز صالح لمدة 24 ساعة فقط.\n\n© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة`;
  }

  buildPasswordResetEmailHtml(token) {
    return `<!DOCTYPE html>
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
      <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
      <div class="code-box">
        <p style="margin-bottom: 12px; color: #666; font-size: 14px;">📱 رمز التحقق الخاص بك هو:</p>
        <div class="code">${token}</div>
        <p style="margin-top: 12px; color: #666; font-size: 12px;">أدخل هذا الرمز في التطبيق لإعادة تعيين كلمة المرور</p>
      </div>
      <div class="warning">
        <p style="margin: 0; color: #E65100; font-weight: bold;">⚠️ هذا الرمز صالح لمدة <strong>24 ساعة</strong> فقط</p>
        <p style="margin: 5px 0 0; color: #E65100; font-size: 13px;">🔒 إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`;
  }

  buildPasswordResetEmailText(token) {
    return `Sell In - إعادة تعيين كلمة المرور\n\nلقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.\n\nرمز التحقق الخاص بك هو: ${token}\n\nأدخل هذا الرمز في التطبيق لإعادة تعيين كلمة المرور.\n\n⚠️ هذا الرمز صالح لمدة 24 ساعة فقط.\n\n🔒 إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.\n\n© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة`;
  }

  buildDeviceVerificationEmailHtml(code) {
    return `<!DOCTYPE html>
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
      <h2 style="color: #7F1D1D;">📱 جهاز جديد</h2>
      <p>مرحباً،</p>
      <p>تم طلب تسجيل الدخول إلى حسابك من جهاز جديد.</p>
      <div class="code-box">
        <p style="margin-bottom: 12px; color: #666; font-size: 14px;">🔑 رمز التحقق الخاص بك هو:</p>
        <div class="code">${code}</div>
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
</html>`;
  }

  buildDeviceVerificationEmailText(code) {
    return `Sell In - جهاز جديد\n\nتم طلب تسجيل الدخول إلى حسابك من جهاز جديد.\n\nرمز التحقق الخاص بك هو: ${code}\n\nأدخل هذا الرمز في التطبيق لتأكيد الجهاز.\n\n⚠️ هذا الرمز صالح لمدة 10 دقائق فقط.\n\n🔒 إذا لم تكن أنت من حاول تسجيل الدخول، يرجى تغيير كلمة المرور فوراً.\n\n© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة`;
  }

  buildWelcomeEmailHtml(userName) {
    const name = userName || 'مستخدمنا العزيز';
    return `<!DOCTYPE html>
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
    .features { background: #f8f9fa; padding: 15px; border-radius: 12px; margin: 20px 0; }
    .features ul { margin: 10px 0 0; padding-right: 20px; }
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
      <h2 style="color: #7F1D1D;">🎉 مرحباً ${name}!</h2>
      <p>نحن سعداء بانضمامك إلى <strong>Sell In</strong> - سوقك الإلكتروني الموثوق.</p>
      <div class="features">
        <p style="font-weight: bold; color: #7F1D1D;">مع Sell In يمكنك:</p>
        <ul>
          <li>🛒 بيع وشراء المنتجات بسهولة</li>
          <li>🔨 المشاركة في المزادات</li>
          <li>💬 التواصل مع البائعين والمشترين</li>
          <li>⭐ تقييم المنتجات والتجارب</li>
        </ul>
      </div>
      <p>نتمنى لك تجربة ممتعة!</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`;
  }

  buildWelcomeEmailText(userName) {
    const name = userName || 'مستخدمنا العزيز';
    return `Sell In - مرحباً بك!\n\nمرحباً ${name}!\n\nنحن سعداء بانضمامك إلى Sell In - سوقك الإلكتروني الموثوق.\n\nمع Sell In يمكنك:\n- بيع وشراء المنتجات بسهولة\n- المشاركة في المزادات\n- التواصل مع البائعين والمشترين\n- تقييم المنتجات والتجارب\n\nنتمنى لك تجربة ممتعة!\n\n© ${new Date().getFullYear()} Sell In - جميع الحقوق محفوظة`;
  }
}

module.exports = new EmailService();