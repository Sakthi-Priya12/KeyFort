'use strict';
/**
 * Password policy validation using BOTH:
 *   1. Regular expressions (this file)
 *   2. The DFA (services/dfaEngine.js)
 * and a comparison of the two results.
 * Passwords are processed in memory only. Nothing here logs or stores them.
 */
const { MIN_LENGTH, runDfa } = require('./dfaEngine');
const { isCommon, hasSequence, hasRepeats } = require('./commonPasswords');

const MAX_LENGTH = 128;

const REGEX = Object.freeze({
  minLength: /^.{8,}$/su,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[^A-Za-z0-9]/u,
  noControl: /^(?!.*[\x00-\x1F\x7F]).*$/su,
  // Single combined policy expression (lookaheads)
  full: /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?!.*[\x00-\x1F\x7F]).{8,}$/su,
});

const RULE_LABELS = Object.freeze({
  minLength: `At least ${MIN_LENGTH} characters`,
  uppercase: 'At least one uppercase letter (A-Z)',
  lowercase: 'At least one lowercase letter (a-z)',
  digit: 'At least one number (0-9)',
  special: 'At least one special character (e.g. ! @ # $ %)',
});

function validateWithRegex(password) {
  const rules = {
    minLength: REGEX.minLength.test(password),
    uppercase: REGEX.uppercase.test(password),
    lowercase: REGEX.lowercase.test(password),
    digit: REGEX.digit.test(password),
    special: REGEX.special.test(password),
  };
  const validCharacters = REGEX.noControl.test(password);
  const accepted = REGEX.full.test(password);
  return { accepted, rules, validCharacters };
}

function assessStrength(password, accepted, rules) {
  const length = [...password].length;
  const unique = new Set(password).size;
  const common = isCommon(password);
  const sequence = hasSequence(password);
  const repeats = hasRepeats(password);
  const passed = Object.values(rules).filter(Boolean).length;

  let score = passed * 12 + Math.min(length, 20) * 2 + Math.min(unique, 12);
  if (common) score = Math.min(score, 15);
  if (sequence) score -= 10;
  if (repeats) score -= 10;
  score = Math.max(0, Math.min(100, score));

  let label = 'Weak';
  if (accepted && !common) {
    label = length >= 12 && unique >= 8 && !sequence && !repeats ? 'Strong' : 'Medium';
  }
  if (label === 'Medium' && score > 79) score = 79;
  if (label === 'Strong' && score < 80) score = 80;
  if (label === 'Weak' && score > 49) score = 49;
  return { label, score, common, sequence, repeats, length, uniqueCharacters: unique };
}

function buildSuggestions(rules, validCharacters, strength, tooLong) {
  const out = [];
  if (!rules.minLength) out.push(`Use at least ${MIN_LENGTH} characters. Longer is better; aim for 12 or more.`);
  if (!rules.uppercase) out.push('Add an uppercase letter (A-Z).');
  if (!rules.lowercase) out.push('Add a lowercase letter (a-z).');
  if (!rules.digit) out.push('Add a number (0-9).');
  if (!rules.special) out.push('Add a special character such as ! @ # $ % & *.');
  if (!validCharacters) out.push('Remove control characters (tabs, line breaks).');
  if (tooLong) out.push(`Keep the password at ${MAX_LENGTH} characters or fewer.`);
  if (strength.common) out.push('This is a very common password. Pick something unique.');
  if (strength.sequence) out.push('Avoid sequences such as 1234 or abcd or qwerty.');
  if (strength.repeats) out.push('Avoid repeating the same character 3 or more times.');
  if (!out.length && strength.label !== 'Strong') out.push('Use 12 or more characters with a mix of different symbols to reach Strong.');
  if (!out.length) out.push('Great password. Use a unique one for every account.');
  return out;
}

/** Full analysis: DFA + Regex + comparison + strength. */
function validatePassword(password) {
  if (typeof password !== 'string') throw new TypeError('password must be a string');
  const tooLong = [...password].length > MAX_LENGTH;
  const regex = validateWithRegex(password);
  const dfa = runDfa(password);
  const consistent = regex.accepted === dfa.accepted;
  const accepted = !tooLong && regex.accepted && dfa.accepted;
  const strength = assessStrength(password, accepted, regex.rules);
  const missing = Object.keys(regex.rules).filter((k) => !regex.rules[k]).map((k) => RULE_LABELS[k]);
  if (!regex.validCharacters) missing.push('Only printable characters are allowed');
  if (tooLong) missing.push(`At most ${MAX_LENGTH} characters`);
  return {
    accepted,
    verdict: accepted ? 'ACCEPT' : 'REJECT',
    rules: regex.rules,
    ruleLabels: RULE_LABELS,
    missing,
    regex: { accepted: regex.accepted, validCharacters: regex.validCharacters },
    dfa,
    comparison: {
      consistent,
      dfaVerdict: dfa.verdict,
      regexVerdict: regex.accepted ? 'ACCEPT' : 'REJECT',
      message: consistent ? 'DFA and Regex agree.' : 'DFA and Regex disagree (this should never happen).',
    },
    strength,
    suggestions: buildSuggestions(regex.rules, regex.validCharacters, strength, tooLong),
  };
}

module.exports = { MAX_LENGTH, REGEX, RULE_LABELS, validateWithRegex, validatePassword };
