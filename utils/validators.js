// ============================================
// ✅ VALIDATORS - النسخة المُحسنة
// ============================================

const { validateEmail: validateEmailHelper, validatePhoneNumber: validatePhoneHelper } = require('./helpers');

// ============================================
// 🔢 ID VALIDATORS
// ============================================

function validateId(id) {
  if (!id) return { valid: false, message: 'المعرف مطلوب' };
  
  // ✅ UUID
  if (typeof id === 'string' && id.includes('-')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return { valid: true };
    }
    return { valid: false, message: 'المعرف غير صالح (UUID غير صحيح)' };
  }
  
  // ✅ Number
  if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) {
    const num = typeof id === 'string' ? parseInt(id) : id;
    if (num > 0) {
      return { valid: true };
    }
    return { valid: false, message: 'المعرف يجب أن يكون أكبر من صفر' };
  }
  
  return { valid: false, message: 'المعرف غير صالح' };
}

function validateIds(ids) {
  if (!ids || !Array.isArray(ids)) {
    return { valid: false, message: 'المعرفات مطلوبة' };
  }
  if (ids.length === 0) {
    return { valid: false, message: 'يجب إدخال معرف واحد على الأقل' };
  }
  for (const id of ids) {
    const result = validateId(id);
    if (!result.valid) return result;
  }
  return { valid: true };
}

// ============================================
// 👤 USER VALIDATORS
// ============================================

function validateName(name) {
  if (!name) return { valid: false, message: 'الاسم مطلوب' };
  if (name.length < 2) return { valid: false, message: 'الاسم يجب أن يكون حرفين على الأقل' };
  if (name.length > 50) return { valid: false, message: 'الاسم يجب أن لا يتجاوز 50 حرف' };
  return { valid: true };
}

function validateEmail(email) {
  if (!email) return { valid: false, message: 'البريد الإلكتروني مطلوب' };
  if (!validateEmailHelper(email)) return { valid: false, message: 'البريد الإلكتروني غير صحيح' };
  return { valid: true };
}

// ============================================
// 📱 PHONE VALIDATORS - المُضافة حديثاً
// ============================================

/**
 * التحقق من رقم الهاتف
 * @param {string} phone - رقم الهاتف
 * @returns {Object} - { valid: boolean, message: string, cleaned: string }
 */
function validatePhoneNumber(phone) {
  if (!phone) return { valid: false, message: 'رقم الهاتف مطلوب' };
  
  // ✅ إزالة جميع الأحرف غير الرقمية
  const cleaned = phone.replace(/\D/g, '');
  
  // ✅ التحقق من الطول
  if (cleaned.length < 8 || cleaned.length > 15) {
    return { valid: false, message: 'رقم الهاتف يجب أن يكون بين 8 و 15 رقم' };
  }
  
  return { valid: true, cleaned };
}

/**
 * التحقق من رقم المحفظة الإلكترونية
 * @param {string} phone - رقم المحفظة
 * @returns {Object} - { valid: boolean, message: string, cleaned: string }
 */
function validateWalletPhone(phone) {
  const result = validatePhoneNumber(phone);
  if (!result.valid) return result;
  
  const cleaned = result.cleaned || '';
  
  // ✅ التحقق من أن الرقم يبدأ بـ 7 أو 77 (للمحافظ اليمنية)
  // ✅ يمكن تخصيص هذا حسب الدولة
  if (!cleaned.startsWith('7') && !cleaned.startsWith('77')) {
    return { valid: false, message: 'رقم المحفظة يجب أن يبدأ بـ 7 أو 77' };
  }
  
  // ✅ التحقق من الطول المناسب للمحفظة (10 أرقام في اليمن)
  if (cleaned.length !== 10) {
    return { valid: false, message: 'رقم المحفظة يجب أن يكون 10 أرقام' };
  }
  
  return { valid: true, cleaned };
}

/**
 * التحقق من تطابق رقمين هاتف
 * @param {string} phone1 - الرقم الأول
 * @param {string} phone2 - الرقم الثاني
 * @returns {boolean} - true إذا تطابقا
 */
function validatePhoneMatch(phone1, phone2) {
  if (!phone1 || !phone2) return false;
  const clean1 = phone1.replace(/\D/g, '');
  const clean2 = phone2.replace(/\D/g, '');
  return clean1 === clean2;
}

/**
 * تنسيق رقم الهاتف
 * @param {string} phone - رقم الهاتف
 * @param {string} countryCode - رمز الدولة (مثال: +967)
 * @returns {string} - الرقم المنسق
 */
function formatPhoneNumber(phone, countryCode = '+967') {
  const cleaned = phone.replace(/\D/g, '');
  const code = countryCode.replace('+', '');
  
  if (cleaned.startsWith(code)) {
    return `+${cleaned}`;
  }
  
  return `+${code}${cleaned}`;
}

// ============================================
// 🔑 PASSWORD VALIDATORS
// ============================================

