@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      SISTEMA CLEAR PATH - INICIO AUTOMATICO
echo ====================================================
echo.

:: 1. Verificacion de dependencias del Frontend
if not exist "client\node_modules\" (
    echo [ADVERTENCIA] No se detectaron dependencias en 'client'.
    echo Instalando dependencias...
    cd client && npm install && cd ..
)

:: 2. Iniciar Backend (Python/FastAPI)
echo [1/3] Preparando Backend...
if exist "server_py\venv\Scripts\python.exe" (
    echo Instalando/Verificando dependencias de Python...
    cd server_py && venv\Scripts\python.exe -m pip install -r requirements.txt && cd ..
    start "Clear Path - Backend" cmd /k "cd server_py && venv\Scripts\python.exe main.py"
) else (
    echo [ADVERTENCIA] No se detecto venv. Intentando instalar dependencias globalmente...
    py -3 -m pip install -r server_py\requirements.txt || python -m pip install -r server_py\requirements.txt
    start "Clear Path - Backend" cmd /k "cd server_py && py -3 main.py || python main.py"
)

:: 3. Iniciar Frontend (Vite)
echo [2/3] Iniciando Frontend en puerto 5173...
start "Clear Path - Frontend" cmd /k "cd client && npm run dev"

:: 4. Espera y abrir navegador
echo [3/3] Esperando a que los servicios esten listos...
ping 127.0.0.1 -n 9 >nul

echo.
echo [LISTO] Abriendo Clear Path en el navegador...
start http://localhost:5173

echo.
echo ====================================================
echo   Los servidores estan corriendo en ventanas aparte.
echo   NO las cierres mientras uses la aplicacion.
echo ====================================================
pause
