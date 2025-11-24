@echo off
echo ========================================
echo    INICIANDO SERGAS MANAGEMENT
echo ========================================
echo.

echo [1/2] Iniciando Backend...
start cmd /k "cd /d %~dp0backend && node src/server.js"

timeout /t 3 /nobreak > nul

echo [2/2] Iniciando Frontend...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo    SERGAS INICIADO CORRECTAMENTE
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
pause