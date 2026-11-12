'use strict';
const express = require('express');
const mongoose = require('mongoose');
const auth = require('../controllers/authController');
const pw = require('../controllers/passwordController');
const user = require('../controllers/userController');
const admin = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, resetLimiter, checkerLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// ---- Health and network demonstration (public) ----
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()), database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() });
});

router.get('/network/info', (req, res) => {
  const h = req.headers;
  res.set('Cache-Control', 'no-store');
  res.json({
    model: 'Client-Server over HTTP (TCP/IP is provided by the operating system)',
    request: {
      method: req.method, url: req.originalUrl, httpVersion: req.httpVersion,
      host: h.host, userAgent: h['user-agent'], accept: h.accept, origin: h.origin || null,
      acceptEncoding: h['accept-encoding'], xForwardedProto: h['x-forwarded-proto'] || null,
    },
    connection: {
      clientAddress: (req.socket.remoteAddress || '').replace('::ffff:', ''),
      clientPort: req.socket.remotePort,
      serverAddress: (req.socket.localAddress || '').replace('::ffff:', ''),
      serverPort: req.socket.localPort,
      family: req.socket.remoteFamily,
      encryptedDirectly: Boolean(req.socket.encrypted),
      tlsProtocol: req.socket.encrypted ? req.socket.getProtocol() : null,
      secureRequest: req.secure,
    },
    server: { time: new Date().toISOString(), node: process.version, platform: process.platform },
  });
});

// ---- Public password checker ----
router.post('/password/check', checkerLimiter, pw.check);
router.get('/password/suggest', checkerLimiter, pw.suggest);
router.get('/password/dfa', pw.dfaDefinition);

// ---- Authentication ----
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/admin-login', authLimiter, auth.adminLogin);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.post('/auth/forgot-password', resetLimiter, auth.forgotPassword);
router.post('/auth/reset-password', resetLimiter, auth.resetPassword);
router.post('/auth/change-password', requireAuth, authLimiter, auth.changePassword);

// ---- Signed-in user ----
router.get('/user/dashboard', requireAuth, user.dashboard);
router.get('/user/profile', requireAuth, user.getProfile);
router.put('/user/profile', requireAuth, user.updateProfile);
router.get('/user/login-history', requireAuth, user.loginHistory);
router.get('/user/security', requireAuth, user.securitySettings);
router.post('/user/security/revoke-sessions', requireAuth, user.revokeOtherSessions);

// ---- Admin (role-based access control) ----
router.use('/admin', requireAdmin);
router.get('/admin/stats', admin.stats);
router.get('/admin/users', admin.listUsers);
router.patch('/admin/users/:id/active', admin.setActive);
router.post('/admin/users/:id/unlock', admin.unlock);
router.get('/admin/login-logs', admin.loginLogs);
router.get('/admin/security-logs', admin.securityLogs);
router.patch('/admin/security-logs/:id/review', admin.reviewEvent);
router.get('/admin/suspicious', admin.suspicious);

module.exports = router;
