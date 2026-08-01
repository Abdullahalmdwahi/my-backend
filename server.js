// ============================================
// 🚀 خادم تطبيق السوق - نسخة كاملة مع رفع الصور والمزادات والأمان المتكامل
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// ============================================
// 📦 استيراد الميدلوير المحلية
// ============================================
const { authenticate, isAdmin, generateToken } = require('./middleware/auth');
const { limiter, strictLimiter, passwordResetLimiter, registerLimiter } = require('./middleware/rateLimit');
const { sanitizeInput, sanitizeBody, securityHeaders } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 🔐 إعداد Supabase
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

// ============================================
// ⚙️ إعدادات الخادم - الأمان والتحسين
// ============================================

app.set('trust proxy', true);
app.disable('x-powered-by');

// ✅ 1. Helmet - حماية الرؤوس
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: true,
  xssFilter: true,
}));

// ✅ 2. Compression محسن
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// ✅ 3. ETag للتخزين المؤقت
app.set('etag', 'strong');

// ✅ 4. Rate Limiting
app.use('/api/', limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

// ✅ 5. CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400,
};
app.use(cors(corsOptions));

// ✅ 6. JSON parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ 7. Security
app.use(sanitizeBody);
app.use(securityHeaders);

// ✅ 8. إزالة رؤوس الخادم الإضافية
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
});

// ✅ 9. إضافة التوكن الجديد إلى الاستجابة (تجديد تلقائي)
app.use((req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.newToken) {
      data = {
        ...data,
        newToken: req.newToken
      };
    }
    return originalJson.call(this, data);
  };
  
  next();
});

// ============================================
// 📤 إعداد Multer لرفع الصور
// ============================================
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('❌ نوع الملف غير مدعوم'), false);
    }
  },
});

// ============================================
// 📧 إعداد Brevo API
// ============================================
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'iiuuyy2021@gmail.com';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Sell In';

async function sendEmailViaBrevo(to, subject, htmlContent, textContent) {
  try {
    console.log(`📧 [Brevo API] بدء إرسال إلى: ${to}`);

    const data = {
      sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
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

    console.log(`✅ [Brevo API] تم الإرسال بنجاح إلى: ${to}`);
    return true;
  } catch (error) {
    console.error('❌ [Brevo API] فشل الإرسال:', error.message);
    return false;
  }
}

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

// ============================================
// 🏠 نقطة نهاية اختبار الاتصال
// ============================================
app.get('/', (req, res) => {
  res.json({ success: true, message: '🚀 API is running' });
});

// ✅ نقطة اختبار Brevo API
app.get('/api/email/test', async (req, res) => {
  try {
    if (!BREVO_API_KEY) {
      return res.status(400).json({
        success: false,
        message: '❌ BREVO_API_KEY غير موجود في المتغيرات البيئية',
      });
    }

    const testResult = await sendEmailViaBrevo(
      BREVO_FROM_EMAIL,
      '🧪 اختبار Brevo API',
      '<h1>✅ نجاح الاتصال!</h1><p>تم إرسال هذا الإيميل عبر واجهة برمجة تطبيقات Brevo بنجاح.</p>'
    );

    if (testResult) {
      res.json({
        success: true,
        message: '✅ Brevo API يعمل بشكل صحيح! تم إرسال إيميل اختبار.',
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال إيميل الاختبار. تأكد من صحة BREVO_API_KEY',
      });
    }
  } catch (error) {
    console.error('❌ فشل اختبار Brevo API:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ داخلي في الخادم',
    });
  }
});

// ✅ نقطة اختبار JWT (محمية)
app.get('/api/auth/test', authenticate, (req, res) => {
  res.json({
    success: true,
    message: '✅ JWT يعمل بشكل صحيح!',
  });
});

// ✅ نقطة اختبار المدير (محمية)
app.get('/api/admin/test', authenticate, isAdmin, (req, res) => {
  res.json({
    success: true,
    message: '✅ لديك صلاحيات مدير!',
  });
});

// ============================================
// 📤 1. نقاط نهاية رفع الصور
// ============================================

// ✅ رفع صورة واحدة لمنتج
app.post('/api/products/:id/upload-image', authenticate, upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '❌ لم يتم إرسال صورة'
      });
    }

    const fileName = `product_${productId}_${Date.now()}_${file.originalname}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product_images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ فشل رفع الصورة:', error);
      return res.status(500).json({
        success: false,
        message: '❌ فشل رفع الصورة',
        error: error.message
      });
    }

    const publicUrl = supabase.storage
      .from('product_images')
      .getPublicUrl(filePath);

    await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: publicUrl,
        is_main: false,
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      message: '✅ تم رفع الصورة بنجاح',
      url: publicUrl,
      path: filePath
    });

  } catch (error) {
    console.error('❌ خطأ في رفع الصورة:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في رفع الصورة'
    });
  }
});

// ✅ رفع صور متعددة لمنتج
app.post('/api/products/:id/upload-images', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const productId = req.params.id;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '❌ لم يتم إرسال صور'
      });
    }

    const uploadedUrls = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const fileName = `product_${productId}_${Date.now()}_${i}_${file.originalname}`;
        const filePath = `products/${fileName}`;

        const { error } = await supabase.storage
          .from('product_images')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          errors.push({ index: i, error: error.message });
          continue;
        }

        const publicUrl = supabase.storage
          .from('product_images')
          .getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);

        await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            is_main: i === 0,
            sort_order: i,
            created_at: new Date().toISOString()
          });

      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `✅ تم رفع ${uploadedUrls.length}/${files.length} صور`,
      urls: uploadedUrls,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ خطأ في رفع الصور:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في رفع الصور'
    });
  }
});

// ✅ رفع صورة لمزاد
app.post('/api/auctions/:id/upload-image', authenticate, upload.single('image'), async (req, res) => {
  try {
    const auctionId = req.params.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '❌ لم يتم إرسال صورة'
      });
    }

    const fileName = `auction_${auctionId}_${Date.now()}_${file.originalname}`;
    const filePath = `auctions/${fileName}`;

    const { data, error } = await supabase.storage
      .from('auction_images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل رفع الصورة',
        error: error.message
      });
    }

    const publicUrl = supabase.storage
      .from('auction_images')
      .getPublicUrl(filePath);

    await supabase
      .from('auction_images')
      .insert({
        auction_id: auctionId,
        image_url: publicUrl,
        is_main: false,
        sort_order: 0,
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      message: '✅ تم رفع الصورة بنجاح',
      url: publicUrl
    });

  } catch (error) {
    console.error('❌ خطأ في رفع الصورة للمزاد:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في رفع الصورة'
    });
  }
});

// ✅ رفع صور متعددة لمزاد
app.post('/api/auctions/:id/upload-images', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const auctionId = req.params.id;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '❌ لم يتم إرسال صور'
      });
    }

    const uploadedUrls = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const fileName = `auction_${auctionId}_${Date.now()}_${i}_${file.originalname}`;
        const filePath = `auctions/${fileName}`;

        const { error } = await supabase.storage
          .from('auction_images')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (error) continue;

        const publicUrl = supabase.storage
          .from('auction_images')
          .getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);

        await supabase
          .from('auction_images')
          .insert({
            auction_id: auctionId,
            image_url: publicUrl,
            is_main: i === 0,
            sort_order: i,
            created_at: new Date().toISOString()
          });

      } catch (err) {
        console.error(`❌ فشل رفع الصورة ${i + 1}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `✅ تم رفع ${uploadedUrls.length}/${files.length} صور`,
      urls: uploadedUrls
    });

  } catch (error) {
    console.error('❌ خطأ في رفع الصور للمزاد:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في رفع الصور'
    });
  }
});

