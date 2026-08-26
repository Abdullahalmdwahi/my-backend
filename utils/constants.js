// ============================================
// 📌 CONSTANTS - محسّن
// ============================================

// ============================================
// 👤 USER CONSTANTS
// ============================================

const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

const USER_TYPES = {
  INDIVIDUAL: 1,
  BUSINESS: 2,
  COMPANY: 3,
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
  PENDING: 'pending',
};

// ============================================
// 📦 PRODUCT CONSTANTS
// ============================================

const PRODUCT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

const PRODUCT_CONDITIONS = {
  BRAND_NEW: 'brandNew',
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
};

const PRODUCT_CURRENCIES = {
  USD: 'USD',
  SAR: 'SAR',
  YER: 'YER',
  AED: 'AED',
  KWD: 'KWD',
  QAR: 'QAR',
  BHD: 'BHD',
  OMR: 'OMR',
  JOD: 'JOD',
  IQD: 'IQD',
};

const PRODUCT_CURRENCY_SYMBOLS = {
  USD: '$',
  SAR: 'ر.س',
  YER: 'YER',
  AED: 'د.إ',
  KWD: 'د.ك',
  QAR: 'ر.ق',
  BHD: 'د.ب',
  OMR: 'ر.ع',
  JOD: 'د.ا',
  IQD: 'د.ع',
};

// ============================================
// 🔨 AUCTION CONSTANTS
// ============================================

const AUCTION_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
};

const BID_STATUS = {
  PENDING: 'pending',
  WINNING: 'winning',
  OUTBID: 'outbid',
  WON: 'won',
};

// ============================================
// 🛒 ORDER CONSTANTS
// ============================================

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const ORDER_STATUS_LABELS = {
  pending: '⏳ قيد المراجعة',
  confirmed: '✅ تم التأكيد',
  processing: '🚚 جاري التوصيل',
  delivered: '📦 تم التسليم',
  cancelled: '❌ ملغي',
};

// ============================================
// 💰 PAYMENT CONSTANTS
// ============================================

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

const PAYMENT_METHODS = {
  WALLET: 'wallet',
  CARD: 'card',
  BANK: 'bank',
  DIGITAL: 'digital',
  CASH: 'cash',
  PURCHASE_CODE: 'purchase_code',
};

const PAYMENT_GATEWAYS = {
  AL_KURAIMI: 'al_kuraimi',
  YEMEN_PAY: 'yemen_pay',
  JEEB: 'jeeb',
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  GOOGLE_PAY: 'google_pay',
  APPLE_PAY: 'apple_pay',
  PAYPAL: 'paypal',
  STRIPE: 'stripe',
};

// ============================================
// 💳 WALLET CONSTANTS
// ============================================

const WALLET_TYPES = {
  YEMEN_PAY: 'yemen_pay',
  JEEB: 'jeeb',
  CASH_PAY: 'cash_pay',
  AL_KURAIMI: 'al_kuraimi',
};

const WALLET_TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  SUBSCRIPTION: 'subscription',
  ORDER: 'order',
  REFUND: 'refund',
};

// ============================================
// 📱 NOTIFICATION CONSTANTS
// ============================================

const NOTIFICATION_TYPES = {
  GLOBAL: 'global',
  GENERAL: 'general',
  FAVORITE: 'favorite',
  COMMENT: 'comment',
  RATING: 'rating',
  PROMOTION: 'promotion',
  OFFER: 'offer',
  AUCTION: 'auction',
  ORDER: 'order',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  PRODUCT_MANAGEMENT: 'productManagement',
  MESSAGE: 'message',
  EDIT_REQUEST: 'editRequest',
  DELETION: 'deletion',
  REJECTION: 'rejection',
  APPROVAL: 'approval',
  SYSTEM: 'system',
};

// ============================================
// 🔒 AUTH CONSTANTS
// ============================================

const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'password_reset',
  DEVICE_VERIFICATION: 'device_verification',
};

const VERIFICATION_METHODS = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
};

