'use strict';
const { EMAIL_RE } = require('../models/User');

const isString = (v) => typeof v === 'string';
const normalizeEmail = (v) => String(v || '').trim().toLowerCase();
const isEmail = (v) => isString(v) && v.length <= 254 && EMAIL_RE.test(v.trim());
const isName = (v) => isString(v) && v.trim().length >= 2 && v.trim().length <= 60;
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toInt = (v, d, min, max) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return d;
  return Math.min(max, Math.max(min, n));
};

module.exports = { isString, normalizeEmail, isEmail, isName, escapeRegex, toInt };
