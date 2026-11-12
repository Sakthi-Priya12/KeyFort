# Online deployment guide

You need three things for a public site: a **hosted database** (MongoDB Atlas), a **host** that runs Node.js, and (optionally) a **domain name**. Nothing here buys or reserves a domain for you, and domain availability is not assumed.

## Recommended: one service serves everything (simplest and most secure)

The Express server already serves the built React site and the API from the same address, so cookies stay first-party and no CORS setup is needed. Works on Render, Railway, Fly.io, a VPS, etc.

### Step 1: MongoDB Atlas
1. Create a free account at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. Database Access: add a database user (username + strong password).
3. Network Access: for a hosted backend, allow `0.0.0.0/0` (Atlas then relies on your user/password) or add your host's static IPs if it has them.
4. Connect > Drivers: copy the string and add the database name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/keyfortDB?retryWrites=true&w=majority`
   (URL-encode special characters in the password, for example `@` becomes `%40`.)

### Step 2: Push the project to GitHub
Create a private repository and push the KeyFort folder. `.gitignore` already excludes `node_modules`, `.env` and logs.

### Step 3: Create the web service (Render example)
1. Render > New > Web Service (or Blueprint, using `render.yaml`), connect the repository.
2. Build command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
3. Start command: `cd backend && node server.js`
4. Environment variables:

| Name | Value |
|---|---|
| NODE_ENV | production |
| MONGODB_URI | your Atlas string |
| MONGODB_DB_NAME | keyfortDB |
| SESSION_SECRET | 64+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| CLIENT_URL | your final public URL, e.g. `https://keyfort.onrender.com` or your own domain |
| PUBLIC_APP_URL | the same URL (used in reset e-mails) |
| TRUST_PROXY | 1 (the host terminates HTTPS and forwards requests) |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM | your e-mail provider, needed so password-reset e-mails are delivered |

In production the server refuses to start without a strong `SESSION_SECRET`, cookies are `Secure`, HSTS is enabled and the reset link is **never** shown in API responses (it is e-mailed).

### Step 4: Create the first administrator (once)
No default admin exists. On your own computer: put the **Atlas** string in `backend/.env`, then run `cd backend && node scripts/create-admin.js` and answer the prompts (password hidden). Or, from a host shell, set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` for that single command, run `npm run create-admin`, then delete the variables.

### Step 5: HTTPS
Render, Railway, Fly.io, Vercel and Netlify issue free TLS certificates automatically (Let's Encrypt). Open the `https://` URL and check the padlock. On your own VPS, put Nginx or Caddy in front (Caddy gets certificates automatically) and set `TRUST_PROXY=1`. To terminate TLS inside Node instead, set `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH`.

## Custom domain and DNS

1. Buy a domain from a registrar of your choice (you do this yourself).
2. In your host's dashboard, add the custom domain; it shows the DNS records to create.
3. At your registrar's DNS page add exactly those records, typically:
   - `www` as a **CNAME** pointing to the host name it gives you (for example `keyfort.onrender.com`)
   - the root/apex domain as **A/ALIAS/ANAME** records as instructed
4. Wait for propagation (minutes to 48 hours). Check with `nslookup www.yourdomain.com`.
5. The host then issues the HTTPS certificate. Update `CLIENT_URL` and `PUBLIC_APP_URL` to the new domain and redeploy.

## Alternative: split hosting (frontend and backend on different hosts)

Possible, but cookies make it harder. Prefer subdomains of one domain (for example `app.example.com` and `api.example.com`) because they are the same *site*, so `SameSite=lax` cookies work.
- Frontend (Vercel/Netlify): root `frontend`, build `npm run build`, output `dist`, env `VITE_API_URL=https://api.example.com`. `frontend/vercel.json` already contains the SPA rewrite (Netlify: add `/* /index.html 200` in `_redirects`).
- Backend: as above with `CLIENT_URL=https://app.example.com`, `COOKIE_SAMESITE=lax`, `TRUST_PROXY=1`.
- On completely different domains (for example `*.vercel.app` + `*.onrender.com`) you must use `COOKIE_SAMESITE=none` with HTTPS, and browsers that block third-party cookies will break sign-in. Avoid this setup.

## Production test checklist
1. `https://YOUR-URL/api/health` returns `{"status":"ok","database":"connected"}`.
2. The padlock shows; `http://` redirects to `https://` (host setting).
3. Register, sign in, sign out; the cookie `keyfort.sid` shows HttpOnly and Secure in the browser dev tools.
4. Admin sign in at `/admin/login`; a normal user cannot open `/admin`.
5. Five wrong passwords lock an account.
6. Forgot password delivers an e-mail (SMTP configured), and the link works once.
7. `cd backend && node scripts/smoke-api.js https://YOUR-URL` (production skips only the dev-link reset test).
8. Network lab page shows "HTTPS" under Encrypted.

## "Will typing KeyFort into Google open my site?"
No. Browsers open sites by address (a domain name resolved through DNS). A search engine only lists a site after it has crawled and indexed it, which can take days or weeks and is never guaranteed, and other sites named "KeyFort" may rank higher. Share your URL directly, add the site in Google Search Console and submit a sitemap if you want it indexed.
