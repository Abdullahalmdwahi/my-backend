// ============================================
// 🧹 CRON - تنظيف البيانات القديمة
// ============================================

const cron = require('node-cron');
const { getSupabaseClient } = require('../config/supabase');

// ============================================
// 🧹 دالة تنظيف البيانات القديمة
// ============================================
async function cleanOldData() {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let results = {
      tokensDeleted: 0,
      sessionsDeleted: 0,
      logsDeleted: 0
    };

    // ✅ حذف tokens المنتهية
    try {
      const { count: tokensDeleted, error: tokenError } = await supabase
        .from('verification_tokens')
        .delete({ count: 'exact' })
        .lt('expires_at', now);

      if (!tokenError) {
        results.tokensDeleted = tokensDeleted || 0;
        console.log(`✅ حذف ${results.tokensDeleted} رمز تحقق منتهي`);
      } else {
        console.error('❌ خطأ في حذف tokens:', tokenError.message);
      }
    } catch (error) {
      console.error('❌ خطأ في حذف tokens:', error.message);
    }

    // ✅ حذف الجلسات القديمة
    try {
      const { count: sessionsDeleted, error: sessionError } = await supabase
        .from('sessions')
        .delete({ count: 'exact' })
        .lt('created_at', thirtyDaysAgo);

      if (!sessionError) {
        results.sessionsDeleted = sessionsDeleted || 0;
        console.log(`✅ حذف ${results.sessionsDeleted} جلسة قديمة`);
      } else {
        console.error('❌ خطأ في حذف الجلسات:', sessionError.message);
      }
    } catch (error) {
      console.error('❌ خطأ في حذف الجلسات:', error.message);
    }

    // ✅ حذف سجلات النشاط القديمة
    try {
      const { count: logsDeleted, error: logError } = await supabase
        .from('admin_activity_log')
        .delete({ count: 'exact' })
        .lt('created_at', thirtyDaysAgo);

      if (!logError) {
        results.logsDeleted = logsDeleted || 0;
        console.log(`✅ حذف ${results.logsDeleted} سجل نشاط قديم`);
      } else {
        console.error('❌ خطأ في حذف السجلات:', logError.message);
      }
    } catch (error) {
      console.error('❌ خطأ في حذف السجلات:', error.message);
    }

    return results;

  } catch (error) {
    console.error('❌ فشل تنظيف البيانات:', error.message);
    return { tokensDeleted: 0, sessionsDeleted: 0, logsDeleted: 0 };
  }
}

// ============================================
// ⏰ جدولة المهمة (كل يوم عند منتصف الليل)
// ============================================
function scheduleCleanup() {
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 جاري تنظيف البيانات القديمة...');
    try {
      const results = await cleanOldData();
      console.log(`✅ اكتمل التنظيف:`, results);
    } catch (error) {
      console.error('❌ فشل التنظيف:', error.message);
    }
  });
  
  console.log('✅ تم جدولة مهمة التنظيف (كل يوم عند منتصف الليل)');
}

// ============================================
// 🚀 تشغيل فوري
// ============================================
async function runNow() {
  console.log('🧹 جاري تنظيف البيانات القديمة (تشغيل فوري)...');
  try {
    const results = await cleanOldData();
    console.log(`✅ اكتمل التنظيف:`, results);
    return results;
  } catch (error) {
    console.error('❌ فشل التنظيف:', error.message);
    return { tokensDeleted: 0, sessionsDeleted: 0, logsDeleted: 0 };
  }
}

module.exports = {
  scheduleCleanup,
  runNow,
  cleanOldData,
};