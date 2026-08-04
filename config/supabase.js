// ============================================
// 🔐 SUPABASE CLIENT CONFIGURATION
// ============================================

const { createClient } = require('@supabase/supabase-js');
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
  productGuarantees: 'product_guarantees',
  productOffers: 'product_offers',
  productComments: 'product_comments',
  categories: 'categories',
  customCategories: 'custom_categories',
  favorites: 'favorites',
  comments: 'comments',
  ratings: 'ratings',
  orders: 'orders',
  orderMessages: 'order_messages',
  orderStatusHistory: 'order_status_history',
  auctions: 'auctions',
  bids: 'bids',
  auctionImages: 'auction_images',
  auctionHistory: 'auction_history',
  auctionCategories: 'auction_categories',
  auctionSubscriptions: 'auction_subscriptions',
  userAuctionSubscriptions: 'user_auction_subscriptions',
  subscriptions: 'subscriptions',
  userSubscriptions: 'user_subscriptions',
  subscriptionPrices: 'subscription_prices',
  paymentTransactions: 'payment_transactions',
  paymentMethods: 'payment_methods',
  paymentGateways: 'payment_gateways',
  paymentWebhookLogs: 'payment_webhook_logs',
  wallets: 'wallets',
  walletTypes: 'wallet_types',
  walletCodes: 'wallet_codes',
  walletTransactions: 'wallet_transactions',
  walletVerifications: 'wallet_verifications',
  walletWebhookLogs: 'wallet_webhook_logs',
  purchaseCodes: 'purchase_codes',
  userWallets: 'user_wallets',
  notifications: 'notifications',
  globalNotifications: 'global_notifications',
  adminNotifications: 'admin_notifications',
  notificationLogs: 'notification_logs',
  verificationTokens: 'verification_tokens',
  deviceTokens: 'device_tokens',
  devices: 'devices',
  sessions: 'sessions',
  userLogins: 'user_logins',
  userLocations: 'user_locations',
  userVerifications: 'user_verifications',
  userPoints: 'user_points',
  pointsTransactions: 'points_transactions',
  forcedAds: 'forced_ads',
  adCampaigns: 'ad_campaigns',
  adHistory: 'ad_history',
  adRemovalPurchases: 'ad_removal_purchases',
  campaignPackages: 'campaign_packages',
  appSettings: 'app_settings',
  appFilters: 'app_filters',
  appStats: 'app_stats',
  appSync: 'app_sync',
  securityEvents: 'security_events',
  supportTickets: 'support_tickets',
  ticketMessages: 'ticket_messages',
  chatMessages: 'chat_messages',
  successStories: 'success_stories',
  referrals: 'referrals',
  reports: 'reports',
  smartFilters: 'smart_filters',
  categoryFilters: 'category_filters',
  countries: 'countries',
  invoices: 'invoices',
  approvalRequests: 'approval_requests',
  adminActivityLog: 'admin_activity_log',
  aiSuggestions: 'ai_suggestions',
  questions: 'questions',
  answers: 'answers',
};

// ============================================
// 🔐 SUPABASE CLIENT
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
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
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
    
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase admin client initialized');
  }
  return supabaseAdmin;
}

// ============================================
// 🛠️ HELPER FUNCTIONS - تم إصلاحها ✅
// ============================================

/**
 * التحقق من صحة UUID
 * @param {string} id - المعرف المراد التحقق منه
 * @returns {boolean} - صحيح إذا كان UUID صالحاً
 */
function isValidUUID(id) {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  // التحقق من صيغة UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * تحويل المعرف إلى String بشكل آمن (للمعرفات التي قد تكون أرقام)
 * @param {string|number} id - المعرف
 * @returns {string} - المعرف كـ String
 */
function toSafeId(id) {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return id.toString();
  return String(id);
}

/**
 * توليد معرف UUID جديد
 * @returns {string} - UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * توليد معرف قصير (للطلبات والمزادات)
 * @returns {string} - معرف قصير
 */
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
// 🔐 RLS HELPERS (Admin only)
// ============================================

async function enableRLS(table) {
  const admin = getSupabaseAdmin();
  // RLS can only be enabled via SQL, not via JS SDK
  // This is a placeholder
  console.log(`⚠️ RLS for ${table} must be enabled via SQL`);
  return true;
}

async function createRLSPolicy(table, name, definition) {
  // RLS policies can only be created via SQL
  console.log(`⚠️ RLS policy for ${table} must be created via SQL`);
  return true;
}

// ============================================
// 📊 QUERY HELPERS
// ============================================

function buildQuery(table, filters = {}, options = {}) {
  const client = getSupabaseClient();
  let query = client.from(table).select(options.select || '*');
  
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (typeof value === 'object' && value !== null) {
      if (value.gte) query = query.gte(key, value.gte);
      if (value.lte) query = query.lte(key, value.lte);
      if (value.gt) query = query.gt(key, value.gt);
      if (value.lt) query = query.lt(key, value.lt);
      if (value.neq) query = query.neq(key, value.neq);
      if (value.like) query = query.ilike(key, value.like);
    } else {
      query = query.eq(key, value);
    }
  }
  
  if (options.orderBy) {
    query = query.order(options.orderBy, { 
      ascending: options.ascending !== false 
    });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }
  
  return query;
}

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
  enableRLS,
  createRLSPolicy,
  buildQuery,
};