'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { runDfa, transition, classify, INITIAL_STATE, DEAD, getDefinition } = require('../services/dfaEngine');
const { validatePassword, validateWithRegex } = require('../services/passwordValidator');
const { generatePassword } = require('../services/passwordGenerator');

const VALID = ['Abcdef1!', 'KeyFort@2026', 'Zx9#kLm2$Qw', 'Hello World 9!', 'Ünï€ode9Aa', 'aA1!aA1!aA1!'];
const INVALID = [
  ['', 'empty'], ['Ab1!', 'too short'], ['abcdefg1!', 'no uppercase'], ['ABCDEFG1!', 'no lowercase'],
  ['Abcdefgh!', 'no digit'], ['Abcdefg12', 'no special'], ['Abc1!\u0000xyz', 'control char'],
  ['Abcdef1!\n', 'newline'],
];

test('classification of characters', () => {
  assert.equal(classify('A'), 'U'); assert.equal(classify('z'), 'L');
  assert.equal(classify('7'), 'D'); assert.equal(classify('#'), 'S');
  assert.equal(classify(' '), 'S'); assert.equal(classify('\t'), 'X');
});

test('transition function', () => {
  assert.equal(transition(INITIAL_STATE, 'U'), 'q1:U---');
  assert.equal(transition('q1:U---', 'L'), 'q2:UL--');
  assert.equal(transition('q8:ULDS', 'U'), 'q8:ULDS');
  assert.equal(transition('q3:UL--', 'X'), DEAD);
  assert.equal(transition(DEAD, 'U'), DEAD);
});

test('DFA accepts valid passwords', () => {
  for (const pw of VALID) {
    const r = runDfa(pw);
    assert.equal(r.accepted, true, pw);
    assert.equal(r.finalState, 'q8:ULDS');
  }
});

test('DFA rejects invalid passwords', () => {
  for (const [pw, why] of INVALID) assert.equal(runDfa(pw).accepted, false, why);
});

test('Regex accepts valid and rejects invalid passwords', () => {
  for (const pw of VALID) assert.equal(validateWithRegex(pw).accepted, true, pw);
  for (const [pw, why] of INVALID) assert.equal(validateWithRegex(pw).accepted, false, why);
});

test('DFA and Regex agree on 20000 random strings', () => {
  const pool = 'ABCxyz0189!@# _-é€\t\n';
  const chars = [...pool];
  for (let n = 0; n < 20000; n += 1) {
    const len = Math.floor(Math.random() * 14);
    let s = '';
    for (let i = 0; i < len; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
    assert.equal(runDfa(s).accepted, validateWithRegex(s).accepted, JSON.stringify(s));
  }
});

test('full validation result and strength classes', () => {
  assert.equal(validatePassword('abc').strength.label, 'Weak');
  assert.equal(validatePassword('Password1!').strength.label, 'Weak'); // common password
  assert.equal(validatePassword('Kf7!mQzp').strength.label, 'Medium');
  assert.equal(validatePassword('Zx9#kLm2$QwPt').strength.label, 'Strong');
  const r = validatePassword('abcdefg');
  assert.equal(r.accepted, false);
  assert.ok(r.missing.length >= 3);
  assert.equal(r.comparison.consistent, true);
  assert.equal(validatePassword('A1!a'.repeat(40)).accepted, false); // over 128 chars
});

test('generated passwords satisfy the policy', () => {
  for (let i = 0; i < 50; i += 1) {
    const pw = generatePassword(16);
    const r = validatePassword(pw);
    assert.ok(r.accepted && r.strength.label === 'Strong', pw);
  }
});

test('DFA definition is exposed', () => {
  const d = getDefinition();
  assert.equal(d.stateCount, 145);
  assert.equal(d.initialState, 'q0:----');
});
