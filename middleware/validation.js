

const Joi = require('joi');
const { sanitizeInput } = require('../utils/helpers');



const schemas = {
  // Auth
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'البريد الإلكتروني غير صحيح',
      'any.required': 'البريد الإلكتروني مطلوب',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      'any.required': 'كلمة المرور مطلوبة',
    }),
    deviceId: Joi.string().optional(),
    deviceName: Joi.string().optional(),
  }),
  
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    businessName: Joi.string().min(2).max(100).optional(),
    userTypeId: Joi.string().required(),
    specializations: Joi.array().items(Joi.string()).optional(),
    deviceId: Joi.string().optional(),
    deviceName: Joi.string().optional(),
  }),
  
  verify: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  }),
  
  resetPassword: Joi.object({
    email: Joi.string().email().required(),
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),
  
  // User
  updateUser: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    businessName: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().optional(),
    fullName: Joi.string().optional(),
    fullNameAr: Joi.string().optional(),
    fullNameEn: Joi.string().optional(),
    specializations: Joi.array().items(Joi.string()).optional(),
  }),
  
  // Product
  createProduct: Joi.object({
    titles: Joi.array().items(Joi.string().min(2).max(200)).min(1).required(),
    price: Joi.number().positive().required(),
    oldPrice: Joi.number().positive().optional(),
    currency: Joi.string().valid('USD', 'SAR', 'YER', 'AED', 'KWD', 'QAR', 'BHD', 'OMR').default('YER'),
    condition: Joi.string().valid('brandNew', 'excellent', 'good', 'fair').required(),
    images: Joi.array().items(Joi.string().uri()).max(10).required(),
    sellerName: Joi.string().optional(),
    sellerId: Joi.string().required(),
    sellerLocation: Joi.string().required(),
    categoryIds: Joi.array().items(Joi.string()).min(1).max(10).required(),
    categoryNames: Joi.array().items(Joi.string()).optional(),
    description: Joi.string().min(10).max(2000).required(),
    phoneNumber: Joi.string().optional(),
    quantity: Joi.number().integer().min(1).default(1),
    quantityUnit: Joi.string().optional(),
    minAmount: Joi.number().positive().optional(),
    maxAmount: Joi.number().positive().optional(),
    isFeatured: Joi.boolean().default(false),
    isAuction: Joi.boolean().default(false),
  }),
  
  // Auction
  createAuction: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    images: Joi.array().items(Joi.string().uri()).min(1).max(10).required(),
    categoryId: Joi.string().required(),
    startingPrice: Joi.number().positive().required(),
    minBidIncrement: Joi.number().positive().default(100),
    reservePrice: Joi.number().positive().optional(),
    endTime: Joi.date().greater('now').required(),
    isWholesale: Joi.boolean().default(false),
    minQuantity: Joi.number().integer().min(1).default(1),
    isFeatured: Joi.boolean().default(false),
    currency: Joi.string().valid('USD', 'SAR', 'YER').default('YER'),
    isPrivate: Joi.boolean().default(false),
    invitedUsers: Joi.array().items(Joi.string()).optional(),
  }),
  
  placeBid: Joi.object({
    amount: Joi.number().positive().required(),
    quantity: Joi.number().integer().min(1).default(1),
    isAnonymous: Joi.boolean().default(false),
    note: Joi.string().max(500).optional(),
  }),
  
  // Order
  createOrder: Joi.object({
    productId: Joi.string().required(),
    productTitle: Joi.string().required(),
    productPrice: Joi.number().positive().required(),
    productImage: Joi.string().uri().optional(),
    quantity: Joi.number().integer().min(1).max(1000).default(1),
    notes: Joi.string().max(1000).optional(),
    address: Joi.string().min(5).max(500).required(),
    phone: Joi.string().required(),
  }),
  
  updateOrderStatus: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'delivered', 'cancelled').required(),
    notes: Joi.string().max(500).optional(),
  }),
  
  // Payment
  createPayment: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid('USD', 'SAR', 'YER', 'AED', 'KWD', 'QAR', 'BHD', 'OMR').required(),
    description: Joi.string().max(500).optional(),
    orderId: Joi.string().optional(),
    subscriptionId: Joi.string().optional(),
    paymentMethod: Joi.string().valid('wallet', 'card', 'bank', 'digital', 'cash', 'purchase_code').required(),
    gatewayType: Joi.string().valid('al_kuraimi', 'yemen_pay', 'jeeb', 'visa', 'mastercard', 'google_pay', 'apple_pay', 'paypal', 'stripe').optional(),
  }),
  
  verifyPayment: Joi.object({
    transactionId: Joi.string().required(),
    code: Joi.string().required(),
  }),
  
  // Wallet
  createWalletCode: Joi.object({
    walletId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    purpose: Joi.string().valid('deposit', 'subscription', 'order').required(),
  }),
  
  verifyWalletCode: Joi.object({
    code: Joi.string().required(),
    walletId: Joi.string().required(),
    expectedAmount: Joi.number().positive().required(),
    purpose: Joi.string().valid('deposit', 'subscription', 'order').required(),
  }),
  
  // Admin
  adminAction: Joi.object({
    action: Joi.string().valid('approve', 'reject', 'delete', 'edit').required(),
    reason: Joi.string().max(500).optional(),
    notes: Joi.string().max(500).optional(),
  }),
  
  // Notification
  sendNotification: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    body: Joi.string().min(3).max(1000).required(),
    type: Joi.string().valid('global', 'general', 'favorite', 'comment', 'rating', 'promotion', 'offer', 'auction', 'order', 'subscription', 'payment', 'productManagement', 'message', 'editRequest', 'deletion', 'rejection', 'approval', 'system').default('general'),
    userId: Joi.string().optional(),
    productId: Joi.string().optional(),
    imageUrl: Joi.string().uri().optional(),
    data: Joi.object().optional(),
  }),
};



function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        success: false,
        message: '⚠️ بيانات غير صحيحة',
        errors,
      });
    }
    
    // Sanitize input
    req.body = value;
    
    // Sanitize strings
    for (const [key, val] of Object.entries(req.body)) {
      if (typeof val === 'string') {
        req.body[key] = sanitizeInput(val);
      }
    }
    
    next();
  };
}



function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: '⚠️ معرف غير صحيح',
        errors: error.details.map(d => d.message),
      });
    }
    
    req.params = value;
    next();
  };
}



function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: '⚠️ استعلام غير صحيح',
        errors: error.details.map(d => d.message),
      });
    }
    
    req.query = value;
    next();
  };
}



module.exports = {
  validate,
  validateParams,
  validateQuery,
  schemas,
};