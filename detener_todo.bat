@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      DETENIENDO PROCESOS DE CLEAR PATH
echo ====================================================
echo.

:: Puertos a limpiar
set "PORTS=5000 5173"

for %%p in (%PORTS%) do (
    echo Buscando procesos en puerto %%p...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
        echo Deteniendo PID: %%a en puerto %%p...
        taskkill /F /PID %%a >nul 2>&1
    )
)

:: Forzar cierre de procesos comunes por nombre si quedan huerfanos
echo.
echo Limpiando procesos residuales...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1

echo.
echo [EXITO] Todos los procesos han sido detenidos.
echo.
pause
