'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/env');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { validatePassword } = require('../services/passwordValidator');
const { logLogin, logSecurity } = require('../services/securityLogger');
const { revokeUserSessions } = require('../services/sessionService');
const { sendResetEmail } = require('../services/mailer');
const { isEmail, isName, isString, normalizeEmail } = require('../utils/validators');

const INVALID = { message: 'Invalid email or password.' };
const DUMMY_HASH = bcrypt.hashSync('keyfort-timing-equaliser', 10);
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

/** Checks policy (DFA + Regex) and rejects weak/common passwords. Returns an error string or null. */
function policyError(password) {
  if (!isString(password) || !password) return 'Password is required.';
  const r = validatePassword(password);
  if (!r.accepted) return `Password does not meet the policy. Missing: ${r.missing.join('; ')}.`;
  if (!r.comparison.consistent) return 'Password validation error. Please try another password.';
  if (r.strength.label === 'Weak') return 'This password is too common or predictable. Choose a stronger one.';
  return null;
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};
    const errors = {};
    if (!isName(name)) errors.name = 'Enter your name (2-60 characters).';
    if (!isEmail(email)) errors.email = 'Enter a valid email address.';
    const pErr = policyError(password);
    if (pErr) errors.password = pErr;
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });

    const emailN = normalizeEmail(email);
    if (await User.exists({ email: emailN })) {
      return res.status(409).json({ message: 'An account with this email already exists.', errors: { email: 'This email is already registered.' } });
    }
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const user = await User.create({ name: name.trim(), email: emailN, passwordHash, role: 'user', passwordMeetsPolicy: true });
    await logSecurity({ req, type: 'REGISTER', user: user._id, email: user.email, details: 'New account registered' });
    return res.status(201).json({ message: 'Account created. You can now sign in.', user: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
};

async function performLogin(req, res, next, adminOnly) {
  try {
    const { email, password } = req.body || {};
    if (!isString(email) || !isString(password) || !email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const emailN = normalizeEmail(email);
    const user = await User.findOne({ email: emailN }).select('+passwordHash');
    const base = { req, email: emailN, isAdminLogin: adminOnly };

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // equalise timing
      await logLogin({ ...base, success: false, reason: 'UNKNOWN_EMAIL' });
      return res.status(401).json(INVALID);
    }
    if (!user.isActive) {
      await logLogin({ ...base, user: user._id, success: false, reason: 'ACCOUNT_DEACTIVATED' });
      return res.status(403).json({ message: 'This account has been deactivated. Contact an administrator.' });
    }
    if (user.isLocked) {
      const mins = Math.max(1, Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000));
      await logLogin({ ...base, user: user._id, success: false, reason: 'ACCOUNT_LOCKED' });
      return res.status(423).json({ message: `Too many failed attempts. Account locked. Try again in ${mins} minute(s).`, lockedUntil: user.lockUntil });
    }
    if (user.lockUntil && user.lockUntil.getTime() <= Date.now()) {
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    const roleOk = !adminOnly || user.role === 'admin';
    if (!passwordOk || !roleOk) {
      user.failedLoginAttempts += 1;
      let locked = false;
      if (user.failedLoginAttempts >= config.MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + config.LOCK_MINUTES * 60000);
        locked = true;
      }
      await user.save();
      await logLogin({ ...base, user: user._id, success: false, reason: passwordOk ? 'NOT_ADMIN' : 'WRONG_PASSWORD' });
      if (!roleOk && passwordOk) {
        await logSecurity({ req, type: 'UNAUTHORIZED_ACCESS', severity: 'warning', user: user._id, email: user.email, details: 'Non-admin tried the admin login' });
      }
      if (locked) {
        await logSecurity({ req, type: 'ACCOUNT_LOCKED', severity: 'critical', user: user._id, email: user.email, details: `Locked for ${config.LOCK_MINUTES} min after ${config.MAX_FAILED_ATTEMPTS} failures` });
        return res.status(423).json({ message: `Too many failed attempts. Account locked for ${config.LOCK_MINUTES} minutes.`, lockedUntil: user.lockUntil });
      }
      return res.status(401).json(INVALID);
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = (req.ip || '').replace('::ffff:', '');
    await user.save();
    await logLogin({ ...base, user: user._id, success: true });
    if (adminOnly) await logSecurity({ req, type: 'ADMIN_LOGIN', user: user._id, email: user.email, details: 'Administrator signed in' });

    return req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = String(user._id);
      return req.session.save((err2) => {
        if (err2) return next(err2);
        return res.json({ message: 'Signed in.', user: user.toSafeJSON() });
      });
    });
  } catch (err) {
    return next(err);
  }
}

