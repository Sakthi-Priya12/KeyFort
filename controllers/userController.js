'use strict';
const bcrypt = require('bcryptjs');
const LoginLog = require('../models/LoginLog');
const SecurityLog = require('../models/SecurityLog');
const User = require('../models/User');
const { countUserSessions, revokeUserSessions } = require('../services/sessionService');
const { logSecurity } = require('../services/securityLogger');
const config = require('../config/env');
const { isEmail, isName, isString, normalizeEmail, toInt } = require('../utils/validators');

const DAY = 86400000;

async function securitySummary(user) {
  const since = new Date(Date.now() - DAY);
  const [failed24h, sessions] = await Promise.all([
    LoginLog.countDocuments({ user: user._id, success: false, createdAt: { $gt: since } }),
    countUserSessions(user._id),
  ]);
  const ageDays = Math.floor((Date.now() - user.passwordChangedAt.getTime()) / DAY);
  const issues = [];
  if (ageDays > 90) issues.push('Your password is older than 90 days. Consider changing it.');
  if (failed24h > 0) issues.push(`${failed24h} failed sign-in attempt(s) on your account in the last 24 hours.`);
  if (sessions > 1) issues.push(`You are signed in on ${sessions} devices.`);
  if (user.isLocked) issues.push('Your account is temporarily locked.');
  return {
    level: user.isLocked || failed24h >= 3 ? 'attention' : issues.length ? 'good' : 'excellent',
    passwordAgeDays: ageDays,
    passwordPolicy: user.passwordMeetsPolicy ? 'Compliant (DFA + Regex verified when the password was set)' : 'Needs update',
    failedLogins24h: failed24h,
    activeSessions: sessions,
    lockPolicy: `${config.MAX_FAILED_ATTEMPTS} failed attempts lock the account for ${config.LOCK_MINUTES} minutes`,
    issues,
  };
}

exports.dashboard = async (req, res, next) => {
  try {
    const recent = await LoginLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(6).lean();
    res.json({ user: req.user.toSafeJSON(), security: await securitySummary(req.user), recentLogins: recent });
  } catch (err) { next(err); }
};

exports.getProfile = (req, res) => res.json({ user: req.user.toSafeJSON() });

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, currentPassword } = req.body || {};
    const errors = {};
    if (!isName(name)) errors.name = 'Enter your name (2-60 characters).';
    if (!isEmail(email)) errors.email = 'Enter a valid email address.';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });

    const user = await User.findById(req.user._id).select('+passwordHash');
    const emailN = normalizeEmail(email);
    if (emailN !== user.email) {
      if (!isString(currentPassword) || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(400).json({ message: 'Enter your current password to change your email.', errors: { currentPassword: 'Incorrect or missing password.' } });
      }
      if (await User.exists({ email: emailN, _id: { $ne: user._id } })) {
        return res.status(409).json({ message: 'That email is already in use.', errors: { email: 'Already registered.' } });
      }
      user.email = emailN;
    }
    user.name = name.trim();
    await user.save();
    await logSecurity({ req, type: 'PROFILE_UPDATED', user: user._id, email: user.email, details: 'Profile updated' });
    res.json({ message: 'Profile saved.', user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.loginHistory = async (req, res, next) => {
  try {
    const page = toInt(req.query.page, 1, 1, 10000);
    const limit = toInt(req.query.limit, 10, 1, 50);
    const filter = { user: req.user._id };
    if (req.query.status === 'success') filter.success = true;
    if (req.query.status === 'failed') filter.success = false;
    const [items, total] = await Promise.all([
      LoginLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      LoginLog.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { next(err); }
};

exports.securitySettings = async (req, res, next) => {
  try {
    const events = await SecurityLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8).lean();
    res.json({ security: await securitySummary(req.user), events, currentSession: { startedFromIp: (req.ip || '').replace('::ffff:', ''), cookie: { httpOnly: true, secure: config.COOKIE_SECURE, sameSite: config.COOKIE_SAMESITE } } });
  } catch (err) { next(err); }
};

exports.revokeOtherSessions = async (req, res, next) => {
  try {
    const count = await revokeUserSessions(req.user._id, req.sessionID);
    await logSecurity({ req, type: 'SESSIONS_REVOKED', user: req.user._id, email: req.user.email, details: `${count} other session(s) signed out` });
    res.json({ message: count ? `Signed out of ${count} other device(s).` : 'No other devices were signed in.', revoked: count });
  } catch (err) { next(err); }
};
