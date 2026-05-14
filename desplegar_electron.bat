@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      DESPLIEGUE CLEAR PATH - MODO ESCRITORIO
echo ====================================================
echo.

:: 1. Verificacion de dependencias
echo [1/4] Verificando dependencias...
if not exist "node_modules\" npm install
if not exist "client\node_modules\" (
    cd client && npm install && cd ..
)

:: 2. Construir Frontend
echo [2/4] Construyendo Frontend (Vite)...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] La construccion del frontend fallo.
    pause
    exit /b %errorlevel%
)
cd ..

:: 3. Iniciar Backend en segundo plano
echo [3/4] Iniciando Backend (Python)...
if exist "server_py\venv\Scripts\python.exe" (
    start /min "Clear Path - Backend" cmd /c "cd server_py && venv\Scripts\python.exe main.py"
) else (
    start /min "Clear Path - Backend" cmd /c "cd server_py && python main.py || py -3 main.py"
)

:: Esperar a que el backend suba
echo Esperando al servidor...
timeout /t 3 >nul

:: 4. Iniciar Electron
echo [4/4] Lanzando aplicacion de escritorio...
set SKIP_SERVER=true

:: Verificar si electron esta instalado
if not exist "node_modules\electron\dist\electron.exe" (
    echo [ADVERTENCIA] Binarios de Electron no encontrados. Intentando reparar...
    call npm install electron@28.0.0 --save-dev
)

call npx electron .
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo iniciar Electron. Asegurate de que 'npm install' se completo correctamente.
    pause
)

echo.
echo ====================================================
echo   Proceso finalizado.
echo ====================================================
pause
