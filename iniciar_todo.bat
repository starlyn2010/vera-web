@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      SISTEMA CLEAR PATH - INICIO AUTOMATICO
echo ====================================================
echo.

:: Verificacion rapida de entorno
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 'npm' o 'node' no detectados. Ejecuta SETUP_NUEVA_PC.bat primero.
    pause
    exit /b 1
)

:: 1. Verificacion de dependencias del Frontend
if not exist "client\node_modules\" (
    echo [ADVERTENCIA] No se detectaron dependencias en 'client'.
    echo Instalando dependencias...
    cd client && call npm install && cd ..
)

:: 2. Iniciar Backend (Python/FastAPI)
echo [1/3] Preparando Backend...
if exist "server_py\venv\Scripts\python.exe" (
    echo Iniciando Backend desde entorno virtual...
    start "Clear Path - Backend" cmd /k "cd server_py && venv\Scripts\python.exe main.py"
) else (
    echo [ADVERTENCIA] No se detecto venv o esta corrupto. 
    echo Intentando iniciar con Python global...
    start "Clear Path - Backend" cmd /k "cd server_py && (py -3 main.py || python main.py)"
)

:: 3. Iniciar Frontend (Vite)
echo [2/3] Iniciando Frontend en puerto 5173...
start "Clear Path - Frontend" cmd /k "cd client && call npm run dev"

:: 4. Espera y abrir navegador
echo [3/3] Esperando a que los servicios esten listos...
timeout /t 5 >nul

echo.
echo [LISTO] Abriendo Clear Path en el navegador...
start http://localhost:5173

echo.
echo ====================================================
echo   Los servidores estan corriendo en ventanas aparte.
echo   NO las cierres mientras uses la aplicacion.
echo ====================================================
pause
