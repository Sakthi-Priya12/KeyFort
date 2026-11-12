'use strict';
const User = require('../models/User');
const { logSecurity } = require('../services/securityLogger');

/** Requires a valid session. Role and active status are always re-read from the database. */
async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      return req.session.destroy(() => {
        res.clearCookie('keyfort.sid');
        res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
      });
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Requires an authenticated admin. */
function requireAdmin(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return next(err);
    if (req.user.role !== 'admin') {
      await logSecurity({
        req, type: 'UNAUTHORIZED_ACCESS', severity: 'warning', user: req.user._id,
        email: req.user.email, details: `Non-admin tried ${req.method} ${req.originalUrl.split('?')[0]}`,
      });
      return res.status(403).json({ message: 'Administrator access required.' });
    }
    return next();
  });
}

module.exports = { requireAuth, requireAdmin };
