import sqlite3
import bcrypt

hash_val = bcrypt.hashpw(b'123456', bcrypt.gensalt()).decode('utf-8')

for db_path in ['database/static_demo.db', 'database/clearpath.db']:
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("INSERT OR IGNORE INTO registro (nombre_usuario, correo_electronico, contraseña, rol) VALUES ('starlyn23', 'starlyn23@clearpath.com', ?, 'admin')", (hash_val,))
        conn.commit()
        conn.close()
        print(f"User added to {db_path}")
    except Exception as e:
        print(f"Error in {db_path}: {e}")
