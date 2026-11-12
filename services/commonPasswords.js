'use strict';
// Small built-in list of very common passwords. Compared in lower case after removing
// trailing digits/symbols so "Password1!" is still recognised.
const COMMON = new Set([
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'admin', 'administrator', 'welcome', 'login',
  'letmein', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm', 'iloveyou',
  'monkey', 'dragon', 'master', 'sunshine', 'princess', 'football', 'baseball', 'superman',
  'batman', 'shadow', 'trustno', 'abc', 'abcd', 'abcdef', 'abc123', 'changeme', 'secret',
  'hello', 'freedom', 'whatever', 'qazwsx', 'starwars', 'cricket', 'chennai', 'india',
  'keyfort', 'test', 'testing', 'user', 'default', 'guest', 'root', 'summer', 'winter',
  'google', 'internet', 'computer', 'michael', 'jordan', 'ashley', 'jessica', 'charlie',
]);

const SEQUENCES = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function stripped(pw) {
  return pw.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
}

function isCommon(pw) {
  const lower = pw.toLowerCase();
  return COMMON.has(lower) || COMMON.has(stripped(pw)) || COMMON.has(lower.replace(/[0-9!@#$%^&*]+$/, ''));
}

function hasSequence(pw, run = 4) {
  const lower = pw.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i + run <= seq.length; i += 1) {
      const part = seq.slice(i, i + run);
      if (lower.includes(part) || lower.includes([...part].reverse().join(''))) return true;
    }
  }
  return false;
}

function hasRepeats(pw, run = 3) {
  return new RegExp(`(.)\\1{${run - 1},}`, 'su').test(pw);
}

module.exports = { isCommon, hasSequence, hasRepeats };
