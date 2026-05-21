"""
Clear Path API — Orders Router
Mirrors server/controllers/orderController.js + server/routes/orderRoutes.js
Includes: createOrder, getOrderHistory, getOrderDetails, cancelOrder
"""

import asyncio
from functools import partial

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import query, TransactionContext
from auth import get_current_user
from services.supabase_sync import sync_document_to_supabase
from services.verification_tokens import create_verification_token

router = APIRouter(prefix="/api/orders", tags=["orders"])


class OrderItem(BaseModel):
    id_producto: int
    cantidad: int


class CreateOrderBody(BaseModel):
    id_cliente: int | None = None
    id_empleado: int | None = None
    total: float | None = None
    productos: list[OrderItem] | None = None
    items: list[OrderItem] | None = None
    tarjeta: str | None = None
    numero_telefono: str | None = None


def _create_order_sync(body_dict: dict, normalized: list, final_total: float, user_id: int | None):
    """Run the entire order creation in a sync transaction."""
    tx = TransactionContext()
    try:
        tx.begin()
        result = tx.execute(
            "INSERT INTO pedidos (id_cliente, id_empleado, id_usuario, fecha, total) VALUES (?, ?, ?, date('now'), ?)",
            (body_dict.get("id_cliente") or user_id, body_dict.get("id_empleado") or 1, user_id, final_total),
        )
        order_id = result["insertId"]

        for item in normalized:
            tx.execute(
                "INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, subtotal) VALUES (?, ?, ?, ?)",
                (order_id, item["id_producto"], item["cantidad"], item["subtotal"]),
            )
            tx.execute(
                "UPDATE inventario SET stock = stock - ? WHERE id_producto = ?",
                (item["cantidad"], item["id_producto"]),
            )

        tx.execute(
            "INSERT INTO pago (id_pedido, tarjeta, numero_telefono, recibo) VALUES (?, ?, ?, ?)",
            (order_id, body_dict.get("tarjeta") or "N/A", body_dict.get("numero_telefono") or "N/A", f"REC-{order_id}"),
        )

        tx.commit()
        return order_id
    except Exception:
        tx.rollback()
        raise
    finally:
        tx.close()


@router.post("")
async def create_order(body: CreateOrderBody, user: dict = Depends(get_current_user)):
    order_items = body.productos or body.items or []
    user_id = user.get("id")

    if not order_items:
        raise HTTPException(400, "El pedido debe incluir al menos un producto.")

    normalized = []
    calculated_total = 0.0

    for item in order_items:
        if item.id_producto <= 0 or item.cantidad <= 0:
            raise HTTPException(400, "Cada producto debe tener un id y una cantidad válida.")

        products = await query("SELECT id_producto, precio, stock FROM inventario WHERE id_producto = ?", (item.id_producto,))
        if not products:
            raise HTTPException(404, f"Producto {item.id_producto} no encontrado.")

        product = products[0]
        if product["stock"] < item.cantidad:
            raise HTTPException(400, f"Stock insuficiente para el producto {item.id_producto}. Disponible: {product['stock']}.")

        subtotal = round(product["precio"] * item.cantidad, 2)
        calculated_total += subtotal
        normalized.append({"id_producto": item.id_producto, "cantidad": item.cantidad, "subtotal": subtotal})

    final_total = round(calculated_total or (body.total or 0), 2)

    loop = asyncio.get_event_loop()
    order_id = await loop.run_in_executor(
        None, partial(_create_order_sync, body.model_dump(), normalized, final_total, user_id)
    )

    # Fetch complete details for the public verification payload
    try:
        payload = await get_order_details(order_id, user)
    except Exception:
        # Fallback to minimal payload
        payload = {
            "id_pedido": order_id,
            "total": final_total,
            "items": normalized,
            "recibo": f"REC-{order_id}"
        }
    
    sync_document_to_supabase(f"order-{order_id}", "invoice", payload)

    return {"id_pedido": order_id, "message": "Order processed successfully"}


# ── GET /history ─────────────────────────────────────────────────────────────