// ============================================
// 📏 LIMITS
// ============================================

const LIMITS = {
  MAX_PRODUCT_IMAGES: 10,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_CATEGORY_SELECTION: 10,
  MAX_SEARCH_RESULTS: 50,
  DEFAULT_PAGE_SIZE: 20,
  MAX_ORDER_QUANTITY: 1000,
  MAX_AUCTION_IMAGES: 10,
  MIN_BID_INCREMENT: 1,
  MAX_AUCTION_DURATION_DAYS: 90,
  OTP_EXPIRY_MINUTES: 10,
  TOKEN_EXPIRY_DAYS: 7,
  PASSWORD_RESET_EXPIRY_HOURS: 24,
};

// ============================================
// 🌍 COUNTRY CONSTANTS
// ============================================

const SUPPORTED_COUNTRIES = {
  SA: { code: 'SA', name: 'السعودية', nameEn: 'Saudi Arabia', phoneCode: '+966', currency: 'SAR' },
  YE: { code: 'YE', name: 'اليمن', nameEn: 'Yemen', phoneCode: '+967', currency: 'YER' },
  AE: { code: 'AE', name: 'الإمارات', nameEn: 'UAE', phoneCode: '+971', currency: 'AED' },
  KW: { code: 'KW', name: 'الكويت', nameEn: 'Kuwait', phoneCode: '+965', currency: 'KWD' },
  QA: { code: 'QA', name: 'قطر', nameEn: 'Qatar', phoneCode: '+974', currency: 'QAR' },
  BH: { code: 'BH', name: 'البحرين', nameEn: 'Bahrain', phoneCode: '+973', currency: 'BHD' },
  OM: { code: 'OM', name: 'عُمان', nameEn: 'Oman', phoneCode: '+968', currency: 'OMR' },
  JO: { code: 'JO', name: 'الأردن', nameEn: 'Jordan', phoneCode: '+962', currency: 'JOD' },
  IQ: { code: 'IQ', name: 'العراق', nameEn: 'Iraq', phoneCode: '+964', currency: 'IQD' },
};

// ============================================
// 🏷️ CATEGORY CONSTANTS
// ============================================

const CATEGORY_IDS = {
  CARS: '1',
  MOTORCYCLES: '15',
  ELECTRONICS: '2',
  HOME_APPLIANCES: '3',
  FURNITURE: '4',
  SPORTS: '5',
  CLOTHING: '6',
  ACCESSORIES: '7',
  MAKEUP: '9',
  SHOES: '10',
  TOYS: '11',
  GAMES: '11',
  CLEANING: '14',
  REAL_ESTATE: '16',
  PETS: '17',
  OTHER: '13',
};

const CATEGORY_NAMES = {
  '1': 'السيارات',
  '15': 'الدراجات النارية',
  '2': 'الإلكترونيات',
  '3': 'الأجهزة المنزلية',
  '4': 'الأثاث',
  '5': 'الرياضة',
  '6': 'الملابس',
  '7': 'اكسسوارات',
  '9': 'المكياج',
  '10': 'الأحذية',
  '11': 'الألعاب',
  '14': 'منظفات',
  '16': 'عقارات',
  '17': 'حيوانات أليفة',
  '13': 'أخرى',
};

// ============================================
// 📤 EXPORTS
// ============================================

module.exports = {
  USER_ROLES,
  USER_TYPES,
  USER_STATUS,
  PRODUCT_STATUS,
  PRODUCT_CONDITIONS,
  PRODUCT_CURRENCIES,
  PRODUCT_CURRENCY_SYMBOLS,
  AUCTION_STATUS,
  BID_STATUS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_GATEWAYS,
  WALLET_TYPES,
  WALLET_TRANSACTION_TYPES,
  NOTIFICATION_TYPES,
  TOKEN_TYPES,
  VERIFICATION_METHODS,
  LIMITS,
  SUPPORTED_COUNTRIES,
  CATEGORY_IDS,
  CATEGORY_NAMES,
};