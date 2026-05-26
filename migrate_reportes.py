import sqlite3

def migrate(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys=off;")
        conn.execute("""
            CREATE TABLE new_reportes (
                id_reporte INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT CHECK(tipo IN ('Analitica', 'Ventas', 'Ambiental', 'Personalizado')),
                periodo TEXT,
                fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                archivo_path TEXT
            );
        """)
        conn.execute("INSERT INTO new_reportes SELECT * FROM reportes;")
        conn.execute("DROP TABLE reportes;")
        conn.execute("ALTER TABLE new_reportes RENAME TO reportes;")
        conn.commit()
        print(f"Migrated {db_path}")
    except Exception as e:
        print(f"Failed to migrate {db_path}: {e}")
    finally:
        conn.execute("PRAGMA foreign_keys=on;")
        conn.close()

migrate('database/static_demo.db')
migrate('database/clearpath.db')