function validatePassword(password) {
  if (!password) return { valid: false, message: 'كلمة المرور مطلوبة' };
  if (password.length < 6) return { valid: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  return { valid: true };
}

function validatePasswordStrength(password) {
  const result = validatePassword(password);
  if (!result.valid) return result;
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  let strength = 'ضعيفة';
  if (score >= 6) strength = 'قوية جداً';
  else if (score >= 5) strength = 'قوية';
  else if (score >= 3) strength = 'متوسطة';
  
  return {
    valid: true,
    strength,
    score,
    message: `قوة كلمة المرور: ${strength}`,
  };
}

function validateBusinessName(name) {
  if (!name) return { valid: false, message: 'الاسم التجاري مطلوب' };
  if (name.length < 2) return { valid: false, message: 'الاسم التجاري يجب أن يكون حرفين على الأقل' };
  if (name.length > 100) return { valid: false, message: 'الاسم التجاري يجب أن لا يتجاوز 100 حرف' };
  return { valid: true };
}

// ============================================
// 📦 PRODUCT VALIDATORS
// ============================================

function validateProductTitle(title) {
  if (!title) return { valid: false, message: 'عنوان المنتج مطلوب' };
  if (title.length < 3) return { valid: false, message: 'عنوان المنتج يجب أن يكون 3 أحرف على الأقل' };
  if (title.length > 200) return { valid: false, message: 'عنوان المنتج يجب أن لا يتجاوز 200 حرف' };
  return { valid: true };
}

function validateProductDescription(description) {
  if (!description) return { valid: false, message: 'وصف المنتج مطلوب' };
  if (description.length < 10) return { valid: false, message: 'وصف المنتج يجب أن يكون 10 أحرف على الأقل' };
  if (description.length > 2000) return { valid: false, message: 'وصف المنتج يجب أن لا يتجاوز 2000 حرف' };
  return { valid: true };
}

function validateProductPrice(price) {
  if (price === undefined || price === null) return { valid: false, message: 'سعر المنتج مطلوب' };
  if (typeof price !== 'number' || isNaN(price)) return { valid: false, message: 'سعر المنتج يجب أن يكون رقماً' };
  if (price < 0) return { valid: false, message: 'السعر يجب أن يكون أكبر من صفر' };
  if (price > 1000000) return { valid: false, message: 'السعر كبير جداً' };
  return { valid: true };
}

function validateProductImages(images) {
  if (!images || !Array.isArray(images)) {
    return { valid: false, message: 'يجب إضافة صورة واحدة على الأقل' };
  }
  if (images.length === 0) {
    return { valid: false, message: 'يجب إضافة صورة واحدة على الأقل' };
  }
  if (images.length > 10) {
    return { valid: false, message: 'يمكن إضافة حتى 10 صور فقط' };
  }
  return { valid: true };
}

// ============================================
// 💰 PAYMENT VALIDATORS
// ============================================

function validateAmount(amount) {
  if (amount === undefined || amount === null) {
    return { valid: false, message: 'المبلغ مطلوب' };
  }
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, message: 'المبلغ يجب أن يكون رقماً' };
  }
  if (amount <= 0) {
    return { valid: false, message: 'المبلغ يجب أن يكون أكبر من صفر' };
  }
  if (amount > 1000000) {
    return { valid: false, message: 'المبلغ كبير جداً' };
  }
  return { valid: true };
}

function validateCurrency(currency) {
  const supported = ['USD', 'SAR', 'YER', 'AED', 'KWD', 'QAR', 'BHD', 'OMR'];
  if (!currency) return { valid: false, message: 'العملة مطلوبة' };
  if (!supported.includes(currency)) {
    return { valid: false, message: `العملة غير مدعومة. العملات المدعومة: ${supported.join(', ')}` };
  }
  return { valid: true };
}

// ============================================
// 📋 ORDER VALIDATORS
// ============================================

function validateOrderQuantity(quantity) {
  if (quantity === undefined || quantity === null) {
    return { valid: false, message: 'الكمية مطلوبة' };
  }
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return { valid: false, message: 'الكمية يجب أن تكون رقماً' };
  }
  if (quantity < 1) {
    return { valid: false, message: 'الكمية يجب أن تكون على الأقل 1' };
  }
  if (quantity > 1000) {
    return { valid: false, message: 'الكمية كبيرة جداً' };
  }
  return { valid: true };
}

function validateOrderAddress(address) {
  if (!address) return { valid: false, message: 'العنوان مطلوب' };
  if (address.length < 5) return { valid: false, message: 'العنوان يجب أن يكون 5 أحرف على الأقل' };
  if (address.length > 500) return { valid: false, message: 'العنوان يجب أن لا يتجاوز 500 حرف' };
  return { valid: true };
}

// ============================================
// ⭐ REVIEW/RATING VALIDATORS
// ============================================

function validateRating(rating) {
  if (rating === undefined || rating === null) {
    return { valid: false, message: 'التقييم مطلوب' };
  }
  if (typeof rating !== 'number' || isNaN(rating)) {
    return { valid: false, message: 'التقييم يجب أن يكون رقماً' };
  }
  if (rating < 1 || rating > 5) {
    return { valid: false, message: 'التقييم يجب أن يكون بين 1 و 5' };
  }
  return { valid: true };
}

function validateReview(text) {
  if (!text) return { valid: false, message: 'المراجعة مطلوبة' };
  if (text.length < 3) return { valid: false, message: 'المراجعة يجب أن تكون 3 أحرف على الأقل' };
  if (text.length > 1000) return { valid: false, message: 'المراجعة يجب أن لا تتجاوز 1000 حرف' };
  return { valid: true };
}

// ============================================
// 📦 EXPORTS
// ============================================

module.exports = {
  // ID
  validateId,
  validateIds,
  
  // User
  validateName,
  validateEmail,
  validatePhone: validatePhoneNumber,
  validateWalletPhone,
  validatePhoneMatch,
  formatPhoneNumber,
  validatePassword,
  validatePasswordStrength,
  validateBusinessName,
  
  // Product
  validateProductTitle,
  validateProductDescription,
  validateProductPrice,
  validateProductImages,
  
  // Payment
  validateAmount,
  validateCurrency,
  
  // Order
  validateOrderQuantity,
  validateOrderAddress,
  
  // Review
  validateRating,
  validateReview,
};