exports.login = (req, res, next) => performLogin(req, res, next, false);
exports.adminLogin = (req, res, next) => performLogin(req, res, next, true);

exports.logout = (req, res) => {
  const { userId } = req.session || {};
  req.session.destroy(() => {
    res.clearCookie('keyfort.sid');
    if (userId) logSecurity({ req, type: 'LOGOUT', user: userId, details: 'User signed out' });
    res.json({ message: 'Signed out.' });
  });
};

exports.me = (req, res) => res.json({ user: req.user.toSafeJSON() });

exports.forgotPassword = async (req, res, next) => {
  const generic = { message: 'If that email is registered, a reset link has been sent.' };
  try {
    const { email } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || !user.isActive) return res.json(generic);

    await PasswordReset.deleteMany({ user: user._id, usedAt: null });
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({
      user: user._id, tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + config.RESET_TOKEN_MINUTES * 60000),
      requestIp: (req.ip || '').replace('::ffff:', ''),
    });
    await logSecurity({ req, type: 'PASSWORD_RESET_REQUESTED', user: user._id, email: user.email, details: 'Reset link issued' });

    const base = config.PUBLIC_APP_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const link = `${base.replace(/\/$/, '')}/reset-password?token=${token}`;
    try {
      await sendResetEmail(user.email, link);
    } catch (mailErr) {
      console.error('[mail] could not send reset e-mail:', mailErr.message);
    }
    if (config.SHOW_DEV_RESET_LINK) return res.json({ ...generic, devResetLink: link, devNote: 'Development mode: e-mail is not configured, so the link is shown here.' });
    return res.json(generic);
  } catch (err) {
    return next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!isString(token) || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    const pErr = policyError(password);
    if (pErr) return res.status(400).json({ message: pErr, errors: { password: pErr } });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.', errors: { confirmPassword: 'Passwords do not match.' } });

    const record = await PasswordReset.findOne({ tokenHash: sha256(token), usedAt: null, expiresAt: { $gt: new Date() } });
    if (!record) {
      await logSecurity({ req, type: 'PASSWORD_RESET_FAILED', severity: 'warning', details: 'Invalid or expired reset token used' });
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }
    const user = await User.findById(record.user).select('+passwordHash');
    if (!user || !user.isActive) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });

    user.passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();
    user.passwordMeetsPolicy = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    record.usedAt = new Date();
    await record.save();
    await PasswordReset.deleteMany({ user: user._id, usedAt: null });
    await revokeUserSessions(user._id);
    await logSecurity({ req, type: 'PASSWORD_RESET_COMPLETED', user: user._id, email: user.email, details: 'Password reset via token; all sessions revoked' });
    return res.json({ message: 'Password updated. Please sign in with your new password.' });
  } catch (err) {
    return next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!isString(currentPassword) || !currentPassword) return res.status(400).json({ message: 'Enter your current password.', errors: { currentPassword: 'Required.' } });
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      await logSecurity({ req, type: 'PASSWORD_CHANGED', severity: 'warning', user: user._id, email: user.email, details: 'Change attempt failed: wrong current password' });
      return res.status(400).json({ message: 'Current password is incorrect.', errors: { currentPassword: 'Incorrect password.' } });
    }
    const pErr = policyError(newPassword);
    if (pErr) return res.status(400).json({ message: pErr, errors: { newPassword: pErr } });
    if (newPassword === currentPassword) return res.status(400).json({ message: 'New password must differ from the current one.', errors: { newPassword: 'Must differ from the current password.' } });
    if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.', errors: { confirmPassword: 'Passwords do not match.' } });

    user.passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();
    user.passwordMeetsPolicy = true;
    await user.save();
    const revoked = await revokeUserSessions(user._id, req.sessionID);
    await logSecurity({ req, type: 'PASSWORD_CHANGED', user: user._id, email: user.email, details: `Password changed; ${revoked} other session(s) signed out` });
    return res.json({ message: 'Password changed. Other devices were signed out.' });
  } catch (err) {
    return next(err);
  }
};
