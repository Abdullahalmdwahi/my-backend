// ============================================
// 🧹 CRON - تنظيف البيانات القديمة
// ============================================

const cron = require('node-cron');
const { getSupabaseAdmin } = require('../config/supabase');

// ============================================
// 🕒 جدولة المهمة كل يوم عند منتصف الليل
// ============================================

function scheduleCleanup() {
  // تشغيل كل يوم عند منتصف الليل
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 جاري تنظيف البيانات القديمة...');
    
    try {
      const supabase = getSupabaseAdmin();
      const now = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // حذف tokens المنتهية
      const { count: tokensDeleted } = await supabase
        .from('verification_tokens')
        .delete()
        .lt('expires_at', now);
      
      // حذف الجلسات القديمة
      const { count: sessionsDeleted } = await supabase
        .from('sessions')
        .delete()
        .lt('created_at', thirtyDaysAgo);
      
      // حذف سجلات النشاط القديمة
      const { count: logsDeleted } = await supabase
        .from('admin_activity_log')
        .delete()
        .lt('created_at', thirtyDaysAgo);
      
      console.log(`✅ تم تنظيف البيانات القديمة:`);
      console.log(`   - ${tokensDeleted || 0} رمز تحقق منتهي`);
      console.log(`   - ${sessionsDeleted || 0} جلسة قديمة`);
      console.log(`   - ${logsDeleted || 0} سجل نشاط قديم`);
      
    } catch (error) {
      console.error('❌ فشل تنظيف البيانات القديمة:', error.message);
    }
  });
  
  console.log('✅ تم جدولة مهمة تنظيف البيانات (كل يوم في منتصف الليل)');
}

// ============================================
// 🔄 تشغيل فوري للتنظيف
// ============================================

async function runNow() {
  console.log('🧹 جاري تنظيف البيانات القديمة (تشغيل فوري)...');
  
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // حذف tokens المنتهية
    const { count: tokensDeleted } = await supabase
      .from('verification_tokens')
      .delete()
      .lt('expires_at', now);
    
    // حذف الجلسات القديمة
    const { count: sessionsDeleted } = await supabase
      .from('sessions')
      .delete()
      .lt('created_at', thirtyDaysAgo);
    
    console.log(`✅ تم تنظيف البيانات القديمة:`);
    console.log(`   - ${tokensDeleted || 0} رمز تحقق منتهي`);
    console.log(`   - ${sessionsDeleted || 0} جلسة قديمة`);
    
    return { tokensDeleted, sessionsDeleted };
  } catch (error) {
    console.error('❌ فشل تنظيف البيانات القديمة:', error.message);
    return { tokensDeleted: 0, sessionsDeleted: 0 };
  }
}

module.exports = {
  scheduleCleanup,
  runNow,
};