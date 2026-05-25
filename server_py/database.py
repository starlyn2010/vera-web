"""
Clear Path API — Database module (SQLite via stdlib sqlite3)
Uses synchronous sqlite3 with run_in_executor for async compatibility.
No external dependencies required.
"""

import os
import sqlite3
import asyncio
from functools import partial
import shutil

DB_PATH: str = os.getenv("DB_PATH", "../database/clearpath.db")

# When running as a PyInstaller bundle, __file__ points to a temp dir (_MEIPASS).
# Use sys.executable's directory instead so relative paths resolve correctly.
import sys
if getattr(sys, 'frozen', False):
    # Running as compiled exe — _base is the bundled temporary directory
    _base = sys._MEIPASS
    _exe_dir = os.path.dirname(sys.executable)
    appdata = os.getenv('APPDATA')

    def _find_bundled_db_path() -> str | None:
        """
        Locate a bundled/prepopulated DB shipped with the app.

        Expected layouts:
        - Electron (extraResources):
          <resources>/server_py/dist/clearpath_server.exe  (sys.executable)
          <resources>/database/static_demo.db
        - Repo/local run:
          <repo>/server_py/dist/clearpath_server.exe
          <repo>/database/static_demo.db
        """
        candidates: list[str] = []
        for up in (0, 1, 2, 3):
            root = _exe_dir
            for _ in range(up):
                root = os.path.dirname(root)
            db_dir = os.path.join(root, "database")
            candidates.append(os.path.join(db_dir, "static_demo.db"))
            candidates.append(os.path.join(db_dir, "clearpath.db"))

        for p in candidates:
            if os.path.exists(p):
                return os.path.normpath(p)
        return None

    def _ensure_seeded_db(target_db_path: str) -> None:
        """
        Ensure `target_db_path` is a usable DB with seeded demo data.

        If the DB already exists but looks empty/uninitialized, it will be backed up
        and replaced with the bundled demo DB.
        """
        if os.path.exists(target_db_path):
            try:
                conn = sqlite3.connect(target_db_path)
                cur = conn.cursor()
                cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='inventario'")
                has_inv = cur.fetchone() is not None
                inv_count = 0
                if has_inv:
                    cur.execute("SELECT COUNT(*) FROM inventario")
                    inv_count = int(cur.fetchone()[0])
                conn.close()
                if has_inv and inv_count > 0:
                    return
            except Exception:
                # If we cannot validate the existing DB, don't overwrite it.
                return

            # Existing DB but empty/unseeded: back it up then replace.
            try:
                backup_path = target_db_path + ".bak_empty"
                if not os.path.exists(backup_path):
                    shutil.copy2(target_db_path, backup_path)
            except Exception:
                pass

        bundled = _find_bundled_db_path()
        if not bundled:
            return
        os.makedirs(os.path.dirname(target_db_path), exist_ok=True)
        shutil.copy2(bundled, target_db_path)

    if appdata:
        _db_dir = os.path.join(appdata, "ClearPath", "database")
        _resolved_db = os.path.join(_db_dir, "clearpath.db")
        try:
            _ensure_seeded_db(_resolved_db)
        except Exception:
            _resolved_db = os.path.normpath(os.path.join(_exe_dir, DB_PATH))
    else:
        _resolved_db = os.path.normpath(os.path.join(_exe_dir, DB_PATH))
else:
    _base = os.path.dirname(os.path.abspath(__file__))
    _resolved_db = os.path.normpath(os.path.join(_base, DB_PATH))

# On Vercel, prefer static_demo.db if it exists
if os.getenv("VERCEL"):
    _static_db = os.path.normpath(os.path.join(_base, "..", "database", "static_demo.db"))
    if os.path.exists(_static_db):
        _resolved_db = _static_db
    else:
        _resolved_db = os.path.normpath(os.path.join(_base, DB_PATH))


def get_db_path() -> str:
    return _resolved_db


