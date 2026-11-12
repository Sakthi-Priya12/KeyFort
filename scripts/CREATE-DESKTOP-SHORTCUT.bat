@echo off
REM Creates a "KeyFort" shortcut on your Desktop that starts the app.
setlocal
set "TARGET=%~dp0..\START-KEYFORT.bat"
for %%I in ("%TARGET%") do set "TARGET=%%~fI"
for %%I in ("%TARGET%") do set "WORKDIR=%%~dpI"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\KeyFort.lnk'); $s.TargetPath='%TARGET%'; $s.WorkingDirectory='%WORKDIR%'; $s.IconLocation='shell32.dll,48'; $s.Save()"
if errorlevel 1 (
  echo Could not create the shortcut. Right-click START-KEYFORT.bat ^> Send to ^> Desktop ^(create shortcut^) instead.
) else (
  echo Done. A KeyFort shortcut is now on your Desktop.
)
pause
