// ============================================
// 📧 خدمة إرسال الإيميلات عبر Brevo API
// ============================================

const axios = require('axios');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'iiuuyy2021@gmail.com';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Sell In';

// ✅ دالة إرسال إيميل مع إعادة المحاولة
async function sendEmailWithRetry(to, subject, htmlContent, textContent, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;
  
  while (attempt < maxRetries) {
    try {
      console.log(`📧 [EmailService] محاولة ${attempt + 1}/${maxRetries} إلى: ${to}`);
      
      const data = {
        sender: {
          name: BREVO_FROM_NAME,
          email: BREVO_FROM_EMAIL,
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      };

      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY,
          },
          timeout: 15000,
        }
      );

      console.log(`✅ [EmailService] تم الإرسال بنجاح إلى: ${to}`);
      return true;
      
    } catch (error) {
      attempt++;
      lastError = error;
      console.error(`❌ [EmailService] فشل الإرسال (محاولة ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  console.error(`❌ [EmailService] فشل الإرسال بعد ${maxRetries} محاولات إلى: ${to}`);
  return false;
}

// ✅ دالة إرسال إيميل (واجهة بسيطة)
async function sendEmail(to, subject, htmlContent, textContent) {
  return sendEmailWithRetry(to, subject, htmlContent, textContent);
}

// ✅ قوالب الإيميلات - HTML
function getVerificationEmailHtml(token) {
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

function getPasswordResetEmailHtml(token) {
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

function getDeviceVerificationEmailHtml(token) {
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

// ✅ قوالب الإيميلات - دوال كاملة (للتوافق مع الكود السابق)
function getVerificationEmailTemplate(token) {
  return {
    subject: '✅ تفعيل حسابك في Sell In',
    html: getVerificationEmailHtml(token)
  };
}

function getPasswordResetEmailTemplate(token) {
  return {
    subject: '🔐 إعادة تعيين كلمة المرور - Sell In',
    html: getPasswordResetEmailHtml(token)
  };
}

function getDeviceVerificationEmailTemplate(token) {
  return {
    subject: '🔐 رمز التحقق لتسجيل الدخول - Sell In',
    html: getDeviceVerificationEmailHtml(token)
  };
}

// ✅ دوال إرسال محددة
async function sendVerificationEmail(to, token) {
  const { subject, html } = getVerificationEmailTemplate(token);
  return sendEmail(to, subject, html);
}

async function sendPasswordResetEmail(to, token) {
  const { subject, html } = getPasswordResetEmailTemplate(token);
  return sendEmail(to, subject, html);
}

async function sendDeviceVerificationEmail(to, token) {
  const { subject, html } = getDeviceVerificationEmailTemplate(token);
  return sendEmail(to, subject, html);
}

module.exports = {
  sendEmail,
  sendEmailWithRetry,
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
  getDeviceVerificationEmailHtml,
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getDeviceVerificationEmailTemplate,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendDeviceVerificationEmail
};