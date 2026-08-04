// ============================================
// 📦 PRODUCT MODEL - تم إصلاحه ✅
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');
const { sanitizeInput } = require('../utils/helpers');

class ProductModel {
  static get table() { return TABLES.products; }
  static get pendingTable() { return TABLES.pendingProducts; }
  
  // ============================================
  // 🔍 FIND METHODS - تم إصلاحها ✅
  // ============================================
  
  static async findById(id) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('id', id) // مباشرة كـ String
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
        seller:users!seller_id(*),
        images:product_images(*),
        auction:auctions(*)
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findBySeller(sellerId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .eq('seller_id', sellerId); // مباشرة كـ String (UUID)
    
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
  
  static async findByCategory(categoryId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .contains('category_ids', [categoryId]) // categoryId كـ String
      .eq('status', 'active');
    
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
  
  static async search(query, options = {}) {
    const client = getSupabaseClient();
    const searchTerm = sanitizeInput(query);
    
    let searchQuery = client
      .from(this.table)
      .select('*')
      .eq('status', 'active')
      .textSearch('search_vector', searchTerm, {
        config: 'arabic',
      });
    
    if (options.categoryId) {
      searchQuery = searchQuery.contains('category_ids', [options.categoryId]);
    }
    
    if (options.minPrice) {
      searchQuery = searchQuery.gte('price', options.minPrice);
    }
    
    if (options.maxPrice) {
      searchQuery = searchQuery.lte('price', options.maxPrice);
    }
    
    if (options.orderBy) {
      searchQuery = searchQuery.order(options.orderBy, { 
        ascending: options.ascending || false 
      });
    }
    
    if (options.limit) {
      searchQuery = searchQuery.limit(options.limit);
    }
    
    const { data, error } = await searchQuery;
    if (error) throw error;
    return data || [];
  }
  
  // ============================================
  // ✏️ CREATE / UPDATE / DELETE
  // ============================================
  
  static async create(productData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .insert({
        ...productData,
        posted_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async createPending(productData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.pendingTable)
      .insert({
        ...productData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async update(id, productData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .update({
        ...productData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async delete(id) {
    const client = getSupabaseClient();
    
    // Delete images first
    await client
      .from(TABLES.productImages)
      .delete()
      .eq('product_id', id);
    
    const { error } = await client
      .from(this.table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  static async approvePending(pendingId, durationHours = 168) {
    const client = getSupabaseClient();
    
    // Get pending product
    const { data: pending, error: pendingError } = await client
      .from(this.pendingTable)
      .select('*')
      .eq('id', pendingId)
      .single();
    
    if (pendingError || !pending) {
      throw new Error('⚠️ المنتج غير موجود');
    }
    
    // Create product
    const product = await this.create({
      ...pending,
      status: 'active',
      approved_at: new Date().toISOString(),
      expiry_date: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
    });
    
    // Delete pending
    await client
      .from(this.pendingTable)
      .delete()
      .eq('id', pendingId);
    
    return product;
  }
  
  static async rejectPending(pendingId, reason) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from(this.pendingTable)
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_reason: reason,
      })
      .eq('id', pendingId);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async incrementViews(id) {
    const client = getSupabaseClient();
    const product = await this.findById(id);
    if (!product) return false;
    
    const { error } = await client
      .from(this.table)
      .update({ views: (product.views || 0) + 1 })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  static async getStats() {
    const client = getSupabaseClient();
    
    const [
      total,
      active,
      pending,
      expired,
    ] = await Promise.all([
      client.from(this.table).select('count'),
      client.from(this.table).select('count').eq('status', 'active'),
      client.from(this.pendingTable).select('count').eq('status', 'pending'),
      client.from(this.table).select('count').lt('expiry_date', new Date().toISOString()),
    ]);
    
    return {
      total: total.count || 0,
      active: active.count || 0,
      pending: pending.count || 0,
      expired: expired.count || 0,
    };
  }
  
  // ============================================
  // 🖼️ IMAGE METHODS
  // ============================================
  
  static async getImages(productId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.productImages)
      .select('*')
      .eq('product_id', productId)
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }
  
  static async addImage(productId, imageData) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.productImages)
      .insert({
        ...imageData,
        product_id: productId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async removeImage(imageId) {
    const client = getSupabaseClient();
    const { error } = await client
      .from(TABLES.productImages)
      .delete()
      .eq('id', imageId);
    
    if (error) throw error;
    return true;
  }
}

module.exports = ProductModel;