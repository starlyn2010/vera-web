"""
Clear Path API — Report Router
Mirrors server/controllers/reportController.js + server/routes/reportRoutes.js
"""

import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportBody(BaseModel):
    tipo: str
    periodo: str


@router.get("")
async def get_reports(user: dict = Depends(get_current_user)):
    reports = await query("SELECT * FROM reportes ORDER BY fecha_generacion DESC")
    return reports


@router.post("/generate", status_code=201)
async def generate_report(body: ReportBody, user: dict = Depends(get_current_user)):
    if user.get("rol") != "admin":
        raise HTTPException(403, "Solo un administrador puede crear reportes.")
    if not body.tipo or not body.periodo:
        raise HTTPException(400, "Tipo y periodo son obligatorios.")

    filename = f"reporte_{body.tipo.lower()}_{int(time.time() * 1000)}.pdf"
    archivo_path = f"/downloads/reports/{filename}"

    result = await query(
        "INSERT INTO reportes (tipo, periodo, archivo_path) VALUES (?, ?, ?)",
        (body.tipo, body.periodo, archivo_path),
    )
    return {"message": "Reporte generado con éxito", "reportId": result["insertId"], "path": archivo_path}


@router.post("", status_code=201)
async def generate_report_alt(body: ReportBody, user: dict = Depends(get_current_user)):
    return await generate_report(body, user)
