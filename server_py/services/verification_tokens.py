import time
from typing import Any

from config import JWT_SECRET
import jwt_utils


def _trim_text(value: Any, max_len: int) -> str:
    if value is None:
        return ""
    text = value if isinstance(value, str) else str(value)
    text = " ".join(text.strip().split())
    if len(text) <= max_len:
        return text
    # ASCII ellipsis to keep QR/JWT payload strictly ASCII-friendly
    return text[: max(0, max_len - 3)].rstrip() + "..."


def _compact_invoice_payload(payload: dict[str, Any]) -> dict[str, Any]:
    raw_items = payload.get("items") or []
    items: list[dict[str, Any]] = []

    # Keep the token very small: only essential fields, limit to 4 items max.
    for raw in raw_items[:4]:
        items.append(
            {
                "c": raw.get("cantidad"),
                "p": _trim_text(raw.get("producto") or "P", 30),
                "s": raw.get("subtotal"),
            }
        )

    return {
        "id": payload.get("id_pedido"),
        "f": payload.get("fecha"),
        "cl": _trim_text(payload.get("cliente") or "C", 40),
        "t": payload.get("total"),
        "i": items,
    }


def _compact_report_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": payload.get("id_reporte"),
        "t": _trim_text(payload.get("tipo") or "R", 15),
        "p": _trim_text(payload.get("periodo") or "", 15),
        "f": payload.get("fecha_generacion"),
        # We remove 's' (summary) to keep the QR code small. 
        # The verification page will show a generic message or just the type/period.
    }


def _compact_payload(doc_tipo: str, payload: dict[str, Any]) -> dict[str, Any]:
    # QR tokens must stay compact; otherwise scanners fail and verification shows "Documento No Encontrado".
    if doc_tipo == "invoice":
        return _compact_invoice_payload(payload)
    if doc_tipo == "report":
        return _compact_report_payload(payload)
    return payload


def create_verification_token(doc_id: str, doc_tipo: str, payload: dict[str, Any]) -> str:
    # 10 years
    exp = int(time.time() + 10 * 365 * 24 * 60 * 60)
    compact_payload = _compact_payload(doc_tipo, payload)
    token_payload = {
        "v": 1,
        "id": doc_id,
        "tipo": doc_tipo,
        "payload": compact_payload,
        "exp": exp,
    }
    return jwt_utils.encode(token_payload, JWT_SECRET)


def decode_verification_token(token: str) -> dict[str, Any]:
    return jwt_utils.decode(token, JWT_SECRET)
