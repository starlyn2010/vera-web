"""
Clear Path API — FastAPI Entry Point
Mirrors server/index.js (Express)
Run: uvicorn main:app --reload --port 5000
"""

import os
import sys
from datetime import datetime, timezone
import logging

from dotenv import load_dotenv

# Load env BEFORE any imports that read env vars
# When frozen (PyInstaller), look for .env in the bundled temp dir (_MEIPASS)
if getattr(sys, 'frozen', False):
    _env_dir = sys._MEIPASS
else:
    _env_dir = os.path.dirname(__file__)
load_dotenv(os.path.join(_env_dir, ".env"))

# Configure logging
is_vercel = os.getenv("VERCEL")
logger = logging.getLogger()
logger.setLevel(logging.INFO)

log_formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s')
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(log_formatter)
logger.addHandler(stream_handler)

if not is_vercel:
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    if not os.path.exists(logs_dir):
        try:
            os.makedirs(logs_dir)
        except:
            logs_dir = os.path.dirname(__file__)

    log_file = os.path.join(logs_dir, "server_py.log")
    from logging.handlers import RotatingFileHandler
    # Max 5MB per file, keep 3 backups
    file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
    file_handler.setFormatter(log_formatter)
    logger.addHandler(file_handler)
    logging.info(f"Backend starting... (Logs: {log_file})")
else:
    logging.info("Backend starting on Vercel (Stdout only)")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── DB init (sync at startup) ────────────────────────────────────────────────
from database import init_schema_sync

init_schema_sync()

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Clear Path API", version="2.0.0")

# ── CORS ─────────────────────────────────────────────────────────────────────
# The desktop app (Electron) loads UI from `file://`, which produces a non-standard Origin
# in Chromium (often `null`). Starlette's CORS validation can reject such origins.
# The API uses bearer tokens (Authorization header), so we can safely allow any origin
# without credentials to keep Electron + localhost working reliably.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    path = request.url.path
    logging.info(f"Incoming: {request.method} {path}")
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logging.error(f"FATAL ERROR on {path}: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": str(e)})

# La ruta /api/health se define más adelante con más detalles

# ── Import and register routers ──────────────────────────────────────────────
_router_errors = []

def _safe_import_router(module_path, name, prefix=None):
    """Import and register a router, logging any errors instead of crashing."""
    try:
        import importlib
        mod = importlib.import_module(module_path)
        r = getattr(mod, 'router')
        if prefix:
            app.include_router(r, prefix=prefix)
        else:
            app.include_router(r)
        logging.info(f"Router '{name}' registered successfully.")
    except Exception as e:
        _router_errors.append(f"{name}: {e}")
        logging.error(f"FAILED to import router '{name}' from '{module_path}': {e}", exc_info=True)

_safe_import_router('routes.auth_routes', 'auth')
_safe_import_router('routes.inventory_routes', 'inventory')
_safe_import_router('routes.order_routes', 'orders')
_safe_import_router('routes.project_routes', 'projects')
_safe_import_router('routes.analytics_routes', 'analytics')
_safe_import_router('routes.chatbot_routes', 'chatbot')
_safe_import_router('routes.report_routes', 'reports')
_safe_import_router('routes.verify_routes', 'verify')


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "service": "Clear Path API (Python/FastAPI)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "groq": bool(os.getenv("GROQ_API_KEY")),
        "router_errors": _router_errors if _router_errors else None,
        "routes_count": len(app.routes),
    }


@app.get("/api/debug/routes")
async def debug_routes():
    """Lists all registered routes for debugging."""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({"path": route.path, "methods": list(route.methods)})
    return {"routes": routes, "errors": _router_errors}


@app.get("/api/verify-test/{doc_id}")
async def verify_test(doc_id: str, request: Request):
    """Direct test endpoint to verify path handling on Vercel."""
    return {
        "received_doc_id": doc_id,
        "request_path": str(request.url.path),
        "request_url": str(request.url),
        "scope_path": request.scope.get("path", "N/A"),
        "scope_root_path": request.scope.get("root_path", "N/A"),
    }


@app.get("/")
async def root():
    return {"message": "Clear Path API is running ✅ (Python/FastAPI)"}


# ── 404 Handler ──────────────────────────────────────────────────────────────

@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": f"Ruta no encontrada: {request.method} {request.url.path}"},
    )


# ── Global Error Handler ────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    print(f"Unhandled Error: {exc}", file=sys.stderr)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc) if os.getenv("NODE_ENV") != "production" else "Error interno del servidor."},
    )


# ── Start ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 5000))
    print(f"\nClear Path API corriendo en http://localhost:{port}")
    print(f"Jud (Groq): {'Activo' if os.getenv('GROQ_API_KEY') else 'Sin API Key'}")
    print(f"Backend: Python/FastAPI\n")
    
    if getattr(sys, 'frozen', False):
        uvicorn.run(app, host="0.0.0.0", port=port)
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
