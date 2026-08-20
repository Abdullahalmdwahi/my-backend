// ============================================
// 📧 EMAIL QUEUE - نظام طابور متقدم
// ============================================

const { EventEmitter } = require('events');

class EmailQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryBaseDelay = 3000;
    this.batchSize = 3;
    this.batchInterval = 1000;
    this.sentCount = 0;
    this.windowStart = Date.now();
    this.windowLimit = 25; // 25 بريد في الدقيقة
    this.windowDuration = 60000;
    this.isPaused = false;
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.startTime = Date.now();
  }

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
      console.log(`📧 [Queue] Added: ${item.id} -> ${emailData.to}`);
      
      if (!this.processing) {
        this.process();
      }
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0 || this.isPaused) {
      return;
    }

    this.processing = true;
    console.log(`📧 [Queue] Processing (${this.queue.length} items)`);

    try {
      const now = Date.now();
      if (now - this.windowStart >= this.windowDuration) {
        this.windowStart = now;
        this.sentCount = 0;
      }

      const available = this.windowLimit - this.sentCount;
      if (available <= 0) {
        const waitTime = this.windowDuration - (now - this.windowStart) + 1000;
        console.log(`⏳ [Queue] Rate limit, waiting ${waitTime}ms`);
        this.processing = false;
        setTimeout(() => this.process(), waitTime);
        return;
      }

      const batchSize = Math.min(this.batchSize, available, this.queue.length);
      const batch = this.queue.splice(0, batchSize);

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        try {
          const result = await this.sendEmailWithRetry(item);
          this.sentCount++;
          this.totalProcessed++;
          item.status = 'sent';
          item.resolve(result);
          console.log(`✅ [Queue] Sent: ${item.id} -> ${item.to}`);

          if (i < batch.length - 1) {
            await this.sleep(500);
          }
        } catch (error) {
          this.totalFailed++;
          item.status = 'failed';
          
          if (item.attempts < this.maxRetries) {
            item.attempts++;
            const delay = this.retryBaseDelay * Math.pow(2, item.attempts);
            console.log(`🔄 [Queue] Retry ${item.attempts}/${this.maxRetries} for ${item.id} in ${delay}ms`);
            this.queue.unshift(item);
          } else {
            console.error(`❌ [Queue] Failed: ${item.id}`);
            item.reject(error);
          }
        }
      }

      if (this.queue.length > 0) {
        await this.sleep(100);
        this.processing = false;
        this.process();
      } else {
        this.processing = false;
        console.log(`📧 [Queue] Done. Processed: ${this.totalProcessed}, Failed: ${this.totalFailed}`);
      }

    } catch (error) {
      console.error(`❌ [Queue] Error:`, error);
      this.processing = false;
      setTimeout(() => this.process(), 5000);
    }
  }

  async sendEmailWithRetry(item) {
    const emailService = require('./email');
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await emailService._sendEmailDirect({
          to: item.to,
          subject: item.subject,
          html: item.html,
          text: item.text,
        });

        if (result.success) {
          return result;
        }
        throw new Error(result.error || 'Send failed');
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const delay = this.retryBaseDelay * Math.pow(2, attempt);
          console.log(`⏳ [Queue] Attempt ${attempt}/${this.maxRetries} failed, retry in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  pause() {
    this.isPaused = true;
    console.log(`📧 [Queue] Paused`);
  }

  resume() {
    this.isPaused = false;
    console.log(`📧 [Queue] Resumed`);
    this.process();
  }

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
    };
  }

  resetStats() {
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.sentCount = 0;
    this.windowStart = Date.now();
    console.log(`📧 [Queue] Stats reset`);
  }
}

module.exports = new EmailQueue();