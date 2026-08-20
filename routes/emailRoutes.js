// ============================================
// 📧 EMAIL ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const emailService = require('../services/email');
const { emailLimiter } = require('../middleware/rateLimit');

// ============================================
// 📧 إرسال بريد إلكتروني
// ============================================
router.post('/send', emailLimiter, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: '⚠️ to, subject, html مطلوبة',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    console.log(`📧 إرسال بريد إلى: ${to}`);
    console.log(`📌 الموضوع: ${subject}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text: text || '',
      requireAuth: false
    });

    if (result.success) {
      return res.json({
        success: true,
        message: '✅ تم إرسال البريد بنجاح',
        messageId: result.messageId,
        simulated: result.simulated || false,
        ...(result.simulated && { 
          warning: '⚠️ تم استخدام المحاكاة',
          code: result.code
        })
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '❌ فشل إرسال البريد',
        error: result.error || 'EMAIL_SEND_FAILED'
      });
    }
  } catch (error) {
    console.error('❌ خطأ في إرسال الإيميل:', error.message);
    return res.status(500).json({
      success: false,
      message: '❌ حدث خطأ في الخادم',
      error: error.message
    });
  }
});

module.exports = router;