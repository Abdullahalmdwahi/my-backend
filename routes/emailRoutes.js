// ============================================
// 📧 EMAIL ROUTES - النسخة المُصلحة
// ============================================

const express = require('express');
const router = express.Router();
const emailService = require('../services/email');

// ✅ مسار إرسال الإيميلات (بدون مصادقة)
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: '⚠️ to, subject, html مطلوبة'
      });
    }

    console.log(`📧 إرسال بريد إلى: ${to}`);
    console.log(`📌 الموضوع: ${subject}`);

    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      requireAuth: false
    });

    if (result.success) {
      return res.json({
        success: true,
        message: '✅ تم إرسال البريد بنجاح',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '❌ فشل إرسال البريد',
        error: result.error
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