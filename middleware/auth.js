// ============================================
// 🔐 مصادقة JWT مع تجديد تلقائي
// ============================================

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_THRESHOLD = 24 * 60 * 60;

// ✅ توليد JWT Token
function generateToken(userId, email, role = 'user') {
  return jwt.sign(
    { 
      id: userId, 
      email: email,
      role: role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ✅ التحقق من صحة التوكن وإرجاع بيانات المستخدم
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // ✅ محاولة تجديد التوكن إذا كان منتهياً
      const decoded = jwt.decode(token);
      if (decoded) {
        const newToken = generateToken(decoded.id, decoded.email, decoded.role);
        return { valid: true, user: decoded, newToken: newToken, refreshed: true };
      }
    }
    return { valid: false, error: error.message };
  }
}

// ✅ التحقق من JWT Token مع تجديد تلقائي
function verifyAndRefreshToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return { valid: false, error: '❌ توكن غير صالح' };
    
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = verified.exp - now;
      
      if (timeLeft < JWT_REFRESH_THRESHOLD) {
        const newToken = generateToken(verified.id, verified.email, verified.role);
        return { 
          valid: true, 
          user: verified, 
          newToken: newToken,
          refreshed: true 
        };
      }
      
      return { valid: true, user: verified, refreshed: false };
      
    } catch (verifyError) {
      if (verifyError.name === 'TokenExpiredError') {
        const now = Math.floor(Date.now() / 1000);
        const expiredTime = decoded.exp || 0;
        const daysSinceExpiry = (now - expiredTime) / (24 * 60 * 60);
        
        if (daysSinceExpiry < 1) {
          const newToken = generateToken(decoded.id, decoded.email, decoded.role);
          return { 
            valid: true, 
            user: decoded, 
            newToken: newToken,
            refreshed: true,
            wasExpired: true
          };
        }
        
        return { valid: false, error: '❌ انتهت صلاحية التوكن' };
      }
      
      return { valid: false, error: '❌ توكن غير صالح' };
    }
  } catch (error) {
    return { valid: false, error: '❌ خطأ في التحقق من التوكن' };
  }
}

// ✅ Middleware - التحقق من المصادقة
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '❌ غير مصرح: لا يوجد توكن'
      });
    }

    const token = authHeader.split(' ')[1];
    
    const result = verifyAndRefreshToken(token);
    
    if (!result.valid) {
      return res.status(401).json({
        success: false,
        message: result.error || '❌ غير مصرح: توكن غير صالح'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', result.user.id)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '❌ غير مصرح: المستخدم غير موجود'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      business_name: user.business_name,
      phone: user.phone
    };

    if (result.refreshed && result.newToken) {
      req.newToken = result.newToken;
    }

    next();
  } catch (error) {
    console.error('❌ خطأ في المصادقة:', error);
    return res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في المصادقة'
    });
  }
}

// ✅ Middleware - التحقق من صلاحيات المدير
function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '❌ غير مصرح: يجب تسجيل الدخول أولاً'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '❌ ممنوع: ليس لديك صلاحيات مدير'
    });
  }

  next();
}

// ✅ Middleware - التحقق من صلاحيات المدير العام
function isSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '❌ غير مصرح: يجب تسجيل الدخول أولاً'
    });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '❌ ممنوع: ليس لديك صلاحيات مدير عام'
    });
  }

  next();
}

module.exports = {
  generateToken,
  verifyToken,
  verifyAndRefreshToken,
  authenticate,
  isAdmin,
  isSuperAdmin
};