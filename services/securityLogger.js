'use strict';
const LoginLog = require('../models/LoginLog');
const SecurityLog = require('../models/SecurityLog');

function getClientIp(req) {
  return (req.ip || req.socket?.remoteAddress || '').replace('::ffff:', '');
}

const ua = (req) => String(req.headers['user-agent'] || '').slice(0, 300);

/** Records a login attempt. Never receives or stores passwords. */
async function logLogin({ req, user = null, email, success, reason = 'OK', isAdminLogin = false }) {
  try {
    await LoginLog.create({ user, email, success, reason, isAdminLogin, ip: getClientIp(req), userAgent: ua(req) });
  } catch (err) {
    console.error('[loginLog] failed:', err.message);
  }
}

/** Records a security event. */
async function logSecurity({ req, type, severity = 'info', user = null, email = '', details = '' }) {
  try {
    await SecurityLog.create({
      type, severity, user, email, details: String(details).slice(0, 300),
      ip: req ? getClientIp(req) : '', userAgent: req ? ua(req) : '',
    });
  } catch (err) {
    console.error('[securityLog] failed:', err.message);
  }
}

module.exports = { getClientIp, logLogin, logSecurity };
