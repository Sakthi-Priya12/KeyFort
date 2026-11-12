'use strict';
const { validatePassword, MAX_LENGTH } = require('../services/passwordValidator');
const { getDefinition } = require('../services/dfaEngine');
const { generatePassword } = require('../services/passwordGenerator');

// PUBLIC checker. The password lives only in this function's memory:
// it is not logged, not written to the database and not cached.
exports.check = (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string') return res.status(400).json({ message: 'password must be a text value.' });
  if (password.length > MAX_LENGTH * 4) return res.status(400).json({ message: 'Password is too long to analyse.' });
  res.set('Cache-Control', 'no-store');
  return res.json(validatePassword(password));
};

exports.suggest = (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ suggestions: [generatePassword(16), generatePassword(20), generatePassword(14)] });
};

exports.dfaDefinition = (req, res) => res.json(getDefinition());
