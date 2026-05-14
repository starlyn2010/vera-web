"""
Clear Path API — Inventory Router
Mirrors server/controllers/inventoryController.js + server/routes/inventoryRoutes.js
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


class ProductBody(BaseModel):
    producto: str
    categoria: str
    precio: float
    stock: int
    impacto_ambiental: float = 0.0
    imagen_url: str | None = None


@router.get("")
async def get_all_products(user: dict = Depends(get_current_user)):
    products = await query("SELECT * FROM inventario ORDER BY producto ASC")
    return products


@router.get("/{product_id}")
async def get_product_by_id(product_id: int, user: dict = Depends(get_current_user)):
    products = await query("SELECT * FROM inventario WHERE id_producto = ?", (product_id,))
    if not products:
        raise HTTPException(404, "Product not found")
    return products[0]


@router.post("/", status_code=201)
async def create_product(body: ProductBody, user: dict = Depends(get_current_user)):
    if user.get("rol") != "admin":
        raise HTTPException(403, "Solo un administrador puede crear productos.")

    if not body.producto or not body.categoria:
        raise HTTPException(400, "Todos los campos son obligatorios")

    result = await query(
        "INSERT INTO inventario (producto, categoria, imagen_url, precio, stock, impacto_ambiental) VALUES (?, ?, ?, ?, ?, ?)",
        (body.producto, body.categoria, body.imagen_url, body.precio, body.stock, body.impacto_ambiental),
    )
    return {"id": result["insertId"], "message": "Producto registrado con éxito"}


@router.delete("/{product_id}")
async def delete_product(product_id: int, user: dict = Depends(get_current_user)):
    if user.get("rol") != "admin":
        raise HTTPException(403, "Solo un administrador puede eliminar productos.")

    existing = await query("SELECT * FROM inventario WHERE id_producto = ?", (product_id,))
    if not existing:
        raise HTTPException(404, "Producto no encontrado.")

    await query("DELETE FROM inventario WHERE id_producto = ?", (product_id,))
    return {"message": "Producto eliminado con éxito"}
