@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      PREPARACION DE CLEAR PATH - PC NUEVA
echo ====================================================
echo.

:: 1. Verificar Node.js
echo [1/5] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. 
    echo Por favor instala Node.js desde https://nodejs.org/ (Version LTS)
    pause
    exit /b 1
)
echo [OK] Node.js detectado.

:: 2. Verificar Python
echo [2/5] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python no esta instalado. 
        echo Por favor instala Python 3.10 o superior desde https://www.python.org/
        echo Asegurate de marcar la casilla "Add Python to PATH" durante la instalacion.
        pause
        exit /b 1
    )
)
echo [OK] Python detectado.

:: 3. Limpiar entornos rotos (Copiados de otra PC)
echo [3/5] Limpiando entornos previos...
if exist "server_py\venv" (
    echo Eliminando venv corrupto (contiene rutas de la otra PC)...
    rmdir /s /q "server_py\venv"
)
if exist "client\node_modules" (
    echo Nota: Se recomienda borrar 'node_modules' si hay errores de compilacion.
)

:: 4. Reconstruir entorno Python
echo [4/5] Reconstruyendo entorno de Python (Backend)...
cd server_py
python -m venv venv || py -3 -m venv venv
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo crear el entorno virtual de Python.
    cd ..
    pause
    exit /b 1
)
echo Instalando dependencias del backend...
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..

:: 5. Instalar dependencias Frontend
echo [5/5] Instalando dependencias del Frontend...
cd client
call npm install
cd ..

echo.
echo ====================================================
echo   CONFIGURACION COMPLETADA EXITOSAMENTE
echo ====================================================
echo Ahora puedes usar 'iniciar_todo.bat' para la web
echo o 'desplegar_electron.bat' para la version de escritorio.
echo.
pause
