// ============================================
// 🔄 KEEP-ALIVE - منع توقف الخادم على Render
// ============================================

const https = require('https');
const http = require('http');
const url = process.env.RENDER_EXTERNAL_URL || 'https://my-backend-hvha.onrender.com';

function keepAlive() {
  const start = Date.now();
  
  // Try HTTPS first
  const req = https.get(url, (res) => {
    console.log(`[${new Date().toISOString()}] ✅ Keep-alive ping: ${res.statusCode} (${Date.now() - start}ms)`);
  });

  req.on('error', (err) => {
    console.log(`[${new Date().toISOString()}] ⚠️ Keep-alive failed: ${err.message}`);
    // Try HTTP as fallback
    http.get(url.replace('https://', 'http://'), (res) => {
      console.log(`[${new Date().toISOString()}] ✅ Keep-alive (HTTP): ${res.statusCode}`);
    });
  });

  req.end();
}

// Run every 4 minutes (Render free tier spins down after 5 minutes)
setInterval(keepAlive, 240000);

// Run immediately on start
setTimeout(keepAlive, 5000);

console.log(`🔄 Keep-alive service started for ${url}`);