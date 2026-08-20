// ============================================
// 📧 EMAIL QUEUE - نظام طابور البريد الإلكتروني
// ============================================

const { EventEmitter } = require('events');

class EmailQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryBaseDelay = 3000; // 3 ثواني
    this.batchSize = 3;
    this.batchInterval = 1000; // 1 ثانية بين الدفعات
    this.sentCount = 0;
    this.windowStart = Date.now();
    this.windowLimit = 45; // 45 بريد في الدقيقة
    this.windowDuration = 60000; // دقيقة واحدة
    this.isPaused = false;
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.startTime = Date.now();
  }

  // ✅ إضافة بريد إلى الطابور
  async add(emailData) {
    return new Promise((resolve, reject) => {
      const item = {
        ...emailData,
        id: this.generateId(),
        attempts: 0,
        resolve,
        reject,
        addedAt: Date.now(),
        status: 'pending',
      };
      this.queue.push(item);
      console.log(`📧 [Queue] Added email to queue: ${item.id} -> ${emailData.to}`);
      
      // ✅ معالجة فورية إذا كان الطابور فارغاً
      if (!this.processing) {
        this.process();
      }
    });
  }

  // ✅ معالجة الطابور
  async process() {
    if (this.processing || this.queue.length === 0 || this.isPaused) {
      return;
    }

    this.processing = true;
    console.log(`📧 [Queue] Processing queue (${this.queue.length} items)`);

    try {
      // ✅ التحقق من الحدود الزمنية
      const now = Date.now();
      if (now - this.windowStart >= this.windowDuration) {
        this.windowStart = now;
        this.sentCount = 0;
        console.log(`📧 [Queue] Rate limit window reset`);
      }

      // ✅ حساب عدد الرسائل التي يمكن إرسالها
      const available = this.windowLimit - this.sentCount;
      if (available <= 0) {
        const waitTime = this.windowDuration - (now - this.windowStart) + 1000;
        console.log(`⏳ [Queue] Rate limit reached, waiting ${waitTime}ms`);
        this.processing = false;
        setTimeout(() => this.process(), waitTime);
        return;
      }

      // ✅ معالجة دفعة
      const batchSize = Math.min(this.batchSize, available, this.queue.length);
      const batch = this.queue.splice(0, batchSize);

      console.log(`📧 [Queue] Processing batch of ${batch.length} emails`);

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        try {
          // ✅ محاولة الإرسال
          const result = await this.sendEmailWithRetry(item);
          this.sentCount++;
          this.totalProcessed++;
          item.status = 'sent';
          item.resolve(result);
          console.log(`✅ [Queue] Email sent: ${item.id} -> ${item.to}`);

          // ✅ تأخير بين الرسائل في نفس الدفعة
          if (i < batch.length - 1) {
            await this.sleep(500);
          }
        } catch (error) {
          this.totalFailed++;
          item.status = 'failed';
          
          // ✅ إعادة المحاولة مع Backoff
          if (item.attempts < this.maxRetries) {
            item.attempts++;
            const delay = this.retryBaseDelay * Math.pow(2, item.attempts);
            console.log(`🔄 [Queue] Retry ${item.attempts}/${this.maxRetries} for ${item.id} in ${delay}ms`);
            this.queue.unshift(item); // إعادة للطابور
          } else {
            console.error(`❌ [Queue] Failed after ${this.maxRetries} attempts: ${item.id}`);
            item.reject(error);
          }
        }
      }

      // ✅ استمرار المعالجة
      if (this.queue.length > 0) {
        await this.sleep(100);
        this.processing = false;
        this.process();
      } else {
        this.processing = false;
        console.log(`📧 [Queue] Queue empty. Processed: ${this.totalProcessed}, Failed: ${this.totalFailed}`);
      }

    } catch (error) {
      console.error(`❌ [Queue] Processing error:`, error);
      this.processing = false;
      setTimeout(() => this.process(), 5000);
    }
  }

  // ✅ إرسال بريد مع Retry
  async sendEmailWithRetry(item) {
    const emailService = require('./email');
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await Promise.race([
          emailService.sendEmailDirect({
            to: item.to,
            subject: item.subject,
            html: item.html,
            text: item.text,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 30s')), 30000)
          )
        ]);

        if (result.success) {
          return result;
        }
        throw new Error(result.error || 'Send failed');
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = this.retryBaseDelay * Math.pow(2, attempt);
          console.log(`⏳ [Queue] Attempt ${attempt}/${maxAttempts} failed, retry in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // ✅ توليد معرف فريد
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  // ✅ تأخير
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ✅ إيقاف مؤقت
  pause() {
    this.isPaused = true;
    console.log(`📧 [Queue] Paused`);
  }

  // ✅ استئناف
  resume() {
    this.isPaused = false;
    console.log(`📧 [Queue] Resumed`);
    this.process();
  }

  // ✅ الحصول على حالة الطابور
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      isPaused: this.isPaused,
      sentCount: this.sentCount,
      windowLimit: this.windowLimit,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      items: this.queue.map(item => ({
        id: item.id,
        to: item.to,
        attempts: item.attempts,
        status: item.status,
        addedAt: new Date(item.addedAt).toISOString(),
      })),
    };
  }

  // ✅ إعادة تعيين الإحصائيات
  resetStats() {
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.sentCount = 0;
    this.windowStart = Date.now();
    console.log(`📧 [Queue] Stats reset`);
  }
}

module.exports = new EmailQueue();