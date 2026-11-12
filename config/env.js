'use strict';
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bool = (v, d) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true');
const num = (v, d) => (v === undefined || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  if (isProd) {
    throw new Error('SESSION_SECRET must be set (32+ characters) when NODE_ENV=production.');
  }
  sessionSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[config] SESSION_SECRET missing/short: using a temporary secret (sessions reset on restart). Run "node scripts/setup.js".');
}

const smtpConfigured = Boolean(process.env.SMTP_HOST);

module.exports = {
  NODE_ENV,
  isProd,
  PORT: num(process.env.PORT, 5000),
  HOST: process.env.HOST || (isProd ? '0.0.0.0' : '127.0.0.1'),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/keyfortDB',
  DB_NAME: process.env.MONGODB_DB_NAME || 'keyfortDB',
  SESSION_SECRET: sessionSecret,
  SESSION_MAX_AGE_MS: num(process.env.SESSION_MAX_AGE_MIN, 480) * 60 * 1000,
  COOKIE_SECURE: bool(process.env.COOKIE_SECURE, isProd),
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || 'lax',
  CLIENT_URLS: (process.env.CLIENT_URL || 'http://localhost:5000,http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),
  TRUST_PROXY: num(process.env.TRUST_PROXY, 0),
  MAX_FAILED_ATTEMPTS: num(process.env.MAX_FAILED_ATTEMPTS, 5),
  LOCK_MINUTES: num(process.env.LOCK_MINUTES, 15),
  RESET_TOKEN_MINUTES: num(process.env.RESET_TOKEN_MINUTES, 30),
  BCRYPT_ROUNDS: num(process.env.BCRYPT_ROUNDS, 12),
  HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH || '',
  HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH || '',
  SMTP: {
    configured: smtpConfigured,
    host: process.env.SMTP_HOST,
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'KeyFort <no-reply@keyfort.local>',
  },
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || '',
  // In development without SMTP the reset link is returned in the API response (never logged).
  SHOW_DEV_RESET_LINK: !isProd && !smtpConfigured,
  ENABLE_SHUTDOWN_ENDPOINT: bool(process.env.ENABLE_SHUTDOWN_ENDPOINT, !isProd),
};
