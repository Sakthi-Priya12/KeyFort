'use strict';
const rateLimit = require('express-rate-limit');
const { logSecurity } = require('../services/securityLogger');

function make({ windowMs, max, label }) {
  return rateLimit({
    windowMs, max, standardHeaders: true, legacyHeaders: false,
    handler: async (req, res) => {
      await logSecurity({ req, type: 'RATE_LIMIT_HIT', severity: 'warning', details: `${label}: ${req.method} ${req.originalUrl.split('?')[0]}` });
      res.status(429).json({ message: 'Too many requests. Please wait a while and try again.' });
    },
  });
}

module.exports = {
  apiLimiter: make({ windowMs: 15 * 60 * 1000, max: 600, label: 'API limit' }),
  authLimiter: make({ windowMs: 15 * 60 * 1000, max: 25, label: 'Auth limit' }),
  resetLimiter: make({ windowMs: 60 * 60 * 1000, max: 8, label: 'Password reset limit' }),
  checkerLimiter: make({ windowMs: 60 * 1000, max: 120, label: 'Checker limit' }),
};
