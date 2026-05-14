"""
Clear Path API — Project Router
Mirrors server/controllers/projectController.js + server/routes/projectRoutes.js
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectBody(BaseModel):
    nombre: str
    departamento: str
    estado: str = "Pendiente"
    fecha_inicio: str | None = None


class StatusBody(BaseModel):
    estado: str


@router.get("")
async def get_all_projects(user: dict = Depends(get_current_user)):
    projects = await query("SELECT * FROM proyectos")
    return projects


@router.post("/", status_code=201)
async def create_project(body: ProjectBody, user: dict = Depends(get_current_user)):
    if user.get("rol") != "admin":
        raise HTTPException(403, "Solo un administrador puede crear proyectos.")
    if not body.nombre or not body.departamento:
        raise HTTPException(400, "El nombre y el departamento son obligatorios")

    result = await query(
        "INSERT INTO proyectos (nombre, departamento, estado, fecha_inicio) VALUES (?, ?, ?, ?)",
        (body.nombre, body.departamento, body.estado, body.fecha_inicio or date.today().isoformat()),
    )
    return {"id": result["insertId"], "message": "Proyecto iniciado exitosamente"}


@router.patch("/{project_id}/status")
async def update_project_status(project_id: int, body: StatusBody, user: dict = Depends(get_current_user)):
    await query("UPDATE proyectos SET estado = ? WHERE id_proyecto = ?", (body.estado, project_id))
    return {"message": "Project status updated"}
