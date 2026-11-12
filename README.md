# KeyFort

**Password Policy Validation and Secure Authentication System** using Full Stack Web Development (FSWD), Formal Languages and Automata Theory (FLAT) and Computer Networks (CN).

## 1. Introduction
KeyFort is an independent web application with a blue-and-white security-product interface. Anyone can check a password without an account. Registered users get a secure account area, and administrators get monitoring tools.

## 2. Objectives
1. Validate password strength with a **real DFA** and cross-check it with **regular expressions**.
2. Provide complete full-stack account security: registration, login, sessions, reset, lockout, roles.
3. Demonstrate client-server networking, HTTP, REST, TLS readiness and rate limiting.
4. Run on Windows with one double-click, and deploy online.

## 3. Main features
Public password checker (live strength, checklist, missing rules, suggestions, show/hide, clear, generated strong passwords, DFA trace) - registration - login - forgot/reset password - user dashboard, profile, change password, login history, security settings - admin login, dashboard with 7-day chart, user management (search, deactivate, unlock), security monitoring (events, login records, suspicious activity) - Network lab.

The 15 required screens and their URLs:

| # | Screen | URL |
|---|---|---|
| 1 | Home | `/` |
| 2 | Public Password Checker | `/password-checker` |
| 3 | User Registration | `/register` |
| 4 | Secure Login | `/login` |
| 5 | Forgot Password | `/forgot-password` |
| 6 | Reset Password | `/reset-password?token=...` |
| 7 | User Dashboard | `/dashboard` |
| 8 | My Profile | `/profile` |
| 9 | Change Password | `/change-password` |
| 10 | Login History | `/login-history` |
| 11 | Security Settings | `/security` |
| 12 | Admin Login | `/admin/login` |
| 13 | Admin Dashboard | `/admin` |
| 14 | User Management | `/admin/users` |
| 15 | Security Monitoring | `/admin/security` |
| + | Network lab (CN demo) | `/network` |

## 4. Technologies
React 18, React Router 6, Vite, HTML5, CSS3 - Node.js 18+, Express 4, REST - MongoDB, Mongoose 8 - bcryptjs (bcrypt algorithm, pure JavaScript so Windows needs no compiler), express-session + connect-mongo, helmet, cors, express-rate-limit, nodemailer (optional e-mail).

## 5. FSWD implementation
Registration: the browser validates, the server validates again, the password policy (DFA + Regex) is checked, bcrypt hashes the password, the record is saved in MongoDB and a 201 response is returned. Login: the server looks up the user, verifies the hash, creates a server-side session, sets an HttpOnly cookie and the React app redirects to the dashboard. Backend layout: `config`, `controllers`, `models`, `routes`, `middleware`, `services`. All data shown in the screens comes from the API and database; there is no hard-coded demo data.

## 6. FLAT implementation
- `backend/services/dfaEngine.js`: a genuine DFA `(Q, Σ, δ, q0, F)` with 145 states that reads one character at a time, tracks uppercase/lowercase/digit/special categories and the length (capped at the minimum 8), has an accepting state `q8:ULDS` and a dead state for invalid control characters.
- `backend/services/passwordValidator.js`: the same policy as regular expressions, plus the DFA-versus-Regex comparison, strength classification and suggestions.
- The checker shows the DFA final state, the character-by-character transition trace, both verdicts and the final ACCEPT/REJECT.
- Full explanation, state diagrams and test cases: [documentation/DFA.md](documentation/DFA.md). Tests: `backend/tests/dfa.test.js`.

## 7. CN implementation
Client-server architecture, HTTP request/response, REST, secure cookies, HTTPS/TLS configuration for production, DNS/domain readiness, per-IP login monitoring and rate limiting, plus the live **Network lab** page. KeyFort does not implement TCP/IP itself: the operating system does, and Node.js uses it through sockets. Details and diagrams: [documentation/NETWORK-AND-SECURITY.md](documentation/NETWORK-AND-SECURITY.md).

## 8. System architecture
```mermaid
flowchart LR
    U["User in Chrome"] --> F["React app (built into frontend/dist)"]
    F -- "REST/JSON over HTTP(S)" --> A["Express API (backend)"]
    A --> S["services: DFA, Regex validator, logger"]
    A --> DB[("MongoDB keyfortDB")]
```
In local mode the Express server also serves the built website, so one process on one port runs everything. Database diagram: [documentation/DATABASE.md](documentation/DATABASE.md). API reference: [documentation/API.md](documentation/API.md).

## 9. Folder structure
```
KeyFort/
  START-KEYFORT.bat      double-click to run
  STOP-KEYFORT.bat       double-click to stop
  README.md  render.yaml  .gitignore
  backend/
    server.js  app.js  package.json  .env.example
    config/ (env.js, db.js)
    controllers/ (auth, password, user, admin)
    middleware/ (auth, csrfGuard, rateLimiters, errorHandler)
    models/ (User, LoginLog, SecurityLog, PasswordReset)
    routes/index.js
    services/ (dfaEngine, passwordValidator, passwordGenerator, commonPasswords, securityLogger, sessionService, mailer)
    utils/validators.js
    scripts/ (setup, check-db, create-admin, wait-ready, stop, print-port, smoke-api, prompt)
    tests/dfa.test.js
  frontend/
    index.html  vite.config.js  package.json  vercel.json  .env.example
    src/ (main, App, api, AuthContext, styles.css, components/, pages/, hooks/)
  documentation/ (DFA, API, DATABASE, TESTING, DEPLOYMENT, NETWORK-AND-SECURITY, screenshots/)
  scripts/ (CREATE-DESKTOP-SHORTCUT.bat, REBUILD-FRONTEND.bat, RESET-DATABASE-SETUP.bat)
```

