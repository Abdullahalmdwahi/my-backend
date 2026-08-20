const express = require('express');
const router = express.Router();
const emailQueue = require('../services/emailQueue');
const { emailLimiter } = require('../middleware/rateLimit');

// ✅ إرسال بريد عبر Queue
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

    // ✅ إضافة إلى الطابور
    const result = await emailQueue.add({
      to,
      subject,
      html,
      text: text || '',
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

// ✅ الحصول على حالة الطابور (للمراقبة)
router.get('/queue/status', async (req, res) => {
  try {
    const status = emailQueue.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ فشل جلب حالة الطابور',
    });
  }
});

module.exports = router;