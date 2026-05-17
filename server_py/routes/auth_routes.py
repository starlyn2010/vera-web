"""
Clear Path API — Auth Router
Mirrors server/controllers/authController.js + server/routes/authRoutes.js
Uses bcrypt (native) + custom jwt_utils (stdlib).
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import bcrypt as bcrypt_lib

import jwt_utils
from database import query
from config import JWT_SECRET
from auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])



# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    nombre_usuario: str
    correo_electronico: str
    password: str | None = None
    contrasena: str | None = None

class LoginBody(BaseModel):
    nombre_usuario: str
    password: str | None = None
    contrasena: str | None = None

class ProfileBody(BaseModel):
    nombre: str
    email: str


def _read_password(body) -> str | None:
    return body.password or body.contrasena


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterBody):
    password = _read_password(body)
    if not body.nombre_usuario or not body.correo_electronico or not password:
        raise HTTPException(400, "Todos los campos son obligatorios.")
    if len(password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres.")

    existing = await query(
        "SELECT * FROM registro WHERE nombre_usuario = ? OR correo_electronico = ?",
        (body.nombre_usuario, body.correo_electronico),
    )
    if existing:
        raise HTTPException(400, "El nombre de usuario o correo ya están en uso.")

    hashed = bcrypt_lib.hashpw(password.encode("utf-8"), bcrypt_lib.gensalt()).decode("utf-8")
    await query(
        "INSERT INTO registro (nombre_usuario, correo_electronico, contraseña) VALUES (?, ?, ?)",
        (body.nombre_usuario, body.correo_electronico, hashed),
    )
    return {"message": "Usuario registrado con éxito."}


@router.post("/login")
async def login(body: LoginBody):
    password = _read_password(body)
    if not body.nombre_usuario or not password:
        raise HTTPException(400, "Usuario y contraseña son obligatorios.")

    # Allow login using either username or email.
    rows = await query(
        "SELECT * FROM registro WHERE nombre_usuario = ? OR correo_electronico = ?",
        (body.nombre_usuario, body.nombre_usuario),
    )
    user = rows[0] if rows else None
    if not user:
        raise HTTPException(401, "Credenciales inválidas. Verifica tu usuario y contraseña.")

    password_hash = user.get("contraseña") or user.get("contraseÃ±a", "")
    if not password_hash or not bcrypt_lib.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
        raise HTTPException(401, "Credenciales inválidas. Verifica tu usuario y contraseña.")

    if not JWT_SECRET:
        raise HTTPException(500, "JWT_SECRET no está configurado.")

    exp = datetime.now(timezone.utc) + timedelta(hours=24)
    token = jwt_utils.encode(
        {"id": user["id_usuario"], "rol": user.get("rol", "cliente"), "exp": int(exp.timestamp())},
        JWT_SECRET,
    )

    return {
        "token": token,
        "user": {
            "id": user["id_usuario"],
            "nombre": user["nombre_usuario"],
            "email": user["correo_electronico"],
            "rol": user.get("rol", "cliente"),
        },
    }


@router.patch("/plan")
async def update_plan(user: dict = Depends(get_current_user)):
    raise HTTPException(410, "La página de suscripción fue retirada. El acceso se controla por rol.")


@router.patch("/profile")
async def update_profile(body: ProfileBody, user: dict = Depends(get_current_user)):
    await query(
        "UPDATE registro SET nombre_usuario = ?, correo_electronico = ? WHERE id_usuario = ?",
        (body.nombre, body.email, user["id"]),
    )
    return {
        "message": "Perfil actualizado.", 
        "user": {
            "id": user["id"],
            "nombre": body.nombre, 
            "email": body.email,
            "rol": user.get("rol", "cliente")
        }
    }
