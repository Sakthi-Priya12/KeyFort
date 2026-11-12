@echo off
REM Rebuilds the website after you change files in the frontend folder.
cd /d "%~dp0..\frontend"
call npm install --no-audit --no-fund
call npm run build
pause
