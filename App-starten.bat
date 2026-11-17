@echo off
title Lernspiel
echo Lernspiel startet ... (dieses Fenster offen lassen, solange du lernst)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8093/"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if %errorlevel%==0 (
  echo Dieses Fenster kannst du jetzt schliessen.
) else (
  echo.
  echo Der Server ist mit einem Fehler abgebrochen ^(siehe oben^).
)
pause
