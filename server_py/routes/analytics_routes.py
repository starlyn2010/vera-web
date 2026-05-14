"""
Clear Path API — Analytics Router
Mirrors server/controllers/analyticsController.js + server/routes/analyticsRoutes.js
"""

from fastapi import APIRouter, Depends

from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/environmental")
async def get_environmental_summary(user: dict = Depends(get_current_user)):
    metrics = await query(
        "SELECT tipo_metrica, AVG(valor_porcentual) as promedio FROM metricas_ambientales GROUP BY tipo_metrica"
    )
    projects_count = await query("SELECT COUNT(*) as total FROM proyectos")
    active_projects = await query("SELECT COUNT(*) as total FROM proyectos WHERE estado = 'En Progreso'")
    monthly = await query(
        """
        SELECT strftime('%m', fecha) as mes, AVG(valor_porcentual) as valor 
        FROM metricas_ambientales 
        WHERE fecha >= date('now', '-1 year')
        GROUP BY mes 
        ORDER BY mes ASC
        """
    )

    return {
        "averages": metrics,
        "totalProjects": projects_count[0]["total"] if projects_count else 0,
        "activeProjects": active_projects[0]["total"] if active_projects else 0,
        "monthlyImpact": monthly,
    }


@router.get("/sales")
async def get_sales_stats(user: dict = Depends(get_current_user)):
    sales = await query("SELECT SUM(total) as ingresos_totales, COUNT(*) as pedidos_totales FROM pedidos")
    monthly_sales = await query(
        """
        SELECT strftime('%m', fecha) as mes, SUM(total) as total 
        FROM pedidos 
        WHERE fecha >= date('now', '-1 year')
        GROUP BY mes 
        ORDER BY mes ASC
        """
    )

    base = sales[0] if sales else {"ingresos_totales": 0, "pedidos_totales": 0}
    return {**base, "monthlySales": monthly_sales}
