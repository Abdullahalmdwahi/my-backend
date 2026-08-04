// ============================================
// 💳 WALLET MODEL - معدل ✅
// ============================================

const { TABLES, getSupabaseClient } = require('../config/supabase');

class WalletModel {
  static get table() { return TABLES.wallets; }
  static get codeTable() { return TABLES.walletCodes; }
  static get transactionTable() { return TABLES.walletTransactions; }
  static get userWalletTable() { return TABLES.userWallets; }
  
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
  
  static async findByType(typeId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('wallet_type_id', typeId)
      .eq('is_active', true)
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
    
    if (options.typeId) {
      query = query.eq('wallet_type_id', options.typeId);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ============================================
  // 👤 USER WALLET METHODS
  // ============================================
  
  static async getUserWallet(userId, walletId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.userWalletTable)
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_id', walletId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  static async getUserWallets(userId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.userWalletTable)
      .select('*, wallet:wallets(*), wallet_type:wallet_types(*)')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  static async getUserBalance(userId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(this.userWalletTable)
      .select('balance')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const total = data.reduce((sum, item) => sum + (item.balance || 0), 0);
    return total;
  }
  
  static async updateUserWalletBalance(userWalletId, newBalance) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.userWalletTable)
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userWalletId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async addUserWallet(userId, walletId, initialBalance = 0) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.userWalletTable)
      .insert({
        user_id: userId,
        wallet_id: walletId,
        balance: initialBalance,
        is_verified: false,
        is_primary: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // ============================================
  // 💰 CODE METHODS
  // ============================================
  
  static async generateCode(userId, walletId, amount, purpose) {
    const client = getSupabaseClient();
    
    const code = this._generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const { data, error } = await client
      .from(this.codeTable)
      .insert({
        wallet_id: walletId,
        code,
        amount,
        user_id: userId,
        purpose,
        is_used: false,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async verifyCode(userId, code, walletId, options = {}) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.codeTable)
      .select('*')
      .eq('code', code)
      .eq('wallet_id', walletId)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      throw new Error('⚠️ الكود غير صحيح أو منتهي الصلاحية');
    }
    
    if (options.expectedAmount && Math.abs(data.amount - options.expectedAmount) > 0.01) {
      throw new Error(`⚠️ المبلغ غير مطابق. المطلوب: ${options.expectedAmount}, المدفوع: ${data.amount}`);
    }
    
    if (options.purpose && data.purpose !== options.purpose) {
      throw new Error(`⚠️ الغرض غير مطابق. المطلوب: ${options.purpose}, الحالي: ${data.purpose}`);
    }
    
    return data;
  }
  
  static async useCode(userId, codeId, referenceId = null) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.codeTable)
      .update({
        is_used: true,
        used_by_user_id: userId,
        used_at: new Date().toISOString(),
        reference_id: referenceId,
      })
      .eq('id', codeId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // ============================================
  // 📊 TRANSACTION METHODS
  // ============================================
  
  static async addTransaction(userWalletId, type, amount, balanceBefore, balanceAfter, description = null) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from(this.transactionTable)
      .insert({
        user_wallet_id: userWalletId,
        type,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description,
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async getTransactions(userWalletId, options = {}) {
    const client = getSupabaseClient();
    let query = client
      .from(this.transactionTable)
      .select('*')
      .eq('user_wallet_id', userWalletId);
    
    if (options.type) {
      query = query.eq('type', options.type);
    }
    
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
  
  static async getUserTransactions(userId, options = {}) {
    const client = getSupabaseClient();
    
    // Get user wallet IDs
    const { data: userWallets, error: walletError } = await client
      .from(this.userWalletTable)
      .select('id')
      .eq('user_id', userId);
    
    if (walletError) throw walletError;
    
    if (!userWallets || userWallets.length === 0) {
      return [];
    }
    
    const walletIds = userWallets.map(w => w.id);
    
    let query = client
      .from(this.transactionTable)
      .select('*, user_wallet:user_wallets(*)')
      .in('user_wallet_id', walletIds);
    
    if (options.type) {
      query = query.eq('type', options.type);
    }
    
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
  
  static async addBalance(userId, amount, options = {}) {
    const client = getSupabaseClient();
    
    // Get user wallet
    let userWallet = null;
    
    if (options.walletId) {
      userWallet = await this.getUserWallet(userId, options.walletId);
    } else {
      // Get primary wallet
      const { data, error } = await client
        .from(this.userWalletTable)
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (error) throw error;
      userWallet = data;
    }
    
    if (!userWallet) {
      throw new Error('⚠️ لا توجد محفظة للمستخدم');
    }
    
    const oldBalance = userWallet.balance || 0;
    const newBalance = oldBalance + amount;
    
    // Update balance
    await this.updateUserWalletBalance(userWallet.id, newBalance);
    
    // Add transaction
    await this.addTransaction(
      userWallet.id,
      'deposit',
      amount,
      oldBalance,
      newBalance,
      options.description || 'إضافة رصيد'
    );
    
    return {
      oldBalance,
      newBalance,
      amount,
      userWalletId: userWallet.id,
    };
  }
  
  // ============================================
  // 🔢 HELPERS
  // ============================================
  
  static _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

module.exports = WalletModel;