@router.get("/history")
async def get_order_history(user: dict = Depends(get_current_user)):
    is_admin = user.get("rol") == "admin"
    params = () if is_admin else (user["id"],)
    where = "" if is_admin else "WHERE p.id_usuario = ?"

    orders = await query(
        f"""
        SELECT 
            p.*, 
            COALESCE(
                NULLIF(TRIM(COALESCE(c.nombre, '') || ' ' || COALESCE(c.apellido, '')), ''),
                r.nombre_usuario,
                'Consumidor Final'
            ) as cliente,
            e.nombre as empleado 
        FROM pedidos p 
        LEFT JOIN clientes c ON p.id_cliente = c.id_cliente 
        LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
        LEFT JOIN registro r ON p.id_usuario = r.id_usuario
        {where}
        ORDER BY p.fecha DESC
        """,
        params,
    )
    
    # Enrich with verification tokens
    out = []
    for o in orders:
        try:
            # We use a compact payload for the history list to keep tokens small
            token = create_verification_token(f"order-{o['id_pedido']}", "invoice", o)
        except Exception:
            token = None
        out.append({**o, "verifyToken": token})
        
    return out


# ── GET /{order_id} ──────────────────────────────────────────────────────────

@router.get("/{order_id}")
async def get_order_details(order_id: int, user: dict = Depends(get_current_user)):
    is_admin = user.get("rol") == "admin"
    params = (order_id,) if is_admin else (order_id, user["id"])
    user_clause = "" if is_admin else "AND p.id_usuario = ?"

    orders = await query(
        f"""
        SELECT
            p.*,
            COALESCE(
                NULLIF(TRIM(COALESCE(c.nombre, '') || ' ' || COALESCE(c.apellido, '')), ''),
                r.nombre_usuario,
                'Consumidor Final'
            ) as cliente,
            e.nombre as empleado,
            pago.recibo
        FROM pedidos p
        LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
        LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
        LEFT JOIN registro r ON p.id_usuario = r.id_usuario
        LEFT JOIN pago ON p.id_pedido = pago.id_pedido
        WHERE p.id_pedido = ? {user_clause}
        """,
        params,
    )

    if not orders:
        raise HTTPException(404, "Pedido no encontrado.")

    items = await query(
        """
        SELECT
            d.id_detalle,
            d.id_producto,
            COALESCE(i.producto, 'Producto no disponible') as producto,
            COALESCE(i.categoria, 'General') as categoria,
            COALESCE(i.precio, d.subtotal / NULLIF(d.cantidad, 0), d.subtotal) as precio,
            d.cantidad,
            d.subtotal
        FROM detalle_pedido d
        LEFT JOIN inventario i ON d.id_producto = i.id_producto
        WHERE d.id_pedido = ?
        ORDER BY d.id_detalle ASC
        """,
        (order_id,),
    )

    if not items:
        items = [
            {
                "id_detalle": None,
                "id_producto": None,
                "producto": "Pedido consolidado",
                "categoria": "General",
                "precio": orders[0].get("total", 0),
                "cantidad": 1,
                "subtotal": orders[0].get("total", 0),
            }
        ]

    payload = {**orders[0], "items": items}
    verify_token = create_verification_token(f"order-{order_id}", "invoice", payload)
    return {**payload, "verifyToken": verify_token}


# ── DELETE /{order_id} — Cancel Order ────────────────────────────────────────

def _cancel_order_sync(order_id: int):
    """Run cancel in sync transaction."""
    tx = TransactionContext()
    try:
        tx.begin()
        items = tx.fetchall("SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?", (order_id,))
        for item in items:
            if item.get("id_producto"):
                tx.execute("UPDATE inventario SET stock = stock + ? WHERE id_producto = ?", (item["cantidad"], item["id_producto"]))

        tx.execute("DELETE FROM pago WHERE id_pedido = ?", (order_id,))
        tx.execute("DELETE FROM detalle_pedido WHERE id_pedido = ?", (order_id,))
        tx.execute("DELETE FROM pedidos WHERE id_pedido = ?", (order_id,))
        tx.commit()
    except Exception:
        tx.rollback()
        raise
    finally:
        tx.close()


@router.delete("/{order_id}")
async def cancel_order(order_id: int, user: dict = Depends(get_current_user)):
    is_admin = user.get("rol") == "admin"
    params = (order_id,) if is_admin else (order_id, user["id"])
    where = "WHERE id_pedido = ?" if is_admin else "WHERE id_pedido = ? AND id_usuario = ?"

    orders = await query(f"SELECT * FROM pedidos {where}", params)
    if not orders:
        raise HTTPException(404, "Pedido no encontrado o no tienes permisos para cancelarlo.")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, partial(_cancel_order_sync, order_id))

    return {"message": "Pedido cancelado y stock restaurado correctamente."}
