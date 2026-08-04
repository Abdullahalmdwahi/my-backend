// ============================================
// 💰 PAYMENT MODEL - جديد ✅
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');

class PaymentModel {
  static get table() { return TABLES.paymentTransactions; }
  
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
  
  static async findByTransactionNumber(transactionNumber) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('transaction_number', transactionNumber)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findByUser(userId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .eq('user_id', userId);
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  static async findPending(options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .eq('status', 'pending');
    
    if (options.gatewayType) {
      query = query.eq('gateway_type', options.gatewayType);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ============================================
  // ✏️ CREATE / UPDATE / DELETE
  // ============================================
  
  static async create(paymentData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .insert({
        ...paymentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async update(id, paymentData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .update({
        ...paymentData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async updateStatus(id, status, notes = null) {
    const updates = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    
    if (status === 'failed') {
      updates.failed_at = new Date().toISOString();
    }
    
    if (status === 'refunded') {
      updates.refunded_at = new Date().toISOString();
    }
    
    if (notes) {
      updates.admin_notes = notes;
    }
    
    return this.update(id, updates);
  }
  
  static async confirmPayment(id, confirmedBy) {
    return this.updateStatus(id, 'completed', `تم التأكيد بواسطة ${confirmedBy}`);
  }
  
  static async rejectPayment(id, reason) {
    return this.updateStatus(id, 'failed', `مرفوض: ${reason}`);
  }
  
  static async refundPayment(id, reason) {
    return this.updateStatus(id, 'refunded', `تم الاسترداد: ${reason}`);
  }
  
  // ============================================
  // 🔗 LINK METHODS
  // ============================================
  
  static async linkToOrder(paymentId, orderId) {
    return this.update(paymentId, { order_id: orderId });
  }
  
  static async linkToSubscription(paymentId, subscriptionId) {
    return this.update(paymentId, { subscription_id: subscriptionId });
  }
  
  static async linkToPurchaseCode(paymentId, purchaseCodeId) {
    return this.update(paymentId, { purchase_code_id: purchaseCodeId });
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async getStats() {
    const client = getSupabaseClient();
    
    const [
      total,
      completed,
      pending,
      failed,
      refunded,
    ] = await Promise.all([
      client.from(this.table).select('count'),
      client.from(this.table).select('count').eq('status', 'completed'),
      client.from(this.table).select('count').eq('status', 'pending'),
      client.from(this.table).select('count').eq('status', 'failed'),
      client.from(this.table).select('count').eq('status', 'refunded'),
    ]);
    
    // Total revenue
    const { data: completedData } = await client
      .from(this.table)
      .select('amount')
      .eq('status', 'completed');
    
    const revenue = completedData.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return {
      total: total.count || 0,
      completed: completed.count || 0,
      pending: pending.count || 0,
      failed: failed.count || 0,
      refunded: refunded.count || 0,
      revenue,
    };
  }
  
  // ============================================
  // 🔒 WEBHOOK LOGS
  // ============================================
  
  static async logWebhook(provider, eventType, transactionId, payload, signature) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(TABLES.paymentWebhookLogs)
      .insert({
        provider,
        event_type: eventType,
        transaction_id: transactionId,
        raw_payload: payload,
        signature,
        ip_address: null,
        processed: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async markWebhookProcessed(id) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.paymentWebhookLogs)
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = PaymentModel;