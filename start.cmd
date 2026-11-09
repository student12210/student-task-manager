@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Встановіть Node.js 22 або новіший з https://nodejs.org/
  pause
  exit /b 1
)
echo Відкрийте у браузері http://127.0.0.1:3000
node src/server.js
pause
