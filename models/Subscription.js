// ============================================
// 📦 SUBSCRIPTION MODEL - معدل ✅
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');

class SubscriptionModel {
  static get table() { return TABLES.subscriptions; }
  static get userTable() { return TABLES.userSubscriptions; }
  static get auctionTable() { return TABLES.userAuctionSubscriptions; }
  
  // ============================================
  // 🔍 FIND METHODS
  // ============================================
  
  static async findById(id) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findAll(options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*');
    
    if (options.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }
    
    if (options.subscriptionType) {
      query = query.eq('subscription_type', options.subscriptionType);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ============================================
  // 👤 USER SUBSCRIPTION METHODS
  // ============================================
  
  static async getUserActiveSubscription(userId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.userTable)
      .select('*, subscription:subscriptions(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString())
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async getUserSubscriptions(userId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.userTable)
      .select('*, subscription:subscriptions(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  static async createUserSubscription(userId, subscriptionId, amount, currency, paymentMethodId) {
    const client = getSupabaseClient();
    
    const subscription = await this.findById(subscriptionId);
    if (!subscription) throw new Error('⚠️ الباقة غير موجودة');
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + subscription.duration_days * 24 * 60 * 60 * 1000);
    
    const { data, error } = await client
      .from(this.userTable)
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        subscription_name: subscription.name,
        duration_days: subscription.duration_days,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        max_ads: subscription.max_ads,
        max_featured_ads: subscription.max_featured_ads || 0,
        max_notifications: subscription.max_notifications || 0,
        used_ads: 0,
        used_featured_ads: 0,
        used_notifications: 0,
        is_active: true,
        amount,
        currency,
        payment_method_id: paymentMethodId,
        activation_source: 'subscription',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async deactivateUserSubscription(userSubscriptionId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(this.userTable)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userSubscriptionId);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 🔨 AUCTION SUBSCRIPTION METHODS
  // ============================================
  
  static async getUserAuctionSubscription(userId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.auctionTable)
      .select('*, subscription:auction_subscriptions(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString())
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async createAuctionUserSubscription(userId, subscriptionId, amount, currency, paymentMethodId) {
    const client = getSupabaseClient();
    
    const subscription = await this.findAuctionSubscriptionById(subscriptionId);
    if (!subscription) throw new Error('⚠️ باقة المزادات غير موجودة');
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + subscription.duration_days * 24 * 60 * 60 * 1000);
    
    const { data, error } = await client
      .from(this.auctionTable)
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        used_auctions: 0,
        max_auctions: subscription.max_auctions,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // ============================================
  // 🔍 AUCTION SUBSCRIPTION FIND METHODS
  // ============================================
  
  static async findAuctionSubscriptionById(id) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.auctionSubscriptions)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findAllAuctionSubscriptions(options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(TABLES.auctionSubscriptions)
      .select('*');
    
    if (options.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async getUserSubscriptionStats(userId) {
    const subscription = await this.getUserActiveSubscription(userId);
    
    if (!subscription) {
      return {
        hasActive: false,
        remainingAds: 0,
        remainingFeaturedAds: 0,
        remainingNotifications: 0,
        expiresIn: null,
      };
    }
    
    const remainingDays = Math.max(0, Math.ceil(
      (new Date(subscription.end_date) - new Date()) / (24 * 60 * 60 * 1000)
    ));
    
    return {
      hasActive: true,
      remainingAds: subscription.max_ads - subscription.used_ads,
      remainingFeaturedAds: subscription.max_featured_ads - subscription.used_featured_ads,
      remainingNotifications: subscription.max_notifications - subscription.used_notifications,
      expiresIn: remainingDays,
      subscriptionName: subscription.subscription_name,
      endDate: subscription.end_date,
    };
  }
  
  static async getAuctionSubscriptionStats(userId) {
    const subscription = await this.getUserAuctionSubscription(userId);
    
    if (!subscription) {
      return {
        hasActive: false,
        remainingAuctions: 0,
        expiresIn: null,
      };
    }
    
    const remainingDays = Math.max(0, Math.ceil(
      (new Date(subscription.end_date) - new Date()) / (24 * 60 * 60 * 1000)
    ));
    
    return {
      hasActive: true,
      remainingAuctions: subscription.max_auctions - subscription.used_auctions,
      expiresIn: remainingDays,
      subscriptionName: subscription.subscription?.name || 'باقة مزادات',
      endDate: subscription.end_date,
    };
  }
}

module.exports = SubscriptionModel;