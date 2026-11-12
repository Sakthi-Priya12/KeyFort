'use strict';
/**
 * CSRF defence for cookie sessions: every state-changing request must carry the custom header
 * "X-Requested-With: KeyFort". Browsers cannot add this header cross-site without a CORS
 * pre-flight, and CORS only allows the configured CLIENT_URL origins.
 */
module.exports = function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') === 'KeyFort') return next();
  return res.status(403).json({ message: 'Blocked: missing security header.' });
};
