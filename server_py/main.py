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
from routes.auth_routes import router as auth_router
from routes.inventory_routes import router as inventory_router
from routes.order_routes import router as order_router
from routes.project_routes import router as project_router
from routes.analytics_routes import router as analytics_router
from routes.chatbot_routes import router as chatbot_router
from routes.report_routes import router as report_router

app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(order_router)
app.include_router(project_router)
app.include_router(analytics_router)
app.include_router(chatbot_router)
app.include_router(report_router)


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "service": "Clear Path API (Python/FastAPI)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "groq": bool(os.getenv("GROQ_API_KEY")),
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
