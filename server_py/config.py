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
    raise ValueError(
        "\n\n❌  SEGURIDAD: La variable JWT_SECRET no está configurada.\n"
        "   Crea un archivo server_py/.env con la línea:\n"
        "   JWT_SECRET=tu_clave_secreta_aqui\n"
    )
JWT_SECRET = _jwt

GROQ_API_KEY = get_env_var("GROQ_API_KEY", "")
GROQ_MODEL = get_env_var("GROQ_MODEL", "llama-3.3-70b-versatile")
