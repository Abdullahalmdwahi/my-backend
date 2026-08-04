// ============================================
// 🔨 AUCTION CONTROLLER - معدل ✅
// ============================================

const { Auction } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');
const { broadcastBid, broadcastAuctionEnd } = require('../socket/auctionSocket');

class AuctionController {
  // ============================================
  // 📋 GET ALL AUCTIONS
  // ============================================
  static async getAll(req, res, next) {
    try {
      const {
        limit = 20,
        offset = 0,
        categoryId,
        sellerId,
        status = 'active',
        orderBy = 'end_time',
        ascending = true,
      } = req.query;

      let auctions = [];

      if (sellerId) {
        auctions = await Auction.findBySeller(sellerId, {
          status,
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy,
          ascending: ascending === 'true',
        });
      } else if (categoryId) {
        auctions = await Auction.findActive({
          categoryId,
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy,
          ascending: ascending === 'true',
        });
      } else {
        auctions = await Auction.findActive({
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy,
          ascending: ascending === 'true',
        });
      }

      res.json({
        success: true,
        data: auctions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: auctions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🔨 GET AUCTION BY ID
  // ============================================
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const validation = validateId(id);
      if (!validation.valid) {
        throw new ValidationError(validation.message);
      }

      const auction = await Auction.findByIdWithDetails(id);
      if (!auction) {
        throw new NotFoundError('المزاد');
      }

      // Increment views
      await Auction.incrementViews(id);

      res.json({
        success: true,
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ➕ CREATE AUCTION
  // ============================================
  static async create(req, res, next) {
    try {
      const userId = req.user.id;
      const auctionData = req.body;

      // Check if user has auction subscription
      // This will be handled by subscription service

      const auction = await Auction.create({
        ...auctionData,
        seller_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: '✅ تم إنشاء المزاد بنجاح',
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE AUCTION
  // ============================================
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const auction = await Auction.findById(id);
      if (!auction) {
        throw new NotFoundError('المزاد');
      }

      // Check ownership
      if (auction.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية تعديل هذا المزاد');
      }

      // Can only update if auction is active
      if (auction.status !== 'active') {
        throw new ValidationError('لا يمكن تعديل مزاد منتهي');
      }

      const updated = await Auction.update(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: '✅ تم تحديث المزاد بنجاح',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 💰 PLACE BID
  // ============================================
  static async placeBid(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { amount, quantity = 1, isAnonymous = false, note = null } = req.body;

      const bid = await Auction.placeBid(id, userId, amount, {
        quantity,
        isAnonymous,
        note,
      });

      // Broadcast bid to all clients in auction room
      broadcastBid(id, bid);

      res.status(201).json({
        success: true,
        message: '✅ تم تقديم العرض بنجاح',
        data: bid,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🏁 END AUCTION
  // ============================================
  static async end(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const auction = await Auction.findById(id);
      if (!auction) {
        throw new NotFoundError('المزاد');
      }

      // Check ownership
      if (auction.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية إنهاء هذا المزاد');
      }

      const ended = await Auction.endAuction(id);

      // Broadcast auction end to all clients
      broadcastAuctionEnd(id, ended.winner_id);

      res.json({
        success: true,
        message: '✅ تم إنهاء المزاد بنجاح',
        data: ended,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ❌ CANCEL AUCTION
  // ============================================
  static async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const auction = await Auction.findById(id);
      if (!auction) {
        throw new NotFoundError('المزاد');
      }

      // Check ownership
      if (auction.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية إلغاء هذا المزاد');
      }

      const cancelled = await Auction.cancelAuction(id);

      res.json({
        success: true,
        message: '✅ تم إلغاء المزاد بنجاح',
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET AUCTION BIDS
  // ============================================
  static async getBids(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 50, orderBy = 'amount', ascending = false } = req.query;

      const bids = await Auction.getBids(id, {
        limit: parseInt(limit),
        orderBy,
        ascending: ascending === 'true',
      });

      res.json({
        success: true,
        data: bids,
        total: bids.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET AUCTION STATS (Admin only)
  // ============================================
  static async getStats(req, res, next) {
    try {
      const stats = await Auction.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🖼️ ADD AUCTION IMAGE
  // ============================================
  static async addImage(req, res, next) {
    try {
      const { id } = req.params;
      const { imageUrl, isMain = false } = req.body;

      const auction = await Auction.findById(id);
      if (!auction) {
        throw new NotFoundError('المزاد');
      }

      const client = getSupabaseClient();
      const { data, error } = await client
        .from(TABLES.auctionImages)
        .insert({
          auction_id: id,
          image_url: imageUrl,
          is_main: isMain,
          sort_order: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        message: '✅ تم إضافة الصورة',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ REMOVE AUCTION IMAGE
  // ============================================
  static async removeImage(req, res, next) {
    try {
      const { imageId } = req.params;

      const client = getSupabaseClient();
      const { error } = await client
        .from(TABLES.auctionImages)
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      res.json({
        success: true,
        message: '✅ تم حذف الصورة',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuctionController;