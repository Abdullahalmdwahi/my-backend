// ============================================
// 🚀 خادم تطبيق السوق
// ============================================

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
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
app.use(express.json());

// ============================================
// 🌐 نقاط النهاية (Endpoints)
// ============================================

// ✅ اختبار الاتصال
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 خادم السوق يعمل بنجاح!',
    timestamp: new Date().toISOString()
  });
});

// ✅ التحقق من صحة كود المحفظة
app.post('/api/verify-wallet-code', async (req, res) => {
  try {
    const { code, walletId, amount } = req.body;
    
    // 1. التحقق من الكود في قاعدة البيانات
    const { data: walletCode, error } = await supabase
      .from('wallet_codes')
      .select('*')
      .eq('code', code)
      .eq('wallet_id', walletId)
      .eq('is_used', false)
      .single();
    
    if (error || !walletCode) {
      return res.status(400).json({
        success: false,
        message: '❌ الكود غير صالح أو مستخدم مسبقاً'
      });
    }
    
    // 2. التحقق من المبلغ
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
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ تفعيل الاشتراك
app.post('/api/activate-subscription', async (req, res) => {
  try {
    const { userId, subscriptionId, code, walletId, amount } = req.body;
    
    // 1. التحقق من الكود
    const { data: walletCode, error: codeError } = await supabase
      .from('wallet_codes')
      .select('*')
      .eq('code', code)
      .eq('wallet_id', walletId)
      .eq('is_used', false)
      .single();
    
    if (codeError || !walletCode) {
      return res.status(400).json({
        success: false,
        message: '❌ الكود غير صالح'
      });
    }
    
    // 2. تفعيل الاشتراك
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 يوم
    
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: parseInt(userId),
        subscription_id: subscriptionId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        remaining_ads: 10,
        remaining_featured_ads: 2
      })
      .select();
    
    if (subError) {
      return res.status(500).json({
        success: false,
        message: '❌ فشل تفعيل الاشتراك'
      });
    }
    
    // 3. تحديث حالة الكود (استخدامه)
    await supabase
      .from('wallet_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', walletCode.id);
    
    res.json({
      success: true,
      message: '✅ تم تفعيل الاشتراك بنجاح',
      subscription: subscription
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم'
    });
  }
});

// ✅ جلب الباقات المتاحة
app.get('/api/subscriptions', async (req, res) => {
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
      subscriptions: subscriptions
    });
    
  } catch (error) {
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
});