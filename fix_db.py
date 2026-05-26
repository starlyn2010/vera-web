import sqlite3
import bcrypt

hash_val = bcrypt.hashpw(b'123456', bcrypt.gensalt()).decode('utf-8')

for db_path in ['database/static_demo.db', 'database/clearpath.db']:
    try:
        conn = sqlite3.connect(db_path)
        # Update user
        conn.execute('UPDATE registro SET contraseña=?, rol=?, correo_electronico=? WHERE nombre_usuario=?', (hash_val, 'admin', 'starlyn23@clearpath.com', 'starlyn23'))
        
        # Add columns to pedidos
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(pedidos)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "metodo_envio" not in columns:
            conn.execute("ALTER TABLE pedidos ADD COLUMN metodo_envio TEXT")
        if "precio_envio" not in columns:
            conn.execute("ALTER TABLE pedidos ADD COLUMN precio_envio REAL DEFAULT 0")
        if "direccion_envio" not in columns:
            conn.execute("ALTER TABLE pedidos ADD COLUMN direccion_envio TEXT")
            
        conn.commit()
        conn.close()
        print(f"Fixed {db_path}")
    except Exception as e:
        print(f"Error in {db_path}: {e}")