// ✅ حذف صورة
app.delete('/api/images/:path', authenticate, async (req, res) => {
  try {
    const { path: imagePath } = req.params;
    
    const { error } = await supabase.storage
      .from('product_images')
      .remove([imagePath]);

    if (error) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل حذف الصورة',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: '✅ تم حذف الصورة بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في حذف الصورة:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في حذف الصورة'
    });
  }
});

// ============================================
// 🔐 2. نقاط نهاية المصادقة
// ============================================

// ✅ تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName, deviceId, userTypeId, specializations } = req.body;
    
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    const sanitizedName = sanitizeInput(name || email.split('@')[0]);
    const sanitizedBusinessName = sanitizeInput(businessName || '');
    const sanitizedDeviceId = sanitizeInput(deviceId || '');
    
    if (!sanitizedEmail || !sanitizedPassword) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البريد الإلكتروني وكلمة المرور مطلوبة' 
      });
    }
    
    if (sanitizedPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
      });
    }
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', sanitizedEmail)
      .maybeSingle();
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البريد الإلكتروني مسجل مسبقاً' 
      });
    }
    
    if (sanitizedBusinessName) {
      const { data: existingBusiness } = await supabase
        .from('users')
        .select('business_name')
        .eq('business_name', sanitizedBusinessName)
        .maybeSingle();
      
      if (existingBusiness) {
        return res.status(400).json({ 
          success: false, 
          message: '❌ الاسم التجاري مستخدم مسبقاً' 
        });
      }
    }
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password: sanitizedPassword,
      options: {
        data: {
          name: sanitizedName,
          business_name: sanitizedBusinessName,
          device_id: sanitizedDeviceId,
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
        message: '❌ فشل التسجيل' 
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
        email: sanitizedEmail,
        name: sanitizedName,
        business_name: sanitizedBusinessName,
        phone: '',
        device_id: sanitizedDeviceId,
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
    
    const token = generateToken(userId, sanitizedEmail, 'user');
    
    res.json({
      success: true,
      message: '✅ تم تسجيل المستخدم بنجاح',
      data: {
        id: userId,
        email: sanitizedEmail,
        name: sanitizedName,
        token: token
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
    
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    
    if (!sanitizedEmail || !sanitizedPassword) {
      return res.status(400).json({
        success: false,
        message: '❌ البريد الإلكتروني وكلمة المرور مطلوبة'
      });
    }
    
    console.log(`🔑 محاولة تسجيل الدخول: ${sanitizedEmail}`);
    
    // ✅ 1. تسجيل الدخول في Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password: sanitizedPassword
    });
    
    if (authError) {
      console.error('❌ خطأ في المصادقة:', authError.message);
      return res.status(401).json({
        success: false,
        message: '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }
    
    if (!authData || !authData.user) {
      return res.status(401).json({
        success: false,
        message: '❌ فشل تسجيل الدخول'
      });
    }
    
    console.log(`✅ تم المصادقة: ${authData.user.id}`);
    
    // ✅ 2. البحث عن المستخدم في جدول public.users
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    let userData = existingUser;
    
    // ✅ 3. إذا لم يوجد المستخدم، قم بإنشائه
    if (!userData) {
      console.log(`📝 إنشاء مستخدم جديد في جدول users: ${sanitizedEmail}`);
      
      const userEmail = authData.user.email || sanitizedEmail;
      const userName = authData.user.user_metadata?.name || userEmail.split('@')[0];
      const businessName = authData.user.user_metadata?.business_name || '';
      const deviceId = authData.user.user_metadata?.device_id || '';
      
      // ✅ إنشاء المستخدم مع معالجة الأخطاء
      try {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: userEmail,
            name: userName,
            business_name: businessName,
            phone: authData.user.phone || '',
            device_id: deviceId,
            is_verified: authData.user.email_confirmed_at != null || false,
            free_posts_remaining: 1,
            notifications_remaining: 0,
            role: 'user',
            user_type_id: 1,
            specializations: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ تفاصيل خطأ إنشاء المستخدم:', createError);
          
          // ✅ محاولة إنشاء المستخدم بدون الحقول الإضافية
          console.log('🔄 محاولة إنشاء مستخدم بدون الحقول الإضافية...');
          
          const { data: simpleUser, error: simpleError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: userEmail,
              name: userName,
              business_name: businessName || '',
              phone: authData.user.phone || '',
              is_verified: false,
              free_posts_remaining: 1,
              role: 'user',
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (simpleError) {
            console.error('❌ فشل إنشاء المستخدم حتى بالطريقة البسيطة:', simpleError);
            return res.status(500).json({
              success: false,
              message: '❌ فشل إنشاء بيانات المستخدم',
              error: simpleError.message
            });
          }
          
          userData = simpleUser;
        } else {
          userData = newUser;
        }
        
        console.log(`✅ تم إنشاء المستخدم بنجاح: ${userData.id}`);
        
      } catch (insertError) {
        console.error('❌ خطأ في إدراج المستخدم:', insertError);
        return res.status(500).json({
          success: false,
          message: '❌ فشل إنشاء بيانات المستخدم',
          error: insertError.message
        });
      }
    }
    
    // ✅ 4. تحديث آخر تسجيل دخول
    if (userData) {
      await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id);
    }
    
    // ✅ 5. إنشاء التوكن
    const token = generateToken(
      userData.id,
      userData.email,
      userData.role || 'user'
    );
    
    // ✅ 6. إرجاع النتيجة
    res.json({
      success: true,
      message: '✅ تم تسجيل الدخول بنجاح',
      data: {
        user: userData,
        session: {
          access_token: authData.session?.access_token || '',
          refresh_token: authData.session?.refresh_token || '',
          expires_at: authData.session?.expires_at || 0
        },
        token: token
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم',
      error: error.message
    });
  }
});
// ✅ تسجيل الخروج
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ فشل تسجيل الخروج' 
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
    
    const sanitizedEmail = sanitizeInput(email);
    
    if (!sanitizedEmail) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البريد الإلكتروني مطلوب' 
      });
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail);
    
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ فشل إعادة تعيين كلمة المرور' 
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

