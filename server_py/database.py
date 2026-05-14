"""
Clear Path API — Database module (SQLite via stdlib sqlite3)
Uses synchronous sqlite3 with run_in_executor for async compatibility.
No external dependencies required.
"""

import os
import sqlite3
import asyncio
from functools import partial

DB_PATH: str = os.getenv("DB_PATH", "../database/clearpath.db")

_base = os.path.dirname(os.path.abspath(__file__))

# On Vercel, prefer static_demo.db if it exists
if os.getenv("VERCEL"):
    _static_db = os.path.normpath(os.path.join(_base, "..", "database", "static_demo.db"))
    if os.path.exists(_static_db):
        _resolved_db = _static_db
    else:
        _resolved_db = os.path.normpath(os.path.join(_base, DB_PATH))
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
