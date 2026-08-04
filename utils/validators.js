// ============================================
// ✅ VALIDATORS - نسخة معدلة
// ============================================

const { validateEmail: validateEmailHelper, validatePhoneNumber } = require('./helpers');

// ============================================
// 🔢 ID VALIDATORS
// ============================================

function validateId(id) {
  if (!id) return { valid: false, message: 'المعرف مطلوب' };
  
  if (typeof id === 'string' && id.includes('-')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return { valid: true };
    }
    return { valid: false, message: 'المعرف غير صالح (UUID غير صحيح)' };
  }
  
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

// ✅ النسخة الوحيدة من validateEmail - استخدمت validateEmailHelper من helpers
function validateEmail(email) {
  if (!email) return { valid: false, message: 'البريد الإلكتروني مطلوب' };
  if (!validateEmailHelper(email)) return { valid: false, message: 'البريد الإلكتروني غير صحيح' };
  return { valid: true };
}

function validatePhone(phone) {
  if (!phone) return { valid: false, message: 'رقم الهاتف مطلوب' };
  if (!validatePhoneNumber(phone)) return { valid: false, message: 'رقم الهاتف غير صحيح' };
  return { valid: true };
}

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
  
  let strength = 'weak';
  if (score >= 6) strength = 'very_strong';
  else if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
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

function validateProductCategory(categoryIds) {
  if (!categoryIds || !Array.isArray(categoryIds)) {
    return { valid: false, message: 'يجب اختيار قسم واحد على الأقل' };
  }
  if (categoryIds.length === 0) {
    return { valid: false, message: 'يجب اختيار قسم واحد على الأقل' };
  }
  if (categoryIds.length > 10) {
    return { valid: false, message: 'يمكن اختيار حتى 10 أقسام فقط' };
  }
  return { valid: true };
}

// ============================================
// 🔨 AUCTION VALIDATORS
// ============================================

function validateAuctionTitle(title) {
  return validateProductTitle(title);
}

function validateAuctionDescription(description) {
  return validateProductDescription(description);
}

function validateAuctionStartingPrice(price) {
  return validateProductPrice(price);
}

function validateAuctionMinBidIncrement(increment) {
  if (increment === undefined || increment === null) {
    return { valid: false, message: 'الحد الأدنى للزيادة مطلوب' };
  }
  if (typeof increment !== 'number' || isNaN(increment)) {
    return { valid: false, message: 'الحد الأدنى للزيادة يجب أن يكون رقماً' };
  }
  if (increment < 1) {
    return { valid: false, message: 'الحد الأدنى للزيادة يجب أن يكون أكبر من صفر' };
  }
  return { valid: true };
}

function validateAuctionEndTime(endTime) {
  if (!endTime) return { valid: false, message: 'وقت الانتهاء مطلوب' };
  const end = new Date(endTime);
  if (isNaN(end.getTime())) return { valid: false, message: 'وقت الانتهاء غير صحيح' };
  if (end <= new Date()) return { valid: false, message: 'وقت الانتهاء يجب أن يكون في المستقبل' };
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

function validatePaymentMethod(method) {
  const supported = ['wallet', 'card', 'bank', 'digital', 'cash', 'purchase_code'];
  if (!method) return { valid: false, message: 'طريقة الدفع مطلوبة' };
  if (!supported.includes(method)) {
    return { valid: false, message: `طريقة الدفع غير مدعومة` };
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
// 🏷️ TAG/CATEGORY VALIDATORS
// ============================================

function validateCategoryName(name) {
  if (!name) return { valid: false, message: 'اسم القسم مطلوب' };
  if (name.length < 2) return { valid: false, message: 'اسم القسم يجب أن يكون حرفين على الأقل' };
  if (name.length > 50) return { valid: false, message: 'اسم القسم يجب أن لا يتجاوز 50 حرف' };
  return { valid: true };
}

function validateTag(tag) {
  if (!tag) return { valid: false, message: 'التصنيف مطلوب' };
  if (tag.length < 2) return { valid: false, message: 'التصنيف يجب أن يكون حرفين على الأقل' };
  if (tag.length > 30) return { valid: false, message: 'التصنيف يجب أن لا يتجاوز 30 حرف' };
  return { valid: true };
}

// ============================================
// 📌 REVIEW/RATING VALIDATORS
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
  validatePhone,
  validatePassword,
  validatePasswordStrength,
  validateBusinessName,
  
  // Product
  validateProductTitle,
  validateProductDescription,
  validateProductPrice,
  validateProductImages,
  validateProductCategory,
  
  // Auction
  validateAuctionTitle,
  validateAuctionDescription,
  validateAuctionStartingPrice,
  validateAuctionMinBidIncrement,
  validateAuctionEndTime,
  
  // Payment
  validateAmount,
  validateCurrency,
  validatePaymentMethod,
  
  // Order
  validateOrderQuantity,
  validateOrderAddress,
  
  // Category
  validateCategoryName,
  validateTag,
  
  // Review
  validateRating,
  validateReview,
};