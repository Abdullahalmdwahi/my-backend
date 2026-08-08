// ============================================
// 🔄 CRON - إنهاء المزادات المنتهية
// ============================================

const cron = require('node-cron');
const { getSupabaseClient } = require('../config/supabase');

// ============================================
// 📋 دالة إنهاء المزادات المنتهية
// ============================================
async function endExpiredAuctions() {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // ✅ جلب المزادات المنتهية
    const { data: expiredAuctions, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .lt('end_time', now);

    if (error) {
      console.error('❌ خطأ في جلب المزادات المنتهية:', error.message);
      return 0;
    }

    if (!expiredAuctions || expiredAuctions.length === 0) {
      console.log('📋 لا توجد مزادات منتهية');
      return 0;
    }

    console.log(`📋 جاري إنهاء ${expiredAuctions.length} مزاد منتهي...`);

    let endedCount = 0;

    for (const auction of expiredAuctions) {
      try {
        // ✅ الحصول على أعلى عرض
        const { data: highestBid, error: bidError } = await supabase
          .from('bids')
          .select('*')
          .eq('auction_id', auction.id)
          .order('amount', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bidError) {
          console.error(`❌ خطأ في جلب أعلى عرض للمزاد ${auction.id}:`, bidError.message);
          continue;
        }

        // ✅ تحديث حالة المزاد
        const { error: updateError } = await supabase
          .from('auctions')
          .update({
            status: 'ended',
            winner_id: highestBid?.user_id || null,
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', auction.id);

        if (updateError) {
          console.error(`❌ خطأ في إنهاء المزاد ${auction.id}:`, updateError.message);
          continue;
        }

        endedCount++;
        console.log(`✅ تم إنهاء المزاد ${auction.id} - الفائز: ${highestBid?.user_id || 'لا يوجد'}`);

        // ✅ إضافة تأخير بين العمليات
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ خطأ في معالجة المزاد ${auction.id}:`, error.message);
      }
    }

    console.log(`✅ تم إنهاء ${endedCount} مزاد بنجاح`);
    return endedCount;

  } catch (error) {
    console.error('❌ خطأ في إنهاء المزادات:', error.message);
    return 0;
  }
}

// ============================================
// ⏰ جدولة المهمة (كل 5 دقائق)
// ============================================
function scheduleAuctionEnd() {
  // ✅ تشغيل كل 5 دقائق
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 جاري التحقق من المزادات المنتهية...');
    try {
      const count = await endExpiredAuctions();
      if (count > 0) {
        console.log(`✅ تم إنهاء ${count} مزاد منتهي`);
      }
    } catch (error) {
      console.error('❌ فشل في إنهاء المزادات:', error.message);
    }
  });
  
  console.log('✅ تم جدولة مهمة إنهاء المزادات (كل 5 دقائق)');
}

// ============================================
// 🚀 تشغيل فوري
// ============================================
async function runNow() {
  console.log('🔄 جاري التحقق من المزادات المنتهية (تشغيل فوري)...');
  try {
    const count = await endExpiredAuctions();
    console.log(`✅ تم إنهاء ${count} مزاد منتهي`);
    return count;
  } catch (error) {
    console.error('❌ فشل في إنهاء المزادات:', error.message);
    return 0;
  }
}

module.exports = {
  scheduleAuctionEnd,
  runNow,
  endExpiredAuctions,
};