## 10. Software you need (Windows 10/11)
1. **Node.js 18 or newer (LTS)**: https://nodejs.org (default options).
2. **Google Chrome** (any browser works, Chrome opens automatically if installed).
3. **A database**, either: MongoDB Community Server installed locally, **or** a free MongoDB Atlas account (no installation).
4. Internet access for the first run only (to download packages).
5. Optional: Visual Studio Code, to read or edit the code.

## 11. MongoDB configuration
The database name is always `keyfortDB`. Collections are created automatically.

**Option A: local MongoDB**
1. Install MongoDB Community Server from https://www.mongodb.com/try/download/community and keep "Install as a Service" ticked.
2. Make sure the service runs: open *Command Prompt as Administrator* and run `net start MongoDB` (or Services > MongoDB Server > Start).
3. Connection string (the default): `mongodb://127.0.0.1:27017/keyfortDB`

**Option B: MongoDB Atlas**
1. Create a free account and an M0 cluster at https://www.mongodb.com/cloud/atlas.
2. Database Access: create a user with a password. Network Access: add your IP address.
3. Connect > Drivers > copy the string, add `/keyfortDB` before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/keyfortDB?retryWrites=true&w=majority`

On the first start, `START-KEYFORT.bat` asks which option you want and writes `backend\.env` for you. To choose again, run `scripts\RESET-DATABASE-SETUP.bat`. You can also copy `backend\.env.example` to `backend\.env` and edit it by hand.

## 12. Backend setup (manual, for developers)
```
cd backend
npm install
node scripts/setup.js          (creates .env)
node scripts/check-db.js       (tests the database connection)
node scripts/create-admin.js   (creates the first administrator)
npm start                      (http://localhost:5000, serves frontend/dist if it exists)
```
Use `npm run dev` for auto-restart while editing.

## 13. Frontend setup (manual, for developers)
```
cd frontend
npm install
npm run build     (creates frontend/dist, served by the backend)
npm run dev       (hot reload at http://localhost:5173, proxies /api to port 5000)
```

## 14. One-click Windows startup (no VS Code needed)
1. Unzip the project anywhere, for example `C:\KeyFort`.
2. Double-click **START-KEYFORT.bat**. It will:
   1. check Node.js (and open the download page if it is missing),
   2. install backend and frontend packages on the first run,
   3. build the website on the first run,
   4. ask once for local MongoDB or Atlas and create `backend\.env` with a random session secret,
   5. test the database and explain exactly what to fix if it fails,
   6. ask once for the **first administrator** (name, email, hidden password),
   7. start the server minimised, wait until `/api/health` answers, and open Chrome at `http://localhost:5000`.
3. Stop with **STOP-KEYFORT.bat**. It asks only this project's server to shut down (clean close of the HTTP server and the database), using the process id and a one-time token stored in `backend\.keyfort-run.json`. It never kills other programs.
4. Desktop shortcut: double-click `scripts\CREATE-DESKTOP-SHORTCUT.bat`, or right-click START-KEYFORT.bat > Send to > Desktop (create shortcut).

The launcher uses plain Command Prompt, so the PowerShell execution-policy restriction does not apply. If `npm` is blocked in PowerShell, always use the .bat files or run commands in *Command Prompt*.
Server messages are written to `logs\backend.log`. After changing frontend code, run `scripts\REBUILD-FRONTEND.bat`.

## 15. Online deployment
See [documentation/DEPLOYMENT.md](documentation/DEPLOYMENT.md): MongoDB Atlas, hosting (single service recommended, split hosting explained), environment variables, HTTPS, custom domain, DNS and a production test checklist. A public URL exists only after you deploy. Typing "KeyFort" into Google will not find the site by itself; that needs your own domain, DNS and search indexing.

## 16. Testing
```
cd backend && npm test                      unit tests: DFA, Regex, consistency (no database needed)
node scripts/smoke-api.js              end-to-end API test (server and MongoDB must be running)
```
Full scenario list and manual checklist: [documentation/TESTING.md](documentation/TESTING.md).

## 17. Troubleshooting
| Problem | Fix |
|---|---|
| "Node.js is not installed" | install the LTS from https://nodejs.org, then run START-KEYFORT.bat again |
| `ECONNREFUSED 127.0.0.1:27017` | local MongoDB is not running: `net start MongoDB` as Administrator, or choose Atlas |
| Atlas: `bad auth` / `whitelist` / `ENOTFOUND` | check username and password (URL-encode special characters), add your IP under Network Access, check internet |
| "Port 5000 is already in use" | edit `PORT` in `backend\.env` (also add the new port to `CLIENT_URL`) |
| Package installation fails | check internet or a proxy, delete the `node_modules` folder and run again |
| Chrome does not open | open `http://localhost:5000` yourself (the launcher falls back to the default browser) |
| White page or old design | run `scripts\REBUILD-FRONTEND.bat`, then refresh with Ctrl+F5 |
| Locked out after 5 wrong passwords | wait 15 minutes, or sign in as admin and use Unlock in User management |
| Forgot the admin password | on a computer with access to the database run `node scripts/create-admin.js` with the same email to set a new password |
| Reset e-mail does not arrive | in development mode (no SMTP) the link appears on the forgot-password page; in production configure SMTP |
| Server stopped unexpectedly | read `logs\backend.log` |

## Security notes
No default admin exists. No secrets are in this archive: `backend\.env` is created on your computer. Passwords are stored only as bcrypt hashes and the public checker never stores or logs what you type.
