// ============================================
// 🗄️ خدمة الاتصال بـ Supabase
// ============================================

const { createClient } = require('@supabase/supabase-js');

// ✅ قراءة المتغيرات البيئية
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ إنشاء عميل Supabase (Anon)
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ إنشاء عميل Supabase (Service Role - للعمليات الإدارية)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

// ✅ دوال مساعدة
async function fetchData(table, filters = {}, options = {}) {
  try {
    let query = supabase.from(table).select(options.select || '*');
    
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`❌ فشل جلب البيانات من ${table}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function insertData(table, data) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error(`❌ فشل إضافة بيانات إلى ${table}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function updateData(table, id, data, idField = 'id') {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq(idField, id)
      .select();
    
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error(`❌ فشل تحديث بيانات في ${table}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function deleteData(table, id, idField = 'id') {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idField, id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`❌ فشل حذف بيانات من ${table}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ✅ دوال خاصة بالمزادات
async function getAuctionsWithDetails(filters = {}, options = {}) {
  try {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        product:products(*),
        seller:users!fk_auctions_seller(id, name, business_name, phone),
        bids:bids(*)
      `);
    
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('❌ فشل جلب المزادات:', error.message);
    return { success: false, error: error.message };
  }
}

// ✅ دوال خاصة بالمزادات - الحصول على المزادات النشطة
async function getActiveAuctions(filters = {}) {
  try {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        product:products(*),
        seller:users!fk_auctions_seller(id, name, business_name, phone),
        bids:bids(*)
      `)
      .eq('status', 'active')
      .order('end_time', { ascending: true });
    
    if (filters.category) {
      query = query.eq('category_id', filters.category);
    }
    
    if (filters.seller) {
      query = query.eq('seller_id', filters.seller);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('❌ فشل جلب المزادات النشطة:', error.message);
    return { success: false, error: error.message };
  }
}

// ✅ دوال خاصة بالمزادات - الحصول على مزاد بواسطة ID
async function getAuctionById(id) {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        product:products(*),
        seller:users!fk_auctions_seller(id, name, business_name, phone),
        bids:bids(*)
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`❌ فشل جلب المزاد ${id}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ✅ دوال خاصة بالمزادات - إنشاء عرض
async function createBid(auctionId, userId, amount, quantity = 1) {
  try {
    // ✅ التحقق من المزاد
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .maybeSingle();
    
    if (auctionError || !auction) {
      return { success: false, error: '❌ المزاد غير موجود' };
    }
    
    if (auction.status !== 'active') {
      return { success: false, error: '❌ المزاد منتهي أو ملغي' };
    }
    
    // ✅ التحقق من الحد الأدنى
    const minBid = auction.current_price + auction.min_bid_increment;
    if (amount < minBid) {
      return { success: false, error: `❌ أقل عرض هو ${minBid}` };
    }
    
    // ✅ إنشاء العرض
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        auction_id: auctionId,
        user_id: userId,
        amount: amount,
        quantity: quantity || 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (bidError) throw bidError;
    
    // ✅ تحديث المزاد
    await supabase
      .from('auctions')
      .update({
        current_price: amount,
        bid_count: (auction.bid_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', auctionId);
    
    return { success: true, data: bid };
  } catch (error) {
    console.error('❌ فشل إنشاء العرض:', error.message);
    return { success: false, error: error.message };
  }
}

// ✅ دوال خاصة بالمزادات - إنهاء المزاد
async function endAuction(auctionId, userId) {
  try {
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .maybeSingle();
    
    if (auctionError || !auction) {
      return { success: false, error: '❌ المزاد غير موجود' };
    }
    
    if (auction.seller_id !== userId) {
      return { success: false, error: '❌ ليس لديك صلاحية إنهاء هذا المزاد' };
    }
    
    const { data: highestBid, error: bidError } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', auctionId)
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
      .eq('id', auctionId);
    
    return { success: true, data: { winner: highestBid } };
  } catch (error) {
    console.error('❌ فشل إنهاء المزاد:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  fetchData,
  insertData,
  updateData,
  deleteData,
  getAuctionsWithDetails,
  getActiveAuctions,
  getAuctionById,
  createBid,
  endAuction
};