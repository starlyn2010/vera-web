import os
import sqlite3
import time
from datetime import datetime, timedelta

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "database", "clearpath.db"))
BACKUP_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "database", "backups"))

def run_maintenance():
    print(f"--- Iniciando Mantenimiento de Base de Datos ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')}) ---")
    
    if not os.path.exists(DB_PATH):
        print(f"Error: No se encontró la base de datos en {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. Optimización (VACUUM) - Recupera espacio en disco
        print("[1/3] Ejecutando VACUUM (Optimizando espacio)...")
        conn.execute("VACUUM")
        
        # 2. Análisis de Consultas (ANALYZE) - Ayuda al planificador de SQLite
        print("[2/3] Ejecutando ANALYZE (Optimizando planificador de consultas)...")
        conn.execute("ANALYZE")
        
        # 3. Verificación de Integridad
        print("[3/3] Verificando integridad de los datos...")
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()[0]
        
        if result == "ok":
            print("✅ Integridad confirmada: La base de datos está saludable.")
        else:
            print(f"⚠️ ¡ADVERTENCIA! Errores de integridad encontrados: {result}")

        conn.close()
        print("--- Mantenimiento completado exitosamente ---\n")

    except Exception as e:
        print(f"❌ Error durante el mantenimiento: {e}")

def cleanup_old_backups(days=30):
    print(f"--- Limpieza de respaldos antiguos (Mayores a {days} días) ---")
    if not os.path.exists(BACKUP_DIR):
        print("No se encontró directorio de respaldos. Saltando limpieza.")
        return

    now = time.time()
    cutoff = now - (days * 86400)
    count = 0

    for filename in os.listdir(BACKUP_DIR):
        filepath = os.path.join(BACKUP_DIR, filename)
        if os.path.isfile(filepath):
            if os.path.getmtime(filepath) < cutoff:
                try:
                    os.remove(filepath)
                    print(f"Eliminado: {filename}")
                    count += 1
                except Exception as e:
                    print(f"No se pudo eliminar {filename}: {e}")

    print(f"Limpieza finalizada. Archivos eliminados: {count}\n")

if __name__ == "__main__":
    run_maintenance()
    cleanup_old_backups(30)
