"""
Clear Path API — JWT Auth dependency
Mirrors server/middleware/authMiddleware.js
Uses custom jwt_utils (stdlib only — no external dependencies).
"""

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import jwt_utils
from config import JWT_SECRET

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate JWT and return the user payload (id, rol)."""
    token = credentials.credentials
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error: Security Configuration Missing",
        )

    token = credentials.credentials
    try:
        payload = jwt_utils.decode(token, JWT_SECRET)
        return {"id": payload.get("id"), "rol": payload.get("rol")}
    except ValueError as e:
        import logging
        logging.warning(f"Auth failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token no válido o expirado: {e}",
        )
