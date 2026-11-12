# Testing KeyFort

## 1. Automated unit tests (no database required)

```
cd backend
npm install
npm test
```
Covers: character classification, transition function, DFA accept/reject lists, regex accept/reject lists, 20,000 random DFA/Regex consistency checks, strength labels, password generator, DFA definition.

## 2. Automated API test (needs MongoDB and the running server)

1. Start the app with `START-KEYFORT.bat` (or `cd backend && npm start`).
2. In another terminal: `cd backend && node scripts/smoke-api.js`

It creates throw-away accounts `kf-test-*@example.com` and checks: health + database connection, public checker (weak/strong, DFA/Regex consistency), registration (weak password rejected, valid, duplicate email), session protection, login (wrong and correct password), user route protection, admin route protection (403 for a normal user), logout, five failed logins causing a lock (HTTP 423), password reset with a single-use token (development mode), security headers and the CSRF guard.

## 3. Manual checklist

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Valid registration | /register with a strong password | success, redirect to sign in |
| 2 | Duplicate email | register the same email again | "already registered" |
| 3 | Weak password rejected | register with `password1` | field error listing the missing rules |
| 4 | Strong accepted | `Zx9#kLm2$QwPt` in the checker | Strong, ACCEPT |
| 5 | DFA accept/reject | try the cases in DFA.md | table matches |
| 6 | DFA/Regex consistency | any input | "Agree" badge |
| 7 | Login | valid credentials | dashboard |
| 8 | Wrong password | wrong password | "Invalid email or password." |
| 9 | Lockout | 5 wrong passwords | locked message; correct password refused for 15 minutes; admin can unlock |
| 10 | Session protection | open /dashboard signed out | redirect to /login |
| 11 | Admin protection | open /admin as a normal user | redirected to /dashboard; API returns 403 |
| 12 | Password reset | Forgot password, open the link, set a new password | works once; old link fails |
| 13 | Persistence | stop with STOP-KEYFORT.bat, start again | accounts and history remain |
| 14 | Windows launcher | double-click START-KEYFORT.bat | Chrome opens the site |
| 15 | Production config | set NODE_ENV=production without SESSION_SECRET | server refuses to start |
