# Plan de Auditoría y Mantenimiento: Plataforma Clear Path

Este documento resume la auditoría técnica del proyecto Clear Path y proporciona un plan de mantenimiento estructurado para la base de datos y los registros del sistema.

## Resultados de la Auditoría

### 1. Análisis de Seguridad
- **[IMPORTANTE] Secreto JWT en código**: En `server_py/config.py`, hay un valor por defecto para `JWT_SECRET`. Esto es un riesgo de seguridad. Si el archivo `.env` falta o está mal configurado, la aplicación usará una clave secreta conocida.
- **[NOTA] Codificación de la columna Password**: La base de datos usa `contraseña` como nombre de columna. Aunque se maneja en `auth_routes.py` con alternativas para problemas de codificación, se recomienda usar `password` o `contrasena` para asegurar la máxima compatibilidad entre diferentes controladores SQL y locales del SO.
- **[NOTA] Exposición de API Key**: El proyecto depende de `GROQ_API_KEY`. Asegúrese de que esto nunca se suba al control de versiones.

### 2. Rendimiento de la Base de Datos (SQLite)
- **[NOTA] Sin tareas de mantenimiento**: Actualmente, la aplicación inicializa el esquema pero no realiza mantenimiento de rutina. A medida que la base de datos crezca, el rendimiento podría degradarse sin comandos `VACUUM` o `ANALYZE`.
- **[NOTA] Modo WAL**: La base de datos ya usa `PRAGMA journal_mode = WAL`, lo cual es excelente para la concurrencia en SQLite.

### 3. Manejo de Errores y Logs
- **[CONSEJO] Registro Centralizado**: El backend registra correctamente en `logs/server_py.log`. Sin embargo, estos registros no se rotan y podrían crecer indefinidamente, consumiendo espacio en disco.
- **[CONSEJO] Manejo Global de Excepciones**: El backend FastAPI tiene un sólido manejador global de errores, lo cual es excelente para la estabilidad en producción.

---

## Cambios Propuestos

### [Componente] Configuración del Backend
#### [MODIFICAR] [config.py](file:///c:/Users/starl/OneDrive/Escritorio/jud/server_py/config.py)
Eliminar el valor secreto por defecto para forzar el uso de variables de entorno.

### [Componente] Mantenimiento de la Base de Datos
#### [NUEVO] [maintenance.py](file:///c:/Users/starl/OneDrive/Escritorio/jud/server_py/scripts/maintenance.py)
Un script para realizar mantenimiento rutinario de SQLite (Vacuum, Analyze, Integrity Check).

#### [NUEVO] [backup_db.bat](file:///c:/Users/starl/OneDrive/Escritorio/jud/database/backup_db.bat)
Un script por lotes simple para automatizar las copias de seguridad de la base de datos.

---

## Plan de Mantenimiento

### 1. Cronograma de Mantenimiento de la Base de Datos
| Frecuencia | Tarea | Descripción |
| :--- | :--- | :--- |
| **Diario** | **Respaldo** | Copiar `clearpath.db` a una carpeta `backups/` con una marca de tiempo. |
| **Semanal** | **Optimización** | Ejecutar `VACUUM` para recuperar espacio y `ANALYZE` para actualizar las estadísticas del planificador de consultas. |
| **Mensual** | **Verificación de Integridad** | Ejecutar `PRAGMA integrity_check` para asegurar que no exista corrupción de datos. |

### 2. Gestión de Logs
- **Rotación de Logs**: Implementar `RotatingFileHandler` en Python para limitar el tamaño del archivo de log y mantener solo los últimos N registros.
- **Limpieza**: Eliminar respaldos con más de 30 días de antigüedad para ahorrar espacio.

### 3. Actualizaciones de Seguridad
- **Rotación de Secretos**: Actualizar periódicamente el `JWT_SECRET` en el archivo `.env`.
- **Auditoría de Dependencias**: Ejecutar `npm audit` y `pip list --outdated` mensualmente para verificar dependencias vulnerables.

## Plan de Verificación

### Verificación Manual
- Ejecutar el nuevo script `maintenance.py` y verificar que se ejecute sin errores.
- Verificar que al eliminar `JWT_SECRET` del `.env` ahora se produzca un error de inicio claro (o se use un estado más seguro) en lugar de usar una cadena predefinida.
- Ejecutar el script de respaldo y comprobar si el archivo se copia correctamente al directorio de respaldos.
