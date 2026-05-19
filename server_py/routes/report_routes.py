"""
Clear Path API — Report Router
Mirrors server/controllers/reportController.js + server/routes/reportRoutes.js
"""

import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import query
from auth import get_current_user
from services.supabase_sync import sync_document_to_supabase
from datetime import datetime

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
    report_id = result["insertId"]

    payload = {
        "id_reporte": report_id,
        "tipo": body.tipo,
        "periodo": body.periodo,
        "fecha_generacion": str(datetime.now().date()),
        "summary": f"Reporte de tipo {body.tipo} del periodo {body.periodo} generado por Clear Path."
    }
    sync_document_to_supabase(f"report-{report_id}", "report", payload)

    return {"message": "Reporte generado con éxito", "reportId": report_id, "path": archivo_path}


@router.post("", status_code=201)
async def generate_report_alt(body: ReportBody, user: dict = Depends(get_current_user)):
    return await generate_report(body, user)


class CustomReportBody(BaseModel):
    id_reporte: str
    tipo: str
    periodo: str
    summary: str

@router.post("/custom", status_code=201)
async def generate_custom_report(body: CustomReportBody, user: dict = Depends(get_current_user)):
    if user.get("rol") != "admin":
        raise HTTPException(403, "Solo un administrador puede crear reportes.")
    
    archivo_path = f"/downloads/reports/{body.id_reporte}.pdf"
    
    result = await query(
        "INSERT INTO reportes (tipo, periodo, archivo_path) VALUES (?, ?, ?)",
        (body.tipo, body.periodo, archivo_path),
    )
    
    payload = {
        "id_reporte": body.id_reporte,
        "tipo": body.tipo,
        "periodo": body.periodo,
        "fecha_generacion": str(datetime.now().date()),
        "summary": body.summary
    }
    sync_document_to_supabase(body.id_reporte, "report", payload)
    
    return {"message": "Reporte personalizado registrado", "reportId": result["insertId"], "id_reporte": body.id_reporte}
