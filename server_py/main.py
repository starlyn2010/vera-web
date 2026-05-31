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
    # Create logs directory
    if getattr(sys, 'frozen', False):
        # Use APPDATA for logs when running as EXE
        appdata = os.getenv('APPDATA')
        if appdata:
            logs_dir = os.path.join(appdata, "ClearPath", "logs")
        else:
            logs_dir = os.path.join(os.path.dirname(sys.executable), "logs")
    else:
        # Development logs
        logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")

    if not os.path.exists(logs_dir):
        try:
            os.makedirs(logs_dir)
        except:
            # Fallback to current directory if all fails
            logs_dir = "."

    log_file = os.path.join(logs_dir, "server_py.log")
    from logging.handlers import RotatingFileHandler
    # Max 5MB per file, keep 3 backups
    try:
        file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
        file_handler.setFormatter(log_formatter)
        logger.addHandler(file_handler)
        logging.info(f"Backend starting... (Logs: {log_file})")
    except Exception as e:
        logging.error(f"Could not create log file: {e}")
else:
    logging.info("Backend starting on Vercel (Stdout only)")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from services.verification_tokens import decode_verification_token

# ── DB init (sync at startup) ────────────────────────────────────────────────
from database import init_schema_sync, get_db_path

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
# verify endpoint is defined directly on app (below) for Vercel compatibility


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
        "db_path": get_db_path(),
        "db_exists": os.path.exists(get_db_path()),
        "base_dir_contents": os.listdir(os.path.dirname(os.path.dirname(__file__))) if not getattr(sys, 'frozen', False) else [],
    }


@app.get("/api/debug/routes")
async def debug_routes():
    """Lists all registered routes for debugging."""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({"path": route.path, "methods": list(route.methods)})
    return {"routes": routes, "errors": _router_errors}


@app.get("/api/verify/token/{token}")
async def verify_document_token(token: str):
    """
    Public verification endpoint using a signed token embedded in the QR URL.
    This avoids relying on external persistence (Supabase) for "always verifiable" links.
    """
    from fastapi import HTTPException
    import logging

    try:
        logging.info(f"Decoding verification token (Len: {len(token)})")
        data = decode_verification_token(token)
        logging.info(f"Token decoded for ID: {data.get('id')}")
        return {
            "id": data.get("id"), 
            "tipo": data.get("tipo"), 
            "payload": data.get("payload"),
            "source": "cryptographic_token"
        }
    except Exception as e:
        logging.error(f"Verification token FAILED: {str(e)}")
        # If the secret is different, it will fail here. 
        # On Vercel, ensure JWT_SECRET is set to match the local environment.
        raise HTTPException(status_code=404, detail="Token de verificación inválido o expirado.")


@app.get("/api/verify/{report_id}")
async def verify_document_direct(report_id: str):
    """
    Public verification endpoint — defined directly on app for Vercel compatibility.
    Queries Supabase to retrieve the verification payload.
    Checks for different ID formats (exact, order-*, report-*) to resolve collisions.
    """
    import json
    import urllib.request
    import urllib.error
    import urllib.parse
    from fastapi import HTTPException
    import logging

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        logging.error("Supabase keys missing in environment")
        raise HTTPException(status_code=500, detail="El servicio de verificación no está configurado.")

    supabase_url = supabase_url.rstrip("/")
    # Try multiple formats to find the record
    search_ids = [report_id]
    if not report_id.startswith("order-") and not report_id.startswith("report-"):
        search_ids.append(f"order-{report_id}")
        search_ids.append(f"report-{report_id}")
    
    # Construct OR query for PostgREST
    or_parts = [f"id.eq.{sid}" for sid in search_ids]
    or_query = f"or=({','.join(or_parts)})"
    
    encoded_query = urllib.parse.quote(or_query, safe='=(),.-')
    full_url = f"{supabase_url}/rest/v1/verificaciones?select=*&{encoded_query}"

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Accept": "application/json"
    }

    try:
        logging.info(f"Querying Supabase for doc: {report_id}")
        req = urllib.request.Request(full_url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if data and len(data) > 0:
                    return {**data[0], "source": "database"}
                else:
                    logging.info(f"Document {report_id} not found in Supabase")
                    raise HTTPException(status_code=404, detail="Documento no encontrado o no válido.")
            else:
                raise HTTPException(status_code=response.status, detail="Error al consultar la base de datos.")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(status_code=404, detail="Documento no encontrado o no válido.")
        logging.error(f"Supabase HTTP Error: {e.code} {e.reason}")
        raise HTTPException(status_code=e.code, detail=f"Error de base de datos: {e.reason}")
    except urllib.error.URLError as e:
        logging.error(f"Supabase Connection Error: {e.reason}")
        raise HTTPException(status_code=503, detail="Servicio de base de datos no disponible.")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Clear Path API is running ✅ (Python/FastAPI)"}


# ── 404 Handler ──────────────────────────────────────────────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Preserve meaningful 404 details raised intentionally by endpoints (e.g. verification "not found")
    # while still returning a useful message for truly unknown routes.
    if exc.status_code == 404 and getattr(exc, "detail", None) and exc.detail != "Not Found":
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={"error": f"Ruta no encontrada: {request.method} {request.url.path}"},
        )

    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


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
