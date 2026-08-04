// ============================================
// 📦 PRODUCT CONTROLLER - معدل ✅
// ============================================

const { Product } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { validateId, validateProductTitle, validateProductDescription, validateProductPrice } = require('../utils/validators');
const { sanitizeInput } = require('../utils/helpers');
const logger = require('../utils/logger');

class ProductController {
  // ============================================
  // 📋 GET ALL PRODUCTS
  // ============================================
  static async getAll(req, res, next) {
    try {
      const {
        limit = 20,
        offset = 0,
        categoryId,
        sellerId,
        status = 'active',
        orderBy = 'created_at',
        ascending = false,
      } = req.query;

      let products = [];
      let total = 0;

      if (categoryId) {
        products = await Product.findByCategory(categoryId, {
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy,
          ascending: ascending === 'true',
        });
      } else if (sellerId) {
        products = await Product.findBySeller(sellerId, {
          status,
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy,
          ascending: ascending === 'true',
        });
      } else {
        products = await Product.findAll({
          status,
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy,
          ascending: ascending === 'true',
        });
      }

      res.json({
        success: true,
        data: products,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: products.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🔍 SEARCH PRODUCTS
  // ============================================
  static async search(req, res, next) {
    try {
      const {
        q,
        categoryId,
        minPrice,
        maxPrice,
        limit = 20,
        orderBy = 'relevance',
      } = req.query;

      if (!q || q.length < 2) {
        throw new ValidationError('⚠️ الرجاء إدخال كلمة بحث (حرفين على الأقل)');
      }

      const sanitizedQuery = sanitizeInput(q);

      const products = await Product.search(sanitizedQuery, {
        categoryId,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        limit: parseInt(limit),
        orderBy: orderBy === 'relevance' ? undefined : orderBy,
      });

      res.json({
        success: true,
        data: products,
        query: sanitizedQuery,
        total: products.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📦 GET PRODUCT BY ID
  // ============================================
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const validation = validateId(id);
      if (!validation.valid) {
        throw new ValidationError(validation.message);
      }

      const product = await Product.findByIdWithDetails(id);
      if (!product) {
        throw new NotFoundError('المنتج');
      }

      // Increment views
      await Product.incrementViews(id);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ➕ CREATE PRODUCT
  // ============================================
  static async create(req, res, next) {
    try {
      const userId = req.user.id;
      const productData = req.body;

      // Validate
      const titleValidation = validateProductTitle(productData.title);
      if (!titleValidation.valid) {
        throw new ValidationError(titleValidation.message);
      }

      const descValidation = validateProductDescription(productData.description);
      if (!descValidation.valid) {
        throw new ValidationError(descValidation.message);
      }

      const priceValidation = validateProductPrice(productData.price);
      if (!priceValidation.valid) {
        throw new ValidationError(priceValidation.message);
      }

      // Check if user has enough ads
      // This will be handled by subscription service

      const product = await Product.create({
        ...productData,
        seller_id: userId,
        status: 'pending', // Needs approval
        created_at: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: '✅ تم إرسال المنتج للمراجعة',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✏️ UPDATE PRODUCT
  // ============================================
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('المنتج');
      }

      // Check ownership
      if (product.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية تعديل هذا المنتج');
      }

      // Sanitize
      const sanitized = {};
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeInput(value);
        } else {
          sanitized[key] = value;
        }
      }

      const updated = await Product.update(id, {
        ...sanitized,
        updated_at: new Date().toISOString(),
        status: 'pending', // Needs re-approval
      });

      res.json({
        success: true,
        message: '✅ تم تحديث المنتج، في انتظار المراجعة',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ DELETE PRODUCT
  // ============================================
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('المنتج');
      }

      // Check ownership
      if (product.seller_id !== userId && !req.user.isAdmin) {
        throw new ValidationError('ليس لديك صلاحية حذف هذا المنتج');
      }

      await Product.delete(id);

      res.json({
        success: true,
        message: '✅ تم حذف المنتج بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ✅ APPROVE PRODUCT (Admin only)
  // ============================================
  static async approve(req, res, next) {
    try {
      const { id } = req.params;
      const { durationHours = 168 } = req.body; // 7 days default

      const product = await Product.approvePending(id, durationHours);

      res.json({
        success: true,
        message: '✅ تمت الموافقة على المنتج ونشره',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ❌ REJECT PRODUCT (Admin only)
  // ============================================
  static async reject(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await Product.rejectPending(id, reason || 'تم رفض المنتج');

      res.json({
        success: true,
        message: '❌ تم رفض المنتج',
        reason: reason || 'تم رفض المنتج',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 📊 GET PRODUCT STATS (Admin only)
  // ============================================
  static async getStats(req, res, next) {
    try {
      const stats = await Product.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🖼️ GET PRODUCT IMAGES
  // ============================================
  static async getImages(req, res, next) {
    try {
      const { id } = req.params;

      const images = await Product.getImages(id);

      res.json({
        success: true,
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🖼️ ADD PRODUCT IMAGE
  // ============================================
  static async addImage(req, res, next) {
    try {
      const { id } = req.params;
      const { imageUrl, isMain = false, note = null, amount = null } = req.body;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('المنتج');
      }

      const image = await Product.addImage(id, {
        image_url: imageUrl,
        is_main: isMain,
        note,
        amount,
      });

      res.status(201).json({
        success: true,
        message: '✅ تم إضافة الصورة',
        data: image,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 🗑️ REMOVE PRODUCT IMAGE
  // ============================================
  static async removeImage(req, res, next) {
    try {
      const { imageId } = req.params;

      await Product.removeImage(imageId);

      res.json({
        success: true,
        message: '✅ تم حذف الصورة',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;