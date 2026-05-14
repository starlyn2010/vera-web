@echo off
setlocal enabledelayedexpansion

:: Configuración
set "DB_FILE=clearpath.db"
set "BACKUP_DIR=backups"
set "TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=!TIMESTAMP: =0!"

echo ============================================
echo   RESPALDO DE BASE DE DATOS - CLEAR PATH
echo ============================================

:: Crear carpeta de backups si no existe
if not exist "%BACKUP_DIR%" (
    echo Creando directorio de respaldos...
    mkdir "%BACKUP_DIR%"
)

:: Verificar si la DB existe
if not exist "%DB_FILE%" (
    echo Error: No se encuentra el archivo %DB_FILE%
    exit /b 1
)

:: Realizar copia
echo Realizando copia de seguridad...
copy "%DB_FILE%" "%BACKUP_DIR%\clearpath_backup_%TIMESTAMP%.db" > nul

if %errorlevel% equ 0 (
    echo [OK] Respaldo creado: %BACKUP_DIR%\clearpath_backup_%TIMESTAMP%.db
) else (
    echo [ERROR] No se pudo realizar el respaldo.
)

echo ============================================
pause
