'use strict';
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const SecurityLog = require('../models/SecurityLog');
const { revokeUserSessions } = require('../services/sessionService');
const { logSecurity } = require('../services/securityLogger');
const { escapeRegex, toInt } = require('../utils/validators');

const DAY = 86400000;
const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v));

exports.stats = async (req, res, next) => {
  try {
    const now = new Date();
    const since7 = new Date(now.getTime() - 6 * DAY);
    since7.setHours(0, 0, 0, 0);
    const [totalUsers, activeUsers, lockedAccounts, successLogins, failedLogins, recentEvents, daily] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ lockUntil: { $gt: now } }),
      LoginLog.countDocuments({ success: true }),
      LoginLog.countDocuments({ success: false }),
      SecurityLog.find().sort({ createdAt: -1 }).limit(8).lean(),
      LoginLog.aggregate([
        { $match: { createdAt: { $gte: since7 } } },
        { $group: { _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, ok: '$success' }, n: { $sum: 1 } } },
      ]),
    ]);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * DAY);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: key, success: 0, failed: 0 });
    }
    // Aggregation groups by UTC date; map entries onto the same UTC-based keys.
    const utcKey = (t) => new Date(t).toISOString().slice(0, 10);
    const utcDays = days.map((_, idx) => utcKey(now.getTime() - (6 - idx) * DAY));
    utcDays.forEach((k, idx) => { days[idx].date = k; });
    for (const row of daily) {
      const slot = days.find((x) => x.date === row._id.d);
      if (slot) slot[row._id.ok ? 'success' : 'failed'] = row.n;
    }
    const unreviewed = await SecurityLog.countDocuments({ reviewed: false, severity: { $ne: 'info' } });
    res.json({ totalUsers, activeUsers, lockedAccounts, successLogins, failedLogins, unreviewedAlerts: unreviewed, recentEvents, daily: days });
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const page = toInt(req.query.page, 1, 1, 10000);
    const limit = toInt(req.query.limit, 10, 1, 50);
    const filter = {};
    const q = String(req.query.search || '').trim().slice(0, 60);
    if (q) filter.$or = [{ name: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }];
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.status === 'locked') filter.lockUntil = { $gt: new Date() };
    if (req.query.role === 'admin' || req.query.role === 'user') filter.role = req.query.role;
    const [docs, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ items: docs.map((u) => u.toSafeJSON()), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { next(err); }
};

exports.setActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};
    if (!isId(id) || typeof isActive !== 'boolean') return res.status(400).json({ message: 'Invalid request.' });
    if (String(req.user._id) === id) return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.isActive = isActive;
    await user.save();
    if (!isActive) await revokeUserSessions(user._id);
    await logSecurity({ req, type: isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED', severity: isActive ? 'info' : 'warning', user: user._id, email: user.email, details: `By admin ${req.user.email}` });
    res.json({ message: isActive ? 'Account activated.' : 'Account deactivated and signed out.', user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.unlock = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid request.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    await user.save();
    await logSecurity({ req, type: 'ACCOUNT_UNLOCKED', user: user._id, email: user.email, details: `By admin ${req.user.email}` });
    res.json({ message: 'Account unlocked.', user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.loginLogs = async (req, res, next) => {
  try {
    const page = toInt(req.query.page, 1, 1, 10000);
    const limit = toInt(req.query.limit, 15, 1, 100);
    const filter = {};
    if (req.query.status === 'success') filter.success = true;
    if (req.query.status === 'failed') filter.success = false;
    const q = String(req.query.search || '').trim().slice(0, 60);
    if (q) filter.$or = [{ email: new RegExp(escapeRegex(q), 'i') }, { ip: new RegExp(escapeRegex(q), 'i') }];
    const [items, total] = await Promise.all([
      LoginLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      LoginLog.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { next(err); }
};

exports.securityLogs = async (req, res, next) => {
  try {
    const page = toInt(req.query.page, 1, 1, 10000);
    const limit = toInt(req.query.limit, 15, 1, 100);
    const filter = {};
    if (['info', 'warning', 'critical'].includes(req.query.severity)) filter.severity = req.query.severity;
    if (req.query.type && SecurityLog.TYPES.includes(req.query.type)) filter.type = req.query.type;
    if (req.query.reviewed === 'false') filter.reviewed = false;
    const [items, total] = await Promise.all([
      SecurityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SecurityLog.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), types: SecurityLog.TYPES });
  } catch (err) { next(err); }
};

exports.reviewEvent = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid request.' });
    const ev = await SecurityLog.findByIdAndUpdate(req.params.id, { reviewed: true, reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true });
    if (!ev) return res.status(404).json({ message: 'Event not found.' });
    res.json({ message: 'Marked as reviewed.', event: ev });
  } catch (err) { next(err); }
};

/** Heuristics: IPs and e-mails with many recent failures. */
exports.suspicious = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 60 * 60000);
    const [byIp, byEmail] = await Promise.all([
      LoginLog.aggregate([
        { $match: { success: false, createdAt: { $gte: since } } },
        { $group: { _id: '$ip', failures: { $sum: 1 }, emails: { $addToSet: '$email' }, last: { $max: '$createdAt' } } },
        { $match: { failures: { $gte: 5 } } }, { $sort: { failures: -1 } }, { $limit: 20 },
      ]),
      LoginLog.aggregate([
        { $match: { success: false, createdAt: { $gte: since } } },
        { $group: { _id: '$email', failures: { $sum: 1 }, ips: { $addToSet: '$ip' }, last: { $max: '$createdAt' } } },
        { $match: { failures: { $gte: 3 } } }, { $sort: { failures: -1 } }, { $limit: 20 },
      ]),
    ]);
    res.json({
      windowMinutes: 60,
      ips: byIp.map((r) => ({ ip: r._id, failures: r.failures, distinctEmails: r.emails.length, last: r.last, pattern: r.emails.length >= 3 ? 'Credential stuffing pattern (many accounts)' : 'Repeated failures' })),
      accounts: byEmail.map((r) => ({ email: r._id, failures: r.failures, distinctIps: r.ips.length, last: r.last, pattern: r.ips.length >= 2 ? 'Attempts from multiple IPs' : 'Repeated failures' })),
    });
  } catch (err) { next(err); }
};
