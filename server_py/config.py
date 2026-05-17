import os
from dotenv import load_dotenv

# Load env immediately
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def get_env_var(name, fallback=""):
    val = os.getenv(name, "")
    if not val:
        return fallback
    return val

# ── Security: JWT_SECRET MUST be set via .env ──
_jwt = os.getenv("JWT_SECRET", "")
if not _jwt:
    # If .env failed to load, provide a fallback for offline executable
    _jwt = "clearpath_offline_secret_key_123_xyz"
JWT_SECRET = _jwt

GROQ_API_KEY = get_env_var("GROQ_API_KEY", "")
GROQ_MODEL = get_env_var("GROQ_MODEL", "llama-3.3-70b-versatile")
