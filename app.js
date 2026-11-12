'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const config = require('./config/env');
const csrfGuard = require('./middleware/csrfGuard');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

function createApp({ onShutdown, shutdownToken } = {}) {
  const app = express();
  app.set('trust proxy', config.TRUST_PROXY);
  app.disable('x-powered-by');

  const directives = {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'], fontSrc: ["'self'", 'data:'], objectSrc: ["'none'"],
    baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"],
    connectSrc: ["'self'", ...config.CLIENT_URLS],
  };
  if (config.isProd) directives.upgradeInsecureRequests = [];
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    hsts: config.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin(origin, cb) { cb(null, !origin || config.CLIENT_URLS.includes(origin)); },
    credentials: true,
  }));
  app.use(express.json({ limit: '10kb' }));

  // Request log: method, path (no query string), status, time. Bodies are never logged.
  app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - t}ms`);
    });
    next();
  });

  // Local-only clean shutdown used by STOP-KEYFORT.bat
  if (config.ENABLE_SHUTDOWN_ENDPOINT && onShutdown && shutdownToken) {
    app.post('/__keyfort/shutdown', (req, res) => {
      const addr = req.socket.remoteAddress || '';
      const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);
      const given = Buffer.from(String(req.get('x-shutdown-token') || ''));
      const real = Buffer.from(shutdownToken);
      if (!local || given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      res.json({ message: 'Shutting down' });
      return setTimeout(onShutdown, 100);
    });
  }

  app.use(session({
    name: 'keyfort.sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      client: mongoose.connection.getClient(), dbName: config.DB_NAME,
      collectionName: 'sessions', stringify: false, touchAfter: 60,
      ttl: Math.floor(config.SESSION_MAX_AGE_MS / 1000),
    }),
    cookie: { httpOnly: true, secure: config.COOKIE_SECURE, sameSite: config.COOKIE_SAMESITE, maxAge: config.SESSION_MAX_AGE_MS },
  }));

  app.use('/api', apiLimiter, csrfGuard, routes);
  app.use('/api', notFound);

  // Serve the built React app (frontend/dist) from the same server when it exists.
  const dist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '7d' }));
    app.get('*', (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => res.type('text').send('KeyFort API is running. Build the frontend (cd frontend && npm run build) or run it with: npm run dev'));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
