@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      CLEAR PATH - CREACION DE INSTALABLE (EXE)
echo ====================================================
echo Este proceso creara un unico archivo .exe que funciona
echo en cualquier PC sin necesidad de Node.js o Python.
echo.
echo NOTA: Solo necesitas Node y Python en ESTA PC para
echo generar el archivo. La PC de destino NO necesitara nada.
echo.

:: 1. Verificaciones basicas
echo [1/5] Verificando herramientas...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no detectado. Instala Node.js para poder compilar.
    pause
    exit /b 1
)

set PY_CMD=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python no detectado. Instala Python para poder compilar.
        pause
        exit /b 1
    ) else (
        set PY_CMD=py -3
    )
)

:: 2. Preparar Base de Datos y Compilar Backend
echo [2/5] Preparando Base de Datos y Backend...
cd server_py
if not exist "venv" (
    echo Creando entorno virtual temporal...
    %PY_CMD% -m venv venv
)
echo Instalando dependencias necesarias...
call venv\Scripts\python.exe -m pip install --upgrade pip
call venv\Scripts\python.exe -m pip install pyinstaller bcrypt -r requirements.txt

echo Asegurando usuario administrador (starlyn23)...
cd ..
call server_py\venv\Scripts\python.exe seed_user.py
cd server_py

echo Ejecutando PyInstaller...
call venv\Scripts\python.exe -m PyInstaller clearpath_server.spec --noconfirm
if %errorlevel% neq 0 (
    echo [ERROR] La compilacion del backend fallo.
    cd ..
    pause
    exit /b 1
)
cd ..

:: 3. Construir Frontend (React)
echo [3/5] Construyendo Frontend...
cd client
if not exist "node_modules" call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] La construccion del frontend fallo.
    cd ..
    pause
    exit /b 1
)
cd ..

:: 4. Empaquetar todo con Electron
echo [4/5] Creando instalador final (Electron + Backend)...
if not exist "node_modules" call npm install
:: Asegurarnos de que electron-builder este instalado
if not exist "node_modules\.bin\electron-builder" (
    call npm install electron-builder --save-dev
)

call npm run electron:build
if %errorlevel% neq 0 (
    echo [ERROR] El empaquetado final fallo.
    pause
    exit /b 1
)

:: 5. Resultado
echo.
echo ====================================================
echo   PROCESO COMPLETADO CON EXITO
echo ====================================================
echo El instalador final esta en:
echo --^> %~dp0dist_electron\
echo.
echo ARCHIVO A PASAR: "ClearPath_Setup_1.0.4.exe"
echo.
echo NOTA IMPORTANTE: 
echo Si el programa no abre en la otra PC, asegúrate de que
echo tenga instalado el "Microsoft Visual C++ Redistributable".
echo (Puedes descargarlo de la web de Microsoft).
echo.
echo No copies carpetas sueltas, ejecuta siempre el INSTALADOR (.exe)
echo en la PC de destino.
echo.
pause
