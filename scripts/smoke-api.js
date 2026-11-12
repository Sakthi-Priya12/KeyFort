'use strict';
/**
 * End-to-end API test against a RUNNING server (START-KEYFORT.bat first).
 * Creates throw-away users (kf-test-*@example.com), exercises the main scenarios and prints PASS/FAIL.
 * Usage: node scripts/smoke-api.js [baseUrl]
 */
const base = process.argv[2] || `http://127.0.0.1:${require('../config/env').PORT}`;
let pass = 0; let fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS  ${name}`); } else { fail += 1; console.log(`FAIL  ${name} ${extra}`); } };

function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'KeyFort', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    let data = null; try { data = await res.json(); } catch (e) { /* none */ }
    return { status: res.status, data, headers: res.headers };
  };
}

(async () => {
  const stamp = Date.now();
  const email = `kf-test-${stamp}@example.com`;
  const strong = 'Zx9#kLm2$QwPt';
  const a = client();

  let r = await a('GET', '/api/health'); ok('health + database connected', r.status === 200 && r.data.database === 'connected');
  r = await a('POST', '/api/password/check', { password: 'abc' }); ok('public checker: weak password rejected (DFA)', r.status === 200 && r.data.dfa.verdict === 'REJECT');
  r = await a('POST', '/api/password/check', { password: strong }); ok('public checker: strong accepted, DFA/Regex consistent', r.data.dfa.verdict === 'ACCEPT' && r.data.comparison.consistent && r.data.strength.label === 'Strong');
  r = await a('POST', '/api/auth/register', { name: 'Test User', email, password: 'weakpass', confirmPassword: 'weakpass' }); ok('registration: weak password rejected', r.status === 400);
  r = await a('POST', '/api/auth/register', { name: 'Test User', email, password: strong, confirmPassword: strong }); ok('registration: valid', r.status === 201);
  r = await a('POST', '/api/auth/register', { name: 'Test User', email, password: strong, confirmPassword: strong }); ok('registration: duplicate email rejected', r.status === 409);
  r = await a('GET', '/api/user/dashboard'); ok('session protection: dashboard blocked when signed out', r.status === 401);
  r = await a('POST', '/api/auth/login', { email, password: 'Wrong#Pass1' }); ok('login: wrong password rejected', r.status === 401);
  r = await a('POST', '/api/auth/login', { email, password: strong }); ok('login: success', r.status === 200);
  r = await a('GET', '/api/user/dashboard'); ok('dashboard available after login', r.status === 200 && r.data.user.email === email);
  r = await a('GET', '/api/admin/stats'); ok('admin route protection: normal user gets 403', r.status === 403);
  r = await a('POST', '/api/auth/logout'); ok('logout', r.status === 200);
  r = await a('GET', '/api/user/dashboard'); ok('session destroyed after logout', r.status === 401);

  const b = client();
  let last;
  for (let i = 0; i < 5; i += 1) last = await b('POST', '/api/auth/login', { email, password: `Wrong#Pass${i}x` });
  ok('repeated failures lock the account (HTTP 423)', last.status === 423);
  r = await b('POST', '/api/auth/login', { email, password: strong }); ok('locked account refuses the correct password', r.status === 423);

  const c = client();
  const mail = `kf-reset-${stamp}@example.com`;
  await c('POST', '/api/auth/register', { name: 'Reset User', email: mail, password: strong, confirmPassword: strong });
  r = await c('POST', '/api/auth/forgot-password', { email: mail });
  const link = r.data && r.data.devResetLink;
  if (link) {
    const token = new URL(link).searchParams.get('token');
    const newPw = 'Nw7!qRt5#Lp2Z';
    r = await c('POST', '/api/auth/reset-password', { token, password: newPw, confirmPassword: newPw }); ok('password reset with token', r.status === 200);
    r = await c('POST', '/api/auth/reset-password', { token, password: newPw, confirmPassword: newPw }); ok('reset token is single-use', r.status === 400);
    r = await c('POST', '/api/auth/login', { email: mail, password: newPw }); ok('login with new password', r.status === 200);
  } else console.log('SKIP  password reset (server is in production/SMTP mode, no dev link returned)');

  r = await a('GET', '/api/health'); ok('security headers present', Boolean(r.headers.get('content-security-policy')) && r.headers.get('x-content-type-options') === 'nosniff');
  r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); ok('CSRF guard blocks requests without the custom header', r.status === 403);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('Test run failed:', e.message); process.exit(1); });
