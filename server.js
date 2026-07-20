// ============================================
// 🚀 خادم تطبيق السوق - مع Brevo API
// ============================================

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
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
// 📧 إعداد Brevo API
// ============================================
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'aillaillabdullah85@gmail.com';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Almedwahi';

// ✅ دالة إرسال إيميل عبر Brevo API
async function sendEmailViaBrevo(to, subject, htmlContent, textContent) {
  try {
    console.log(`📧 [Brevo API] بدء إرسال إلى: ${to}`);

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: BREVO_FROM_NAME,
          email: BREVO_FROM_EMAIL,
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        timeout: 15000,
      }
    );

    console.log(`✅ [Brevo API] تم الإرسال بنجاح إلى: ${to}`);
    console.log(`📧 Message ID: ${response.data.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ [Brevo API] فشل الإرسال:', error.response?.data || error.message);
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
      '<h1>✅ نجاح الاتصال!</h1><p>تم إرسال هذا الإيميل عبر Brevo API بنجاح.</p>'
    );

    if (testResult) {
      res.json({
        success: true,
        message: '✅ Brevo API يعمل بشكل صحيح! تم إرسال إيميل اختبار.',
        config: {
          from: BREVO_FROM_EMAIL,
          apiKey: BREVO_API_KEY ? 'موجود ✅' : 'غير موجود ❌',
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ فشل إرسال إيميل الاختبار، تحقق من API Key',
      });
    }
  } catch (error) {
    console.error('❌ فشل اختبار Brevo API:', error);
    res.status(500).json({
      success: false,
      message: '❌ فشل الاتصال بـ Brevo API',
      error: error.message,
    });
  }
});

// ============================================
// 🔐 1. مجموعة المصادقة (Auth)
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
// 💰 2. مجموعة المدفوعات (Payments)
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

// ✅ التحقق من صحة كود المحفظة
app.post('/api/payments/verify-wallet-code', async (req, res) => {
  try {
    const { code, walletId, amount } = req.body;
    
    if (!code || !walletId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ الكود، معرف المحفظة، والمبلغ مطلوبة' 
      });
    }
    
    const { data: walletCode, error } = await supabase
      .from('wallet_codes')
      .select('*')
      .eq('code', code)
      .eq('wallet_id', walletId)
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
app.post('/api/payments/activate-subscription', async (req, res) => {
  try {
    const { userId, subscriptionId, code, walletId, amount } = req.body;
    
    if (!userId || !subscriptionId || !code || !walletId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ جميع الحقول مطلوبة' 
      });
    }
    
    const { data: walletCode, error: codeError } = await supabase
      .from('wallet_codes')
      .select('*')
      .eq('code', code)
      .eq('wallet_id', walletId)
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
app.get('/api/payments/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
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
// 🏦 3. مجموعة المحافظ (Wallets)
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
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب المحافظ' 
      });
    }
    
    res.json({
      success: true,
      wallets: wallets || []
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
app.get('/api/wallets/balance/:userId/:walletId', async (req, res) => {
  try {
    const { userId, walletId } = req.params;
    
    const { data: userWallet, error } = await supabase
      .from('user_wallets')
      .select('balance, is_verified, is_primary')
      .eq('user_id', userId)
      .eq('wallet_id', walletId)
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
app.post('/api/wallets/deduct-balance', async (req, res) => {
  try {
    const { userId, walletId, amount, transactionType, referenceId, description } = req.body;
    
    if (!userId || !walletId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ جميع الحقول مطلوبة' 
      });
    }
    
    const { data: userWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_id', walletId)
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
    
    const { error: transactionError } = await supabase
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
    
    if (transactionError) {
      console.error('❌ فشل تسجيل المعاملة:', transactionError);
    }
    
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

// ============================================
// 👤 4. مجموعة المستخدمين (Users)
// ============================================

// ✅ جلب بيانات المستخدم
app.get('/api/users/profile/:userId', async (req, res) => {
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
app.put('/api/users/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, business_name, specializations, full_name, display_phone } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (business_name !== undefined) updateData.business_name = business_name;
    if (specializations) updateData.specializations = specializations;
    if (full_name) updateData.full_name = full_name;
    if (display_phone) updateData.display_phone = display_phone;
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
        message: `❌ فشل تحديث البيانات: ${error.message}` 
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
app.get('/api/users/specializations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
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
app.put('/api/users/specializations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
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
        message: `❌ فشل تحديث التخصصات: ${error.message}` 
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
// 🛒 5. مجموعة المنتجات والطلبات (Products & Orders)
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
app.post('/api/products', async (req, res) => {
  try {
    const productData = req.body;
    
    if (!productData.seller_id || !productData.title) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ البائع والعنوان مطلوبان' 
      });
    }
    
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
        message: `❌ فشل إضافة المنتج: ${error.message}` 
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
app.post('/api/orders', async (req, res) => {
  try {
    const { 
      user_id, product_id, quantity, notes, address, phone, 
      payment_method, is_paid_online, product_title, product_price, 
      product_image, seller_id, seller_name 
    } = req.body;
    
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
        product_title: product_title || '',
        product_price: product_price || 0,
        product_image: product_image || '',
        quantity: quantity,
        total_price: totalPrice,
        notes: notes || '',
        address: address || '',
        phone: phone || '',
        payment_method: payment_method || 'cash',
        is_paid_online: is_paid_online || false,
        status: 'pending',
        seller_id: seller_id || '',
        seller_name: seller_name || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: `❌ فشل إنشاء الطلب: ${error.message}` 
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
app.get('/api/orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
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

// ✅ تحديث حالة الطلب
app.put('/api/orders/:orderId/status', async (req, res) => {
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
      .select('status')
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
        message: `❌ فشل تحديث الحالة: ${error.message}` 
      });
    }
    
    await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        old_status: oldOrder.status,
        new_status: status,
        notes: notes || '',
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
// 🔔 6. مجموعة الإشعارات (Notifications)
// ============================================

// ✅ جلب إشعارات المستخدم
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: '❌ فشل جلب الإشعارات' 
      });
    }
    
    res.json({
      success: true,
      notifications: notifications || []
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الإشعارات:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ✅ تحديث حالة قراءة الإشعار
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: `❌ فشل تحديث الإشعار: ${error.message}` 
      });
    }
    
    res.json({
      success: true,
      message: '✅ تم تحديث الإشعار',
      notification: notification
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث الإشعار:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ حدث خطأ في الخادم' 
    });
  }
});

// ============================================
// 📧 7. مجموعة الإيميلات (Email) - مع Brevo API
// ============================================

// ✅ إرسال إيميل عام
app.post('/api/email/send', async (req, res) => {
  const startTime = Date.now();
  console.log(`📧 [${new Date().toISOString()}] بدء إرسال إيميل (API)`);

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

    const result = await sendEmailViaBrevo(to, subject, html, text);

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

    const result = await sendEmailViaBrevo(to, subject, html);

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

    const result = await sendEmailViaBrevo(to, subject, html);

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

    const result = await sendEmailViaBrevo(to, subject, html);

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
// 📊 8. مجموعة المدير (Admin)
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
  console.log(`📧 Brevo API: ${BREVO_API_KEY ? '✅ تم الإعداد' : '❌ مفقود'}`);
  console.log(`📧 من: ${BREVO_FROM_EMAIL}`);
});