// ✅ التحقق من صحة التوكن
app.get('/api/auth/verify-token', authenticate, (req, res) => {
  res.json({
    success: true,
    message: '✅ التوكن صالح'
  });
});

// ============================================
// 🔐 2.1 نقاط نهاية المصادقة - الإضافات الجديدة
// ============================================

// ✅ التحقق من الجهاز المسجل
app.post('/api/auth/check-device', authenticate, async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    
    const { data: device, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل التحقق من الجهاز'
      });
    }
    
    res.json({
      success: true,
      isRegistered: device != null,
      device: device
    });
    
  } catch (error) {
    console.error('❌ خطأ في التحقق من الجهاز:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ تسجيل جهاز جديد
app.post('/api/auth/register-device', authenticate, async (req, res) => {
  try {
    const { userId, deviceId, deviceName } = req.body;
    
    const { data: existingDevices, error: checkError } = await supabase
      .from('user_devices')
      .select('device_id')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (checkError) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل التحقق من الأجهزة'
      });
    }
    
    if (existingDevices && existingDevices.length > 0) {
      const isSameDevice = existingDevices.some(d => d.device_id === deviceId);
      if (!isSameDevice) {
        return res.status(409).json({
          success: false,
          message: '❌ هذا الحساب مسجل على جهاز آخر',
          requiresVerification: true
        });
      }
    }
    
    const { data: device, error } = await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName || 'Unknown Device',
        is_active: true,
        last_used_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل تسجيل الجهاز'
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم تسجيل الجهاز بنجاح',
      device: device
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الجهاز:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ حذف جهاز (في حالة الضياع) - مدير فقط
app.delete('/api/auth/device/:deviceId', authenticate, isAdmin, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const { error } = await supabase
      .from('user_devices')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId);
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل حذف الجهاز'
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم حذف الجهاز بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في حذف الجهاز:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ إرسال رمز التحقق
app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const { userId, email, phone, method, userName } = req.body;
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    
    await supabase
      .from('verification_codes')
      .insert({
        user_id: userId,
        code: code,
        method: method || 'email',
        expires_at: expiry.toISOString(),
        created_at: new Date().toISOString(),
      });
    
    let sent = false;
    
    if (method === 'email' || !method) {
      const subject = '🔐 رمز التحقق - Sell In';
      const html = `
        <h1>🔐 رمز التحقق الخاص بك</h1>
        <p>مرحباً ${userName || 'مستخدمنا العزيز'},</p>
        <p>رمز التحقق الخاص بك هو:</p>
        <h2 style="font-size: 42px; color: #7F1D1D; letter-spacing: 8px;">${code}</h2>
        <p>⏰ هذا الرمز صالح لمدة 5 دقائق</p>
        <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
      `;
      
      sent = await sendEmailViaBrevo(email, subject, html);
      
    } else if (method === 'whatsapp') {
      const message = `🔐 Sell In - رمز التحقق: ${code} (صالح لمدة 5 دقائق)`;
      sent = true;
      
    } else if (method === 'sms') {
      const message = `Sell In: رمز التحقق ${code} (صالح لمدة 5 دقائق)`;
      sent = true;
    }
    
    if (sent) {
      res.json({
        success: true,
        message: '✅ تم إرسال رمز التحقق',
        expiry: expiry.toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال رمز التحقق'
      });
    }
    
  } catch (error) {
    console.error('❌ خطأ في إرسال رمز التحقق:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ التحقق من الرمز
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    const { data: verification, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !verification) {
      return res.status(400).json({
        success: false,
        message: '❌ رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }
    
    await supabase
      .from('verification_codes')
      .delete()
      .eq('id', verification.id);
    
    await supabase
      .from('users')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', userId);
    
    res.json({
      success: true,
      message: '✅ تم التحقق بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في التحقق من الرمز:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ الحصول على أجهزة المستخدم
app.get('/api/auth/devices/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لعرض أجهزة مستخدم آخر'
      });
    }
    
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل جلب الأجهزة'
      });
    }
    
    res.json({
      success: true,
      devices: devices || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الأجهزة:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ============================================
// 💰 3. نقاط نهاية الباقات والمدفوعات
// ============================================

// ✅ جلب الباقات
app.get('/api/payments/subscriptions', async (req, res) => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
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

// ✅ جلب إصدار الباقات (للكاش)
app.get('/api/payments/subscriptions/version', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب الإصدار' 
      });
    }
    
    const version = data && data.length > 0 
      ? new Date(data[0].updated_at).getTime() 
      : Date.now();
    
    res.json({
      success: true,
      data: { version: version }
    });
    
  } catch (error) {
    res.json({ success: true, data: { version: Date.now() } });
  }
});

// ✅ جلب طرق الدفع
app.get('/api/payments/payment-methods', async (req, res) => {
  try {
    const { country_code } = req.query;
    
    let query = supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (country_code) {
      query = query.contains('supported_countries', [country_code]);
    }
    
    const { data: paymentMethods, error } = await query;
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب طرق الدفع' 
      });
    }
    
    res.json({
      success: true,
      paymentMethods: paymentMethods || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب طرق الدفع:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب إصدار طرق الدفع
app.get('/api/payments/payment-methods/version', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const version = data && data.length > 0 
      ? new Date(data[0].updated_at).getTime() 
      : Date.now();
    
    res.json({
      success: true,
      data: { version: version }
    });
    
  } catch (error) {
    res.json({ success: true, data: { version: Date.now() } });
  }
});

// ✅ التحقق من صحة كود المحفظة
app.post('/api/payments/verify-wallet-code', authenticate, async (req, res) => {
  try {
    const { code, walletId, amount } = req.body;
    
    const sanitizedCode = sanitizeInput(code);
    const sanitizedWalletId = sanitizeInput(walletId);
    
    if (!sanitizedCode || !sanitizedWalletId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ الكود، معرف المحفظة، والمبلغ مطلوبة' 
      });
    }
    
    const { data: walletCode, error } = await supabase
      .from('wallet_codes')
      .select('*')
      .eq('code', sanitizedCode)
      .eq('wallet_id', sanitizedWalletId)
      .eq('is_used', false)
      .maybeSingle();
    
    if (error || !walletCode) {
      return res.status(400).json({
        success: false,
        message: '❌ الكود غير صالح أو مستخدم مسبقاً'
      });
    }
    
    const expiresAt = new Date(walletCode.expires_at);
    if (expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: '❌ انتهت صلاحية الكود'
      });
    }
    
    if (walletCode.amount < amount) {
      return res.status(400).json({
        success: false,
        message: '❌ رصيد الكود غير كافٍ'
      });
    }
    
    res.json({
      success: true,
      message: '✅ الكود صالح',
      data: walletCode
    });
    
  } catch (error) {
    console.error('❌ خطأ في التحقق من الكود:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تفعيل الاشتراك
app.post('/api/payments/activate-subscription', authenticate, async (req, res) => {
  try {
    const { userId, subscriptionId, code, walletId, amount } = req.body;
    
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لتفعيل اشتراك لمستخدم آخر'
      });
    }
    
    const sanitizedCode = sanitizeInput(code);
    const sanitizedWalletId = sanitizeInput(walletId);
    
    if (!userId || !subscriptionId || !sanitizedCode || !sanitizedWalletId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ جميع الحقول مطلوبة' 
      });
    }
    
    const { data: walletCode, error: codeError } = await supabase
      .from('wallet_codes')
      .select('*')
      .eq('code', sanitizedCode)
      .eq('wallet_id', sanitizedWalletId)
      .eq('is_used', false)
      .maybeSingle();
    
    if (codeError || !walletCode) {
      return res.status(400).json({
        success: false,
        message: '❌ الكود غير صالح'
      });
    }
    
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();
    
    if (subError || !subscription) {
      return res.status(404).json({
        success: false,
        message: '❌ الباقة غير موجودة'
      });
    }
    
    await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + subscription.duration_days);
    
    const { data: userSubscription, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        subscription_name: subscription.name,
        duration_days: subscription.duration_days,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        max_ads: subscription.max_ads,
        max_featured_ads: subscription.max_featured_ads || 0,
        max_notifications: subscription.max_notifications || 0,
        used_ads: 0,
        used_featured_ads: 0,
        used_notifications: 0,
        amount: amount,
        currency: 'YER',
        activation_source: 'wallet_code',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ فشل تفعيل الاشتراك:', insertError);
      return res.status(500).json({
        success: false,
        message: '❌ فشل تفعيل الاشتراك'
      });
    }
    
    await supabase
      .from('wallet_codes')
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString(),
        used_by_user_id: userId
      })
      .eq('id', walletCode.id);
    
    await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        currency: 'YER',
        status: 'completed',
        type: 'subscription',
        subscription_id: subscriptionId,
        subscription_name: subscription.name,
        payment_method: 'wallet',
        payment_method_name: walletCode.wallet_name || 'محفظة',
        transaction_number: `TXN_${Date.now()}`,
        completed_at: new Date().toISOString(),
        gateway_type: 'wallet_code',
        purchase_code_id: walletCode.id,
        confirmed_by: 'system',
        confirmed_at: new Date().toISOString()
      });
    
    res.json({
      success: true,
      message: '✅ تم تفعيل الاشتراك بنجاح',
      subscription: userSubscription
    });
    
  } catch (error) {
    console.error('❌ خطأ في تفعيل الاشتراك:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب معاملات المستخدم
app.get('/api/payments/transactions/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لعرض معاملات مستخدم آخر'
      });
    }
    
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المعاملات' 
      });
    }
    
    res.json({
      success: true,
      transactions: transactions || []
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
// 🏦 4. نقاط نهاية المحافظ
// ============================================

// ✅ جلب المحافظ المتاحة
app.get('/api/wallets/available', async (req, res) => {
  try {
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select(`
        *,
        wallet_types:wallet_type_id (
          id,
          name,
          name_ar,
          currency_code,
          currency_symbol,
          icon_url,
          color_code
        )
      `)
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ فشل جلب المحافظ:', error);
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المحافظ' 
      });
    }
    
    const formattedWallets = wallets.map(wallet => ({
      id: wallet.id,
      wallet_number: wallet.wallet_number,
      wallet_name: wallet.wallet_name,
      account_name: wallet.account_name,
      branch: wallet.branch,
      is_active: wallet.is_active,
      is_default: wallet.is_default,
      metadata: wallet.metadata,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
      wallet_type_id: wallet.wallet_type_id,
      wallet_type: wallet.wallet_types,
      name: wallet.wallet_name || wallet.wallet_number || 'محفظة',
      name_ar: wallet.wallet_name || wallet.wallet_number || 'محفظة'
    }));
    
    res.json({
      success: true,
      wallets: formattedWallets || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المحافظ:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب رصيد المستخدم في محفظة
app.get('/api/wallets/balance/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لعرض رصيد مستخدم آخر'
      });
    }
    
    const { data: userWallet, error } = await supabase
      .from('user_wallets')
      .select('balance, is_verified, is_primary')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب الرصيد' 
      });
    }
    
    res.json({
      success: true,
      balance: userWallet?.balance || 0,
      is_verified: userWallet?.is_verified || false,
      is_primary: userWallet?.is_primary || false
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الرصيد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ خصم رصيد من المحفظة
app.post('/api/wallets/deduct-balance', authenticate, async (req, res) => {
  try {
    const { userId, walletId, amount, transactionType, referenceId, description } = req.body;
    
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لخصم رصيد مستخدم آخر'
      });
    }
    
    const sanitizedWalletId = sanitizeInput(walletId);
    
    if (!userId || !sanitizedWalletId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ جميع الحقول مطلوبة' 
      });
    }
    
    const { data: userWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_id', sanitizedWalletId)
      .maybeSingle();
    
    if (walletError || !userWallet) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المحفظة غير موجودة' 
      });
    }
    
    if (userWallet.balance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ الرصيد غير كافٍ' 
      });
    }
    
    const newBalance = userWallet.balance - amount;
    const { error: updateError } = await supabase
      .from('user_wallets')
      .update({ 
        balance: newBalance,
        last_used_at: new Date().toISOString()
      })
      .eq('id', userWallet.id);
    
    if (updateError) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل تحديث الرصيد' 
      });
    }
    
    await supabase
      .from('wallet_transactions')
      .insert({
        user_wallet_id: userWallet.id,
        type: transactionType || 'deduction',
        amount: -amount,
        balance_before: userWallet.balance,
        balance_after: newBalance,
        status: 'completed',
        related_transaction_id: referenceId,
        description: description || `خصم ${amount} من المحفظة`,
        completed_at: new Date().toISOString()
      });
    
    res.json({
      success: true,
      message: '✅ تم خصم الرصيد بنجاح',
      data: {
        new_balance: newBalance,
        deducted_amount: amount
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في خصم الرصيد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ إنشاء كود شراء
app.post('/api/wallets/create-purchase-code', authenticate, async (req, res) => {
  try {
    const { userId, amount, walletId, expiryMinutes } = req.body;
    
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية إنشاء كود لمستخدم آخر'
      });
    }
    
    if (!userId || !amount || !walletId) {
      return res.status(400).json({
        success: false,
        message: '❌ جميع الحقول مطلوبة'
      });
    }
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (expiryMinutes || 10));
    
    const { data: purchaseCode, error } = await supabase
      .from('purchase_codes')
      .insert({
        code: code,
        user_id: userId,
        wallet_id: walletId,
        amount: amount,
        currency_code: 'YER',
        status: 'active',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ فشل إنشاء كود الشراء:', error);
      return res.status(500).json({
        success: false,
        message: '❌ فشل إنشاء الكود'
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم إنشاء كود الشراء بنجاح',
      data: purchaseCode
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء كود الشراء:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ صرف كود الشراء
app.post('/api/wallets/redeem-code', authenticate, async (req, res) => {
  try {
    const { code, userId } = req.body;
    
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية صرف كود لمستخدم آخر'
      });
    }
    
    const sanitizedCode = sanitizeInput(code);
    
    if (!sanitizedCode || !userId) {
      return res.status(400).json({
        success: false,
        message: '❌ جميع الحقول مطلوبة'
      });
    }
    
    const { data: purchaseCode, error } = await supabase
      .from('purchase_codes')
      .select('*')
      .eq('code', sanitizedCode)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error || !purchaseCode) {
      return res.status(400).json({
        success: false,
        message: '❌ الكود غير صالح'
      });
    }
    
    if (new Date(purchaseCode.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: '❌ انتهت صلاحية الكود'
      });
    }
    
    await supabase
      .from('purchase_codes')
      .update({
        status: 'used',
        used_by_user_id: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', purchaseCode.id);
    
    const { data: userWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_id', purchaseCode.wallet_id)
      .maybeSingle();
    
    if (walletError || !userWallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          wallet_id: purchaseCode.wallet_id,
          balance: purchaseCode.amount,
          is_verified: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ فشل إنشاء المحفظة:', createError);
        return res.status(500).json({
          success: false,
          message: '❌ فشل إضافة الرصيد'
        });
      }
      
      res.json({
        success: true,
        message: `✅ تم إضافة ${purchaseCode.amount} YER إلى رصيدك`,
        data: {
          amount: purchaseCode.amount,
          wallet: newWallet
        }
      });
    } else {
      const newBalance = userWallet.balance + purchaseCode.amount;
      
      await supabase
        .from('user_wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userWallet.id);
      
      res.json({
        success: true,
        message: `✅ تم إضافة ${purchaseCode.amount} YER إلى رصيدك`,
        data: {
          amount: purchaseCode.amount,
          new_balance: newBalance
        }
      });
    }
    
  } catch (error) {
    console.error('❌ خطأ في صرف الكود:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ جلب أكواد المستخدم
app.get('/api/wallets/user-codes/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لعرض أكواد مستخدم آخر'
      });
    }
    
    const { data: codes, error } = await supabase
      .from('purchase_codes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل جلب الأكواد'
      });
    }
    
    res.json({
      success: true,
      codes: codes || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الأكواد:', error);
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ============================================
// 🎯 5. نقاط نهاية الفلاتر
// ============================================

// ✅ جلب الفلاتر
app.get('/api/filters', async (req, res) => {
  try {
    const { data: smartFilters } = await supabase
      .from('smart_filters')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    const { data: appFilters } = await supabase
      .from('app_filters')
      .select('*')
      .eq('category', 'filters')
      .maybeSingle();
    
    const mergedData = appFilters?.values ?? {};
    
    const filtersByCategory = {};
    
    for (var filter of (smartFilters ?? [])) {
      const categoryId = filter.category_id;
      const filterKey = filter.filter_key;
      const options = filter.options ?? [];
      
      if (options.length === 0) continue;
      
      if (!filtersByCategory[categoryId]) {
        filtersByCategory[categoryId] = {};
      }
      filtersByCategory[categoryId][filterKey] = options;
    }
    
    mergedData.smart_filters = filtersByCategory;
    
    const conditions = [];
    const agencyTypes = [];
    
    for (var filter of (smartFilters ?? [])) {
      if (filter.filter_key.includes('condition')) {
        conditions.push(...(filter.options ?? []));
      }
      if (filter.filter_key.includes('agency')) {
        agencyTypes.push(...(filter.options ?? []));
      }
    }
    
    mergedData.conditions = [...new Set(conditions)];
    mergedData.agencyTypes = [...new Set(agencyTypes)];
    
    res.json({
      success: true,
      data: mergedData
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الفلاتر:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب إصدار الفلاتر
app.get('/api/filters/version', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_filters')
      .select('last_updated')
      .eq('category', 'filters')
      .maybeSingle();
    
    const version = data != null 
      ? new Date(data.last_updated).getTime() 
      : Date.now();
    
    res.json({
      success: true,
      data: { version: version }
    });
    
  } catch (error) {
    res.json({ success: true, data: { version: Date.now() } });
  }
});

// ============================================
// 👤 6. نقاط نهاية المستخدمين
// ============================================

// ✅ جلب بيانات المستخدم الحالي
app.get('/api/users/profile/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المستخدم غير موجود' 
      });
    }
    
    res.json({
      success: true,
      user: user
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المستخدم:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب بيانات مستخدم معين (مدير فقط)
app.get('/api/users/profile/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المستخدم غير موجود' 
      });
    }
    
    res.json({
      success: true,
      user: user
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المستخدم:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تحديث بيانات المستخدم
app.put('/api/users/profile/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية تعديل بيانات مستخدم آخر'
      });
    }
    
    const { name, phone, business_name, specializations, full_name, display_phone } = req.body;
    
    const updateData = {};
    if (name) updateData.name = sanitizeInput(name);
    if (phone) updateData.phone = sanitizeInput(phone);
    if (business_name !== undefined) updateData.business_name = sanitizeInput(business_name);
    if (specializations) updateData.specializations = specializations;
    if (full_name) updateData.full_name = sanitizeInput(full_name);
    if (display_phone) updateData.display_phone = sanitizeInput(display_phone);
    updateData.updated_at = new Date().toISOString();
    
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل تحديث البيانات' 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم تحديث البيانات بنجاح',
      user: user
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث المستخدم:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب تخصصات المستخدم
app.get('/api/users/specializations/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لعرض تخصصات مستخدم آخر'
      });
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('specializations')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المستخدم غير موجود' 
      });
    }
    
    res.json({
      success: true,
      specializations: user.specializations || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب التخصصات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تحديث تخصصات المستخدم
app.put('/api/users/specializations/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية تعديل تخصصات مستخدم آخر'
      });
    }
    
    const { specializations } = req.body;
    
    if (!specializations || !Array.isArray(specializations)) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ التخصصات يجب أن تكون مصفوفة' 
      });
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .update({ specializations })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل تحديث التخصصات' 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم تحديث التخصصات بنجاح',
      specializations: user.specializations
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث التخصصات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 🛒 7. نقاط نهاية المنتجات والطلبات
// ============================================

// ✅ جلب قائمة المنتجات
app.get('/api/products', async (req, res) => {
  try {
    const { category, seller, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('posted_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (category) {
      query = query.eq('category_id', category);
    }
    
    if (seller) {
      query = query.eq('seller_id', seller);
    }
    
    const { data: products, error } = await query;
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المنتجات' 
      });
    }
    
    res.json({
      success: true,
      products: products || [],
      count: products?.length || 0
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب تفاصيل منتج
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error || !product) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المنتج غير موجود' 
      });
    }
    
    await supabase
      .from('products')
      .update({ views: (product.views || 0) + 1 })
      .eq('id', id);
    
    res.json({
      success: true,
      product: product
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المنتج:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ إضافة منتج جديد
app.post('/api/products', authenticate, async (req, res) => {
  try {
    const productData = req.body;
    
    if (!productData.seller_id || !productData.title) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البائع والعنوان مطلوبان' 
      });
    }
    
    if (req.user.id !== productData.seller_id) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية إضافة منتج باسم مستخدم آخر'
      });
    }
    
    productData.title = sanitizeInput(productData.title);
    productData.description = sanitizeInput(productData.description || '');
    productData.seller_name = sanitizeInput(productData.seller_name);
    
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        ...productData,
        posted_date: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل إضافة المنتج' 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم إضافة المنتج بنجاح',
      product: product
    });
    
  } catch (error) {
    console.error('❌ خطأ في إضافة المنتج:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ إنشاء طلب شراء
app.post('/api/orders', authenticate, async (req, res) => {
  try {
    const { 
      user_id, product_id, quantity, notes, address, phone, 
      payment_method, is_paid_online, product_title, product_price, 
      product_image, seller_id, seller_name 
    } = req.body;
    
    if (req.user.id !== user_id) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية إنشاء طلب لمستخدم آخر'
      });
    }
    
    if (!user_id || !product_id || !quantity) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البيانات المطلوبة غير مكتملة' 
      });
    }
    
    const totalPrice = product_price * quantity;
    const orderId = `ORD_${Date.now()}`;
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: user_id,
        product_id: product_id,
        product_title: sanitizeInput(product_title || ''),
        product_price: product_price || 0,
        product_image: product_image || '',
        quantity: quantity,
        total_price: totalPrice,
        notes: sanitizeInput(notes || ''),
        address: sanitizeInput(address || ''),
        phone: sanitizeInput(phone || ''),
        payment_method: payment_method || 'cash',
        is_paid_online: is_paid_online || false,
        status: 'pending',
        seller_id: seller_id || '',
        seller_name: sanitizeInput(seller_name || ''),
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل إنشاء الطلب' 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم إنشاء الطلب بنجاح',
      order: order
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب طلبات المستخدم
app.get('/api/orders/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية لعرض طلبات مستخدم آخر'
      });
    }
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب الطلبات' 
      });
    }
    
    res.json({
      success: true,
      orders: orders || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تحديث حالة الطلب (مدير فقط)
app.put('/api/orders/:orderId/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ الحالة مطلوبة' 
      });
    }
    
    const { data: oldOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .maybeSingle();
    
    if (fetchError || !oldOrder) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ الطلب غير موجود' 
      });
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل تحديث الحالة' 
      });
    }
    
    await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        old_status: oldOrder.status,
        new_status: status,
        changed_by: req.user.id,
        notes: sanitizeInput(notes || ''),
        created_at: new Date().toISOString()
      });
    
    res.json({
      success: true,
      message: '✅ تم تحديث حالة الطلب',
      order: order
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 🏆 8. نقاط نهاية المزادات (Auctions)
// ============================================

// ✅ جلب جميع المزادات
app.get('/api/auctions', async (req, res) => {
  try {
    const { status, category, seller, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('auctions')
      .select(`
        *,
        product:products(*),
        seller:users!fk_auctions_seller(id, name, business_name, phone),
        bids:bids(*)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (category) {
      query = query.eq('category_id', category);
    }
    
    if (seller) {
      query = query.eq('seller_id', seller);
    }
    
    const { data: auctions, error } = await query;
    
    if (error) {
      console.error('❌ فشل جلب المزادات:', error);
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المزادات' 
      });
    }
    
    res.json({
      success: true,
      auctions: auctions || [],
      count: auctions?.length || 0
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المزادات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب المزادات النشطة
app.get('/api/auctions/active', async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('auctions')
      .select(`
        *,
        product:products(*),
        seller:users!fk_auctions_seller(id, name, business_name, phone),
        bids:bids(*)
      `)
      .eq('status', 'active')
      .order('end_time', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (category) {
      query = query.eq('category_id', category);
    }
    
    const { data: auctions, error } = await query;
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المزادات النشطة' 
      });
    }
    
    res.json({
      success: true,
      auctions: auctions || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المزادات النشطة:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب تفاصيل مزاد
app.get('/api/auctions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: auction, error } = await supabase
      .from('auctions')
      .select(`
        *,
        product:products(*),
        seller:users!fk_auctions_seller(id, name, business_name, phone),
        bids:bids(*)
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error || !auction) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المزاد غير موجود' 
      });
    }
    
    await supabase
      .from('auctions')
      .update({ views_count: (auction.views_count || 0) + 1 })
      .eq('id', id);
    
    res.json({
      success: true,
      auction: auction
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المزاد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب صور المزاد
app.get('/api/auctions/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: images, error } = await supabase
      .from('auction_images')
      .select('*')
      .eq('auction_id', id)
      .order('sort_order', { ascending: true });
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب صور المزاد' 
      });
    }
    
    res.json({
      success: true,
      images: images || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب صور المزاد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب تاريخ المزاد
app.get('/api/auctions/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: history, error } = await supabase
      .from('auction_history')
      .select('*')
      .eq('auction_id', id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب تاريخ المزاد' 
      });
    }
    
    res.json({
      success: true,
      history: history || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب تاريخ المزاد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ إنشاء مزاد جديد
app.post('/api/auctions', authenticate, async (req, res) => {
  try {
    const { 
      product_id, seller_id, starting_price, min_bid_increment, 
      end_time, reserve_price, is_wholesale, min_quantity,
      title, description, images, category_id, currency,
      is_public, allow_auto_bid, max_auto_bid_amount, is_private, invited_users
    } = req.body;
    
    if (!seller_id || !starting_price || !min_bid_increment || !end_time) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البيانات المطلوبة غير مكتملة' 
      });
    }
    
    if (req.user.id !== seller_id) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية إنشاء مزاد لمستخدم آخر'
      });
    }
    
    const { data: auction, error } = await supabase
      .from('auctions')
      .insert({
        product_id: product_id || null,
        seller_id: seller_id,
        starting_price: starting_price,
        current_price: starting_price,
        min_bid_increment: min_bid_increment,
        reserve_price: reserve_price || null,
        end_time: end_time,
        is_wholesale: is_wholesale || false,
        min_quantity: min_quantity || 1,
        status: 'active',
        title: sanitizeInput(title || ''),
        description: sanitizeInput(description || ''),
        images: images || [],
        category_id: category_id || null,
        currency: currency || 'YER',
        is_public: is_public !== undefined ? is_public : true,
        allow_auto_bid: allow_auto_bid || false,
        max_auto_bid_amount: max_auto_bid_amount || null,
        is_private: is_private || false,
        invited_users: invited_users || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ فشل إنشاء المزاد:', error);
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل إنشاء المزاد' 
      });
    }
    
    if (images && images.length > 0) {
      const imageInserts = images.map((url, index) => ({
        auction_id: auction.id,
        image_url: url,
        is_main: index === 0,
        sort_order: index,
        created_at: new Date().toISOString()
      }));
      
      await supabase.from('auction_images').insert(imageInserts);
    }
    
    if (product_id) {
      await supabase
        .from('products')
        .update({ is_auction: true, auction_id: auction.id })
        .eq('id', product_id);
    }
    
    res.json({
      success: true,
      message: '✅ تم إنشاء المزاد بنجاح',
      auction: auction
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المزاد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تقديم عرض في المزاد
app.post('/api/auctions/:id/bid', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, quantity, is_auto_bid, max_auto_bid_amount, is_anonymous, note } = req.body;
    
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ المبلغ مطلوب' 
      });
    }
    
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (auctionError || !auction) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المزاد غير موجود' 
      });
    }
    
    if (auction.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: '❌ المزاد منتهي أو ملغي' 
      });
    }
    
    if (auction.seller_id === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ لا يمكنك تقديم عرض على مزادك الخاص' 
      });
    }
    
    const minBid = auction.current_price + auction.min_bid_increment;
    if (amount < minBid) {
      return res.status(400).json({ 
        success: false, 
        message: `❌ أقل عرض هو ${minBid}` 
      });
    }
    
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        auction_id: id,
        user_id: req.user.id,
        user_name: req.user.business_name || req.user.name,
        amount: amount,
        quantity: quantity || 1,
        is_auto_bid: is_auto_bid || false,
        max_auto_bid_amount: max_auto_bid_amount || null,
        is_anonymous: is_anonymous || false,
        note: sanitizeInput(note || ''),
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (bidError) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل تقديم العرض' 
      });
    }
    
    await supabase
      .from('auctions')
      .update({
        current_price: amount,
        bid_count: (auction.bid_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    await supabase
      .from('auction_history')
      .insert({
        auction_id: id,
        action_type: 'bid',
        user_id: req.user.id,
        amount: amount,
        new_value: { bid_id: bid.id },
        created_at: new Date().toISOString()
      });
    
    res.json({
      success: true,
      message: '✅ تم تقديم العرض بنجاح',
      bid: bid
    });
    
  } catch (error) {
    console.error('❌ خطأ في تقديم العرض:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب عروض المزاد
app.get('/api/auctions/:id/bids', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: bids, error } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', id)
      .order('amount', { ascending: false });
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب العروض' 
      });
    }
    
    res.json({
      success: true,
      bids: bids || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب العروض:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ إنهاء المزاد
app.put('/api/auctions/:id/end', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (auctionError || !auction) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المزاد غير موجود' 
      });
    }
    
    if (auction.seller_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية إنهاء هذا المزاد'
      });
    }
    
    const { data: highestBid, error: bidError } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', id)
      .order('amount', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    await supabase
      .from('auctions')
      .update({
        status: 'ended',
        winner_id: highestBid?.user_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (auction.product_id) {
      await supabase
        .from('products')
        .update({ is_auction: false })
        .eq('auction_id', id);
    }
    
    await supabase
      .from('auction_history')
      .insert({
        auction_id: id,
        action_type: 'end',
        user_id: req.user.id,
        old_value: { status: auction.status },
        new_value: { status: 'ended', winner_id: highestBid?.user_id },
        created_at: new Date().toISOString()
      });
    
    res.json({
      success: true,
      message: '✅ تم إنهاء المزاد بنجاح',
      winner: highestBid
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنهاء المزاد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ إلغاء المزاد
app.put('/api/auctions/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (auctionError || !auction) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ المزاد غير موجود' 
      });
    }
    
    if (auction.seller_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية إلغاء هذا المزاد'
      });
    }
    
    await supabase
      .from('auctions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (auction.product_id) {
      await supabase
        .from('products')
        .update({ is_auction: false })
        .eq('auction_id', id);
    }
    
    await supabase
      .from('auction_history')
      .insert({
        auction_id: id,
        action_type: 'cancel',
        user_id: req.user.id,
        old_value: { status: auction.status },
        new_value: { status: 'cancelled' },
        created_at: new Date().toISOString()
      });
    
    res.json({
      success: true,
      message: '✅ تم إلغاء المزاد بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في إلغاء المزاد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ زيادة مشاهدات المزاد
app.post('/api/auctions/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: auction } = await supabase
      .from('auctions')
      .select('views_count')
      .eq('id', id)
      .maybeSingle();
    
    const currentViews = auction?.views_count || 0;
    
    await supabase
      .from('auctions')
      .update({ views_count: currentViews + 1 })
      .eq('id', id);
    
    res.json({
      success: true,
      message: '✅ تم تسجيل المشاهدة'
    });
    
  } catch (error) {
    console.error('❌ خطأ في زيادة المشاهدات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 🎫 9. نقاط نهاية اشتراكات المزادات
// ============================================

// ✅ جلب باقات اشتراكات المزادات
app.get('/api/auction-subscriptions', async (req, res) => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('auction_subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب باقات المزادات' 
      });
    }
    
    res.json({
      success: true,
      subscriptions: subscriptions || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب باقات المزادات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ شراء اشتراك مزادات
app.post('/api/auction-subscriptions/purchase', authenticate, async (req, res) => {
  try {
    const { subscription_id, user_id, amount, currency, payment_method_id } = req.body;
    
    if (req.user.id !== user_id) {
      return res.status(403).json({
        success: false,
        message: '❌ ليس لديك صلاحية شراء اشتراك لمستخدم آخر'
      });
    }
    
    if (!subscription_id || !user_id || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ جميع الحقول مطلوبة' 
      });
    }
    
    const { data: subscription, error: subError } = await supabase
      .from('auction_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .maybeSingle();
    
    if (subError || !subscription) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ الباقة غير موجودة' 
      });
    }
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + subscription.duration_days);
    
    const { data: userSubscription, error: insertError } = await supabase
      .from('user_auction_subscriptions')
      .insert({
        user_id: user_id,
        subscription_id: subscription_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        used_auctions: 0,
        max_auctions: subscription.max_auctions,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل شراء الاشتراك' 
      });
    }
    
    await supabase
      .from('payment_transactions')
      .insert({
        user_id: user_id,
        amount: amount,
        currency: currency || 'YER',
        status: 'completed',
        type: 'auction_subscription',
        subscription_id: subscription_id,
        subscription_name: subscription.name,
        payment_method_id: payment_method_id || 'wallet',
        transaction_number: `TXN_${Date.now()}`,
        completed_at: new Date().toISOString()
      });
    
    res.json({
      success: true,
      message: '✅ تم شراء اشتراك المزادات بنجاح',
      subscription: userSubscription
    });
    
  } catch (error) {
    console.error('❌ خطأ في شراء اشتراك المزادات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ جلب اشتراك المستخدم الحالي
app.get('/api/auction-subscriptions/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: subscription, error } = await supabase
      .from('user_auction_subscriptions')
      .select(`
        *,
        subscription:auction_subscriptions(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString())
      .maybeSingle();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب اشتراك المزادات' 
      });
    }
    
    res.json({
      success: true,
      subscription: subscription || null
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب اشتراك المزادات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تحديث استخدام المزادات (خصم مزاد)
app.put('/api/auction-subscriptions/use', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: subscription, error } = await supabase
      .from('user_auction_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString())
      .maybeSingle();
    
    if (error || !subscription) {
      return res.status(404).json({ 
        success: false, 
        message: '❌ لا يوجد اشتراك مزادات نشط' 
      });
    }
    
    const usedAuctions = (subscription.used_auctions || 0) + 1;
    const maxAuctions = subscription.max_auctions || 0;
    
    if (usedAuctions > maxAuctions) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ لقد استنفذت جميع المزادات المتاحة' 
      });
    }
    
    await supabase
      .from('user_auction_subscriptions')
      .update({
        used_auctions: usedAuctions,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);
    
    res.json({
      success: true,
      message: '✅ تم خصم مزاد بنجاح',
      remaining: maxAuctions - usedAuctions
    });
    
  } catch (error) {
    console.error('❌ خطأ في خصم المزاد:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 📊 10. نقاط نهاية المدير (Admin)
// ============================================

// ✅ إحصائيات النظام
app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    const { count: auctionsCount } = await supabase
      .from('auctions')
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
    
    res.json({
      success: true,
      stats: {
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        activeAuctions: auctionsCount || 0,
        todayOrders: todayOrders || 0,
        totalRevenue: totalRevenue
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

// ✅ جلب قائمة المستخدمين
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
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

// ✅ جلب جميع المعاملات
app.get('/api/admin/transactions', authenticate, isAdmin, async (req, res) => {
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

// ✅ جلب جميع المزادات للمدير
app.get('/api/admin/auctions', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('auctions')
      .select(`
        *,
        product:products(*),
        seller:users!fk_auctions_seller(id, name, business_name),
        bids:bids(*)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: auctions, error } = await query;
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المزادات للمدير' 
      });
    }
    
    res.json({
      success: true,
      auctions: auctions || [],
      count: auctions?.length || 0
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب المزادات للمدير:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 🛡️ معالجة الأخطاء
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ============================================
// 🚀 تشغيل الخادم
// ============================================
const server = app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 Email: ${BREVO_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔐 JWT: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

module.exports = app;