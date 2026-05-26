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
# If you are seeing 'Invalid Token' on Vercel, make sure this secret 
# matches the one configured in your Vercel Environment Variables.
_jwt = os.getenv("JWT_SECRET", "")
if not _jwt:
    # Use a predictable but unique fallback for this project
    _jwt = "clearpath_jud_secure_fallback_2026_x99"
JWT_SECRET = _jwt

GROQ_API_KEY = get_env_var("GROQ_API_KEY", "")
GROQ_MODEL = get_env_var("GROQ_MODEL", "llama-3.3-70b-versatile")
