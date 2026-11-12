'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const mongoose = require('mongoose');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');

const RUN_FILE = path.join(__dirname, '.keyfort-run.json');

async function main() {
  console.log(`[KeyFort] Connecting to MongoDB (database "${config.DB_NAME}")...`);
  await connectDB();
  console.log('[KeyFort] MongoDB connected.');
  // Make sure all indexes (unique email, TTL...) exist.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  const shutdownToken = crypto.randomBytes(24).toString('hex');
  let server;
  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(`[KeyFort] ${signal || 'Shutdown requested'}: closing server...`);
    try { fs.unlinkSync(RUN_FILE); } catch (e) { /* ignore */ }
    const force = setTimeout(() => process.exit(0), 5000);
    force.unref();
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
    if (server.closeAllConnections) server.closeAllConnections();
  };

  const app = createApp({ onShutdown: () => shutdown('Stop command'), shutdownToken });
  const useTls = Boolean(config.HTTPS_KEY_PATH && config.HTTPS_CERT_PATH);
  server = useTls
    ? https.createServer({ key: fs.readFileSync(config.HTTPS_KEY_PATH), cert: fs.readFileSync(config.HTTPS_CERT_PATH), minVersion: 'TLSv1.2' }, app)
    : http.createServer(app);

  server.listen(config.PORT, config.HOST, () => {
    const proto = useTls ? 'https' : 'http';
    fs.writeFileSync(RUN_FILE, JSON.stringify({ pid: process.pid, port: config.PORT, protocol: proto, token: shutdownToken, startedAt: new Date().toISOString() }));
    console.log(`[KeyFort] Ready on ${proto}://localhost:${config.PORT}  (mode: ${config.NODE_ENV})`);
  });
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `[KeyFort] Port ${config.PORT} is already in use. Change PORT in backend/.env.` : err);
    process.exit(1);
  });

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[KeyFort] Failed to start:', err.message);
  process.exit(1);
});
