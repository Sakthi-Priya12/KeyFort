@echo off
setlocal EnableExtensions
title KeyFort Launcher
cd /d "%~dp0"
set "ROOT=%~dp0"

echo.
echo  ============================================
echo    KeyFort - Password Security System
echo  ============================================
echo.

REM ---- 1. Node.js -------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 goto :nonode
node -e "process.exit(Number(process.versions.node.split('.')[0])>=18?0:1)"
if errorlevel 1 goto :oldnode
for /f "tokens=*" %%v in ('node -v') do set "NODEV=%%v"
echo [OK] Node.js %NODEV% found.

REM ---- stop an older session first (avoids "port in use") ---------------
if exist "backend\.keyfort-run.json" (
  echo [..] An earlier KeyFort session was found. Restarting it...
  node backend\scripts\stop.js
)

REM ---- 2. Dependencies --------------------------------------------------
if not exist "backend\node_modules\express\package.json" (
  echo [..] Installing backend packages. First run only, internet needed...
  pushd backend
  call npm install --no-audit --no-fund
  if errorlevel 1 ( popd & goto :npmfail )
  popd
)
echo [OK] Backend packages ready.

if not exist "frontend\node_modules\vite\package.json" (
  echo [..] Installing frontend packages. First run only, internet needed...
  pushd frontend
  call npm install --no-audit --no-fund
  if errorlevel 1 ( popd & goto :npmfail )
  popd
)
if not exist "frontend\dist\index.html" (
  echo [..] Building the website. This takes about a minute...
  pushd frontend
  call npm run build
  if errorlevel 1 ( popd & goto :buildfail )
  popd
)
echo [OK] Website files ready.

REM ---- 3. Database configuration ---------------------------------------
if not exist "backend\.env" (
  echo.
  echo [..] First-time setup: choose your database.
  pushd backend
  node scripts\setup.js
  popd
  if not exist "backend\.env" goto :nosetup
)
pushd backend
node scripts\check-db.js
set "DBERR=%errorlevel%"
popd
if not "%DBERR%"=="0" goto :dbfail
echo [OK] Database connection works.

REM ---- first administrator (only asked once) ----------------------------
pushd backend
node scripts\create-admin.js --if-none
popd

REM ---- 4. Start the server ----------------------------------------------
if not exist "logs" mkdir logs
for /f %%p in ('node backend\scripts\print-port.js') do set "PORT=%%p"
echo [..] Starting KeyFort on port %PORT%...
start "KeyFort Server - close with STOP-KEYFORT.bat" /min cmd /c "cd /d "%ROOT%backend" && node server.js >> "%ROOT%logs\backend.log" 2>&1"

REM ---- 5. Wait until ready ----------------------------------------------
node backend\scripts\wait-ready.js
if errorlevel 1 goto :notready
echo [OK] KeyFort is ready.

REM ---- 6. Open Chrome ----------------------------------------------------
set "URL=http://localhost:%PORT%"
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if defined CHROME (
  start "" "%CHROME%" "%URL%"
) else (
  echo [!] Google Chrome was not found. Opening your default browser instead.
  start "" "%URL%"
)
echo.
echo  KeyFort is running at %URL%
echo  Admin sign-in: %URL%/admin/login
echo  To stop it, double-click STOP-KEYFORT.bat
echo.
timeout /t 8 >nul
exit /b 0

REM ======================= error messages ================================
:nonode
echo [X] Node.js is not installed.
echo     1. Download the LTS version from https://nodejs.org
echo     2. Install it with the default options.
echo     3. Run START-KEYFORT.bat again.
start "" "https://nodejs.org/en/download"
goto :fail
:oldnode
echo [X] Your Node.js is too old. KeyFort needs version 18 or newer.
echo     Install the current LTS from https://nodejs.org and try again.
goto :fail
:npmfail
echo [X] Package installation failed. Check your internet connection and run this file again.
goto :fail
:buildfail
echo [X] The website build failed. Read the messages above.
goto :fail
:nosetup
echo [X] Setup was not completed, so backend\.env was not created. Run this file again.
goto :fail
:dbfail
echo.
echo [X] Fix the database problem described above, then run START-KEYFORT.bat again.
goto :fail
:notready
echo [X] The server did not start. Last lines of logs\backend.log:
echo ---------------------------------------------
type "logs\backend.log"
echo ---------------------------------------------
node backend\scripts\stop.js >nul 2>nul
goto :fail
:fail
echo.
pause
exit /b 1
