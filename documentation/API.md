# KeyFort REST API

Base path `/api`. JSON in and out. Every non-GET request needs the header `X-Requested-With: KeyFort` (CSRF guard). Authentication uses the HttpOnly session cookie `keyfort.sid`.
Errors: `{ "message": "...", "errors": { "field": "..." } }`.

## Public

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /health | | status, uptime, database state |
| GET | /network/info | | request, connection and server details (Network lab) |
| POST | /password/check | `{password}` | DFA + Regex analysis, strength, suggestions. Not stored or logged. 120 requests/minute |
| GET | /password/suggest | | 3 generated strong passwords |
| GET | /password/dfa | | formal DFA definition |

## Authentication

| Method | Path | Body | Result |
|---|---|---|---|
| POST | /auth/register | `{name,email,password,confirmPassword}` | 201, 400 policy/validation, 409 duplicate email |
| POST | /auth/login | `{email,password}` | 200, 401 wrong credentials, 403 deactivated, 423 locked |
| POST | /auth/admin-login | `{email,password}` | same, administrators only |
| POST | /auth/logout | | destroys the session |
| GET | /auth/me | | current user (401 if signed out) |
| POST | /auth/forgot-password | `{email}` | always the same message; creates a 30-minute single-use token |
| POST | /auth/reset-password | `{token,password,confirmPassword}` | 200, 400 invalid/expired token |
| POST | /auth/change-password | `{currentPassword,newPassword,confirmPassword}` | signs out other devices |

## Signed-in user

| Method | Path | Notes |
|---|---|---|
| GET | /user/dashboard | account info, security status, recent logins |
| GET / PUT | /user/profile | `{name,email,currentPassword?}` (password needed when the email changes) |
| GET | /user/login-history?page&status | paginated |
| GET | /user/security | security summary and recent events |
| POST | /user/security/revoke-sessions | signs out other devices |

## Admin (role = admin, otherwise 403 and a logged security event)

| Method | Path | Notes |
|---|---|---|
| GET | /admin/stats | totals, locked accounts, 7-day chart data, recent events |
| GET | /admin/users?search&status&role&page | status: active, inactive, locked |
| PATCH | /admin/users/:id/active | `{isActive:boolean}`; cannot deactivate yourself |
| POST | /admin/users/:id/unlock | clears the lock |
| GET | /admin/login-logs?search&status&page | |
| GET | /admin/security-logs?severity&type&reviewed&page | |
| PATCH | /admin/security-logs/:id/review | marks reviewed |
| GET | /admin/suspicious | IPs with 5+ and accounts with 3+ failures in the last hour |

## Rate limits

| Scope | Limit |
|---|---|
| All /api | 600 per 15 minutes per IP |
| login, admin-login, register, change-password | 25 per 15 minutes |
| forgot/reset password | 8 per hour |
| password checker | 120 per minute |

Exceeding a limit returns HTTP 429 and writes a `RATE_LIMIT_HIT` security event.
