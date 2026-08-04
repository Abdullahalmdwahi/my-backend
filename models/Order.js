// ============================================
// 🛒 ORDER MODEL - تم إصلاحه ✅
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');

class OrderModel {
  static get table() { return TABLES.orders; }
  
  // ============================================
  // 🔍 FIND METHODS - تم إصلاحها ✅
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
  
  static async findByIdWithDetails(id) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select(`
        *,
        user:users(*),
        product:products(*),
        messages:order_messages(*),
        status_history:order_status_history(*)
      `)
      .eq('id', id)
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
  
  static async findBySeller(sellerId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .eq('seller_id', sellerId);
    
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
  
  static async findByProduct(productId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .eq('product_id', productId);
    
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
  
  // ============================================
  // ✏️ CREATE / UPDATE / DELETE
  // ============================================
  
  static async create(orderData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .insert({
        ...orderData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Add status history
    await this.addStatusHistory(data.id, null, 'pending', 'تم إنشاء الطلب');
    
    return data;
  }
  
  static async update(id, orderData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .update({
        ...orderData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async updateStatus(id, status, notes = null, changedBy = null) {
    const order = await this.findById(id);
    if (!order) throw new Error('⚠️ الطلب غير موجود');
    
    const oldStatus = order.status;
    
    const updated = await this.update(id, {
      status,
      updated_at: new Date().toISOString(),
    });
    
    await this.addStatusHistory(id, oldStatus, status, notes, changedBy);
    
    return updated;
  }
  
  static async delete(id) {
    const client = getSupabaseClient();
    
    // Delete messages
    await client
      .from(TABLES.orderMessages)
      .delete()
      .eq('order_id', id);
    
    // Delete status history
    await client
      .from(TABLES.orderStatusHistory)
      .delete()
      .eq('order_id', id);
    
    // Delete order
    const { error } = await client
      .from(this.table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 📝 STATUS HISTORY
  // ============================================
  
  static async addStatusHistory(orderId, oldStatus, newStatus, notes, changedBy) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.orderStatusHistory)
      .insert({
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        notes,
        changed_by: changedBy,
        created_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    return true;
  }
  
  static async getStatusHistory(orderId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.orderStatusHistory)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }
  
  // ============================================
  // 💬 MESSAGE METHODS
  // ============================================
  
  static async addMessage(orderId, userId, message, imageUrl = null, isFromAdmin = false) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(TABLES.orderMessages)
      .insert({
        order_id: orderId,
        user_id: userId,
        message,
        image_url: imageUrl,
        is_from_admin: isFromAdmin,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async getMessages(orderId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.orderMessages)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }
  
  static async markMessagesAsRead(orderId, userId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(TABLES.orderMessages)
      .update({ is_read: true })
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async getStats() {
    const client = getSupabaseClient();
    
    const [
      total,
      pending,
      confirmed,
      processing,
      delivered,
      cancelled,
    ] = await Promise.all([
      client.from(this.table).select('count'),
      client.from(this.table).select('count').eq('status', 'pending'),
      client.from(this.table).select('count').eq('status', 'confirmed'),
      client.from(this.table).select('count').eq('status', 'processing'),
      client.from(this.table).select('count').eq('status', 'delivered'),
      client.from(this.table).select('count').eq('status', 'cancelled'),
    ]);
    
    return {
      total: total.count || 0,
      pending: pending.count || 0,
      confirmed: confirmed.count || 0,
      processing: processing.count || 0,
      delivered: delivered.count || 0,
      cancelled: cancelled.count || 0,
    };
  }
  
  static async getRevenue() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('total_price')
      .eq('status', 'delivered');
    
    if (error) throw error;
    
    const total = data.reduce((sum, order) => sum + (order.total_price || 0), 0);
    return total;
  }
}

module.exports = OrderModel;