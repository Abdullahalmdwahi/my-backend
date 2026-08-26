// ============================================
// 🔐 SUPABASE CLIENT CONFIGURATION
// ============================================

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// ============================================
// 📊 TABLE NAMES
// ============================================

const TABLES = {
  users: 'users',
  admins: 'admins',
  userTypes: 'user_types',
  products: 'products',
  pendingProducts: 'pending_products',
  productImages: 'product_images',
  categories: 'categories',
  orders: 'orders',
  orderMessages: 'order_messages',
  orderStatusHistory: 'order_status_history',
  auctions: 'auctions',
  bids: 'bids',
  auctionImages: 'auction_images',
  subscriptions: 'subscriptions',
  userSubscriptions: 'user_subscriptions',
  paymentTransactions: 'payment_transactions',
  paymentMethods: 'payment_methods',
  wallets: 'wallets',
  walletTypes: 'wallet_types',
  walletCodes: 'wallet_codes',
  walletTransactions: 'wallet_transactions',
  notifications: 'notifications',
  globalNotifications: 'global_notifications',
  adminNotifications: 'admin_notifications',
  verificationTokens: 'verification_tokens',
  devices: 'devices',
  sessions: 'sessions',
  userLogins: 'user_logins',
  userLocations: 'user_locations',
  supportTickets: 'support_tickets',
  ticketMessages: 'ticket_messages',
  refresh_tokens: 'refresh_tokens',
};

// ============================================
// 🔐 SUPABASE CLIENTS
// ============================================

let supabaseClient = null;
let supabaseAdmin = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('⚠️ SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }
    
    // ✅ ✅ ✅ إصلاح WebSocket - تعطيل Realtime بالكامل
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      // ✅ تعطيل Realtime تماماً
      realtime: {
        params: {
          eventsPerSecond: 1,
        },
      },
    });
    
    // ✅ منع محاولة الاتصال بـ WebSocket
    console.log('✅ Supabase client initialized (Realtime disabled)');
  }
  return supabaseClient;
}

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('⚠️ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 1,
        },
      },
    });
    
    console.log('✅ Supabase admin client initialized (Realtime disabled)');
  }
  return supabaseAdmin;
}

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

function isValidUUID(id) {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function toSafeId(id) {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return id.toString();
  return String(id);
}

function generateUUID() {
  return uuidv4();
}

function generateShortId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function generateIntId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function isValidId(id) {
  if (!id) return false;
  if (typeof id === 'number') return id > 0;
  if (typeof id === 'string') {
    const parsed = parseInt(id);
    return !isNaN(parsed) && parsed > 0;
  }
  return false;
}

// ============================================
// 📦 STORAGE HELPERS
// ============================================

async function uploadFile(bucket, path, file, options = {}) {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, options);
  
  if (error) throw error;
  return data;
}

async function getPublicUrl(bucket, path) {
  const client = getSupabaseClient();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function deleteFile(bucket, path) {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucket)
    .remove([path]);
  
  if (error) throw error;
  return data;
}

// ============================================
// 📤 EXPORTS
// ============================================

module.exports = {
  TABLES,
  getSupabaseClient,
  getSupabaseAdmin,
  isValidUUID,
  toSafeId,
  generateUUID,
  generateShortId,
  generateId,
  generateIntId,
  isValidId,
  uploadFile,
  getPublicUrl,
  deleteFile,
};