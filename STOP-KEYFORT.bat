@echo off
setlocal EnableExtensions
title Stop KeyFort
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found, so KeyFort cannot be stopped from here.
  pause
  exit /b 1
)
if not exist "backend\.keyfort-run.json" (
  echo KeyFort is not running.
  timeout /t 3 >nul
  exit /b 0
)
echo Stopping KeyFort...
node backend\scripts\stop.js
timeout /t 3 >nul
exit /b 0
