// ============================================
// 🔨 AUCTION MODEL - تم إصلاحه ✅
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');

class Auction {
  static async endAuction(id) {
    const supabase = getSupabaseClient();
    
    // ✅ الحصول على أعلى عرض
    const { data: highestBid } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', id)
      .order('amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    // ✅ تحديث المزاد مع ended_at
    const { data, error } = await supabase
      .from('auctions')
      .update({
        status: 'ended',
        winner_id: highestBid?.user_id || null,
        ended_at: new Date().toISOString(), // ✅ العمود المفقود
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

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
        product:products(*),
        bids:bids(*),
        images:auction_images(*)
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async findActive(options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .eq('status', 'active')
      .gt('end_time', new Date().toISOString());
    
    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }
    
    if (options.sellerId) {
      query = query.eq('seller_id', options.sellerId);
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
  
  static async findByUser(userId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.table)
      .select('*')
      .or(`seller_id.eq.${userId},winner_id.eq.${userId}`);
    
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
  
  static async create(auctionData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .insert({
        ...auctionData,
        current_price: auctionData.starting_price,
        bid_count: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async update(id, auctionData) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.table)
      .update({
        ...auctionData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async updateStatus(id, status) {
    return this.update(id, {
      status,
      updated_at: new Date().toISOString(),
    });
  }
  
  static async endAuction(id) {
    const auction = await this.findByIdWithDetails(id);
    if (!auction) throw new Error('⚠️ المزاد غير موجود');
    
    // Get highest bid
    const client = getSupabaseClient();
    const { data: bids, error: bidError } = await client
      .from(TABLES.bids)
      .select('*')
      .eq('auction_id', id)
      .order('amount', { ascending: false })
      .limit(1);
    
    if (bidError) throw bidError;
    
    const winner = bids && bids.length > 0 ? bids[0] : null;
    
    return this.update(id, {
      status: 'ended',
      winner_id: winner?.user_id || null,
      ended_at: new Date().toISOString(),
    });
  }
  
  static async cancelAuction(id) {
    return this.updateStatus(id, 'cancelled');
  }
  
  static async delete(id) {
    const client = getSupabaseClient();
    
    // Delete bids first
    await client
      .from(TABLES.bids)
      .delete()
      .eq('auction_id', id);
    
    // Delete images
    await client
      .from(TABLES.auctionImages)
      .delete()
      .eq('auction_id', id);
    
    // Delete auction
    const { error } = await client
      .from(this.table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 📊 BID METHODS
  // ============================================
  
  static async placeBid(auctionId, userId, amount, options = {}) {
    const client = getSupabaseClient();
    
    // Check auction
    const auction = await this.findById(auctionId);
    if (!auction) throw new Error('⚠️ المزاد غير موجود');
    if (auction.status !== 'active') throw new Error('⚠️ المزاد غير نشط');
    if (new Date(auction.end_time) <= new Date()) throw new Error('⚠️ انتهى وقت المزاد');
    
    // Check minimum bid
    const minBid = auction.current_price + auction.min_bid_increment;
    if (amount < minBid) {
      throw new Error(`⚠️ أقل عرض هو ${minBid}`);
    }
    
    // Create bid
    const { data: bid, error: bidError } = await client
      .from(TABLES.bids)
      .insert({
        auction_id: auctionId,
        user_id: userId,
        amount,
        quantity: options.quantity || 1,
        is_auto_bid: options.isAutoBid || false,
        max_auto_bid_amount: options.maxAutoBidAmount || null,
        is_anonymous: options.isAnonymous || false,
        note: options.note || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (bidError) throw bidError;
    
    // Update auction
    await this.update(auctionId, {
      current_price: amount,
      bid_count: (auction.bid_count || 0) + 1,
    });
    
    return bid;
  }
  
  static async getBids(auctionId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(TABLES.bids)
      .select('*')
      .eq('auction_id', auctionId);
    
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
  
  static async getHighestBid(auctionId) {
    const bids = await this.getBids(auctionId, {
      orderBy: 'amount',
      ascending: false,
      limit: 1,
    });
    
    return bids.length > 0 ? bids[0] : null;
  }
  
  // ============================================
  // 📊 STATS METHODS
  // ============================================
  
  static async getStats() {
    const client = getSupabaseClient();
    
    const [
      total,
      active,
      ended,
    ] = await Promise.all([
      client.from(this.table).select('count'),
      client.from(this.table).select('count').eq('status', 'active'),
      client.from(this.table).select('count').eq('status', 'ended'),
    ]);
    
    return {
      total: total.count || 0,
      active: active.count || 0,
      ended: ended.count || 0,
    };
  }
  
  static async incrementViews(id) {
    const client = getSupabaseClient();
    const auction = await this.findById(id);
    if (!auction) return false;
    
    const { error } = await client
      .from(this.table)
      .update({ views_count: (auction.views_count || 0) + 1 })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  // ============================================
  // 🔄 AUTO-END EXPIRED AUCTIONS
  // ============================================
  
  static async endExpiredAuctions() {
    const client = getSupabaseClient();
    
    const { data: expired, error } = await client
      .from(this.table)
      .select('id')
      .eq('status', 'active')
      .lt('end_time', new Date().toISOString());
    
    if (error) throw error;
    
    for (const auction of expired) {
      await this.endAuction(auction.id);
    }
    
    return expired.length;
  }
}

module.exports = AuctionModel;