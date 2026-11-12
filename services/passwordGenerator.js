'use strict';
const crypto = require('crypto');
const { validatePassword } = require('./passwordValidator');

const SETS = {
  U: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  L: 'abcdefghijkmnpqrstuvwxyz',
  D: '23456789',
  S: '!@#$%^&*-_=+?',
};
const ALL = Object.values(SETS).join('');
const pick = (s) => s[crypto.randomInt(s.length)];

function generatePassword(length = 16) {
  const len = Math.max(12, Math.min(64, Number(length) || 16));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const chars = [pick(SETS.U), pick(SETS.L), pick(SETS.D), pick(SETS.S)];
    while (chars.length < len) chars.push(pick(ALL));
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const candidate = chars.join('');
    const r = validatePassword(candidate);
    if (r.accepted && r.strength.label === 'Strong') return candidate;
  }
  throw new Error('Could not generate a strong password');
}

module.exports = { generatePassword };
