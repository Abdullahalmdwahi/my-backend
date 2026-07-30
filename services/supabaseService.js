// services/supabaseService.js
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

module.exports = {
  supabase,
  supabaseAdmin,
  fetchData,
  insertData,
  updateData,
  deleteData,
  getAuctionsWithDetails
};