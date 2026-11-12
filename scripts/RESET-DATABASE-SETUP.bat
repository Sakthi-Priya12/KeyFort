@echo off
REM Deletes backend\.env so START-KEYFORT.bat asks the database questions again.
cd /d "%~dp0..\backend"
if exist ".env" (
  del ".env"
  echo backend\.env deleted. Run START-KEYFORT.bat to choose Local MongoDB or Atlas again.
) else (
  echo No backend\.env found.
)
pause