def _get_sync_connection() -> sqlite3.Connection:
    # On Vercel, use read-only mode if the file exists
    if os.getenv("VERCEL"):
        db_uri = f"file:{_resolved_db}?mode=ro"
        conn = sqlite3.connect(db_uri, uri=True)
    else:
        conn = sqlite3.connect(_resolved_db)
    
    conn.row_factory = sqlite3.Row
    
    # On Vercel, WAL mode might fail on a read-only filesystem
    if not os.getenv("VERCEL"):
        try:
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA synchronous = NORMAL")
        except:
            pass
    return conn


def init_schema_sync() -> None:
    """Run schema init synchronously at startup."""
    # Skip migrations on Vercel as it's a read-only filesystem
    if os.getenv("VERCEL"):
        print("Vercel detected: Skipping database schema initialization (read-only).")
        return

    if getattr(sys, 'frozen', False):
        schema_path = os.path.normpath(os.path.join(_base, "schema_sqlite.sql"))
    else:
        schema_path = os.path.normpath(os.path.join(_base, "..", "database", "schema_sqlite.sql"))
    if not os.path.exists(schema_path):
        print(f"Schema file not found at {schema_path}")
        return

    conn = _get_sync_connection()
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = f.read()
    conn.executescript(schema)

    cols = {row[1] for row in conn.execute("PRAGMA table_info(pedidos)").fetchall()}
    if "id_usuario" not in cols:
        conn.execute("ALTER TABLE pedidos ADD COLUMN id_usuario INTEGER")
        print("Database migration applied: pedidos.id_usuario.")
    if "metodo_envio" not in cols:
        conn.execute("ALTER TABLE pedidos ADD COLUMN metodo_envio TEXT")
        print("Database migration applied: pedidos.metodo_envio.")
    if "precio_envio" not in cols:
        conn.execute("ALTER TABLE pedidos ADD COLUMN precio_envio REAL DEFAULT 0")
        print("Database migration applied: pedidos.precio_envio.")
    if "direccion_envio" not in cols:
        conn.execute("ALTER TABLE pedidos ADD COLUMN direccion_envio TEXT")
        print("Database migration applied: pedidos.direccion_envio.")

    cols_inv = {row[1] for row in conn.execute("PRAGMA table_info(inventario)").fetchall()}
    if "imagen_url" not in cols_inv:
        conn.execute("ALTER TABLE inventario ADD COLUMN imagen_url TEXT")
        print("Database migration applied: inventario.imagen_url.")

    conn.commit()
    conn.close()
    print(f"Database schema initialized: {_resolved_db}")


def _query_sync(sql: str, params: tuple | list = ()):
    """Synchronous query — runs in thread pool for async."""
    conn = _get_sync_connection()
    try:
        cursor = conn.cursor()
        if sql.strip().upper().startswith("SELECT") or sql.strip().upper().startswith("PRAGMA"):
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        else:
            cursor.execute(sql, params)
            conn.commit()
            return {"insertId": cursor.lastrowid, "affectedRows": cursor.rowcount}
    finally:
        conn.close()


async def query(sql: str, params: tuple | list = ()):
    """Async wrapper around sync SQLite queries."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_query_sync, sql, params))


class TransactionContext:
    """Manual transaction context for multi-statement operations."""

    def __init__(self):
        self.conn: sqlite3.Connection | None = None

    def begin(self):
        self.conn = _get_sync_connection()
        self.conn.execute("BEGIN TRANSACTION")

    def execute(self, sql: str, params: tuple | list = ()):
        assert self.conn is not None
        cursor = self.conn.execute(sql, params)
        return {"insertId": cursor.lastrowid, "affectedRows": cursor.rowcount}

    def fetchall(self, sql: str, params: tuple | list = ()):
        assert self.conn is not None
        cursor = self.conn.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]

    def commit(self):
        if self.conn:
            self.conn.commit()

    def rollback(self):
        if self.conn:
            try:
                self.conn.rollback()
            except Exception:
                pass

    def close(self):
        if self.conn:
            try:
                self.conn.close()
            except Exception:
                pass
            self.conn = None
