const cron = require('node-cron');
const AuctionModel = require('../models/Auction');

function scheduleAuctionEnd() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 جاري التحقق من المزادات المنتهية...');
    
    try {
      const endedCount = await AuctionModel.endExpiredAuctions();
      if (endedCount > 0) {
        console.log(`✅ تم إنهاء ${endedCount} مزاد منتهي`);
      }
    } catch (error) {
      console.error('❌ فشل إنهاء المزادات المنتهية:', error.message);
    }
  });
  
  console.log('✅ تم جدولة مهمة إنهاء المزادات (كل 5 دقائق)');
}

async function runNow() {
  console.log('🔄 جاري التحقق من المزادات المنتهية (تشغيل فوري)...');
  
  try {
    const endedCount = await AuctionModel.endExpiredAuctions();
    console.log(`✅ تم إنهاء ${endedCount} مزاد منتهي`);
    return endedCount;
  } catch (error) {
    console.error('❌ فشل إنهاء المزادات المنتهية:', error.message);
    return 0;
  }
}

module.exports = {
  scheduleAuctionEnd,
  runNow,
};