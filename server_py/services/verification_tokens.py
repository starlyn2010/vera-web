import time
from typing import Any

from config import JWT_SECRET
import jwt_utils


def create_verification_token(doc_id: str, doc_tipo: str, payload: dict[str, Any]) -> str:
    # 10 years
    exp = int(time.time() + 10 * 365 * 24 * 60 * 60)
    token_payload = {
        "v": 1,
        "id": doc_id,
        "tipo": doc_tipo,
        "payload": payload,
        "exp": exp,
    }
    return jwt_utils.encode(token_payload, JWT_SECRET)


def decode_verification_token(token: str) -> dict[str, Any]:
    return jwt_utils.decode(token, JWT_SECRET)

