"""
Clear Path API — Chatbot Router (Jud via Groq)
Uses urllib (stdlib) to call Groq API — no groq SDK needed.
"""

import asyncio
import json
import os
import urllib.request
import urllib.error
from functools import partial

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

from config import GROQ_API_KEY, GROQ_MODEL
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

_groq_available = bool(GROQ_API_KEY and GROQ_API_KEY.startswith("gsk_"))
if _groq_available:
    print("Jud: Groq API Key configurada correctamente.")
else:
    print("Jud: GROQ_API_KEY no encontrada o invalida. Modo offline activado.")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatBody(BaseModel):
    message: str
    history: list[ChatMessage] | None = None


def _call_groq_sync(messages: list[dict]) -> str:
    """Synchronous Groq API call using urllib."""
    payload = json.dumps({
        "messages": messages,
        "model": GROQ_MODEL,
        "temperature": 0.6,
        "max_tokens": 1024,
    }).encode("utf-8")

    req = urllib.request.Request(
        GROQ_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Groq HTTP {e.code}: {body}")


@router.post("/message")
async def handle_chat(body: ChatBody, user: dict = Depends(get_current_user)):
    if not body.message or not body.message.strip():
        raise HTTPException(400, "El mensaje no puede estar vacío.")

    # Inventory context
    context = "No hay datos de inventario disponibles actualmente."
    try:
        products = await query("SELECT producto, stock, impacto_ambiental FROM inventario LIMIT 20")
        if products:
            context = "\n".join(
                f"- {p['producto']}: {p['stock']} unidades ({p['impacto_ambiental']}kg CO2/ud)" for p in products
            )
    except Exception:
        pass

    system_prompt = f"""Eres Jud, la asistente inteligente de Clear Path — una plataforma de sostenibilidad ambiental de BioHands.
Tu función es ayudar a los usuarios con gestión de inventario, análisis de impacto ambiental, proyectos eco y métricas operacionales.

Inventario actual del sistema:
{context}

Instrucciones de comportamiento:
- Responde siempre en español, de forma profesional y con un toque tecnológico-natural.
- Sé conciso pero completo. Usa listas o números cuando la respuesta lo amerite.
- Si no sabes algo con certeza, dilo claramente en lugar de inventar datos.
- Si te preguntan algo fuera del dominio de Clear Path, puedes responder brevemente pero redirige al tema ambiental/operacional."""

    valid_roles = {"user", "assistant"}
    history = [
        {"role": m.role, "content": m.content}
        for m in (body.history or [])
        if m.role in valid_roles and m.content
    ][-20:]

    messages = [{"role": "system", "content": system_prompt}, *history, {"role": "user", "content": body.message.strip()}]

    if not _groq_available:
        return {
            "reply": "Hola, soy Jud. Mi módulo de IA está en modo de mantenimiento actualmente. El equipo BioHands está trabajando para restaurarlo. ¿Puedo ayudarte con información básica del inventario o proyectos?"
        }

    try:
        loop = asyncio.get_event_loop()
        reply = await loop.run_in_executor(None, partial(_call_groq_sync, messages))

        if not reply:
            raise ValueError("Groq returned empty response")

        # Save consultation async (non-blocking)
        user_id = user.get("id")
        asyncio.create_task(_save_consultation(user_id, body.message.strip(), reply))

        return {"reply": reply}

    except RuntimeError as e:
        error_detail = str(e)
        print(f"Groq Runtime Error: {error_detail}")
        # Graceful fallback: do not break the UI when Groq is unreachable (common in restricted networks).
        return {
            "reply": "Hola, soy Jud. Mi módulo de IA está temporalmente no disponible. Puedo ayudarte con información básica del inventario, pedidos y reportes sin IA por ahora."
        }
    except Exception as e:
        error_detail = str(e)
        print(f"Groq General Error: {error_detail}")
        return {
            "reply": "Hola, soy Jud. Mi módulo de IA está temporalmente no disponible. Puedo ayudarte con información básica del inventario, pedidos y reportes sin IA por ahora."
        }


async def _save_consultation(user_id: int | None, question: str, answer: str):
    try:
        await query(
            "INSERT INTO consultas_chatbot (id_usuario, pregunta, respuesta) VALUES (?, ?, ?)",
            (user_id, question, answer),
        )
    except Exception as e:
        print(f"No se pudo guardar consulta en DB: {e}")
