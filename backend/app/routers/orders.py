from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_database
from app.dependencies.auth import get_current_user, require_admin
from app.schemas.order import OrderCreate, OrderStatusUpdate
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/orders", tags=["Orders"])


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid id.")
    return ObjectId(value)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate, current_user=Depends(get_current_user)):
    db = get_database()
    now = datetime.now(timezone.utc)

    for item in payload.items:
        product = await db.products.find_one({"_id": to_object_id(item.productId)})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.productId} not found.")
        if product["stock"] < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for {product['name']}.",
            )

    order_data = {
        **payload.model_dump(),
        "userId": current_user["id"],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.orders.insert_one(order_data)

    for item in payload.items:
        await db.products.update_one(
            {"_id": to_object_id(item.productId)},
            {"$inc": {"stock": -item.quantity}, "$set": {"updatedAt": now}},
        )

    order = await db.orders.find_one({"_id": result.inserted_id})
    return serialize_document(order)


@router.get("/me")
async def get_current_user_orders(current_user=Depends(get_current_user)):
    db = get_database()
    orders = await db.orders.find({"userId": current_user["id"]}).sort("createdAt", -1).to_list(
        length=None
    )
    return serialize_many(orders)


@router.get("")
async def admin_get_all_orders(_admin=Depends(require_admin)):
    db = get_database()
    orders = await db.orders.find().sort("createdAt", -1).to_list(length=None)
    return serialize_many(orders)


@router.patch("/{order_id}/status")
async def admin_update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    _admin=Depends(require_admin),
):
    db = get_database()
    object_id = to_object_id(order_id)
    await db.orders.update_one(
        {"_id": object_id},
        {
            "$set": {
                "orderStatus": payload.orderStatus,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )
    order = await db.orders.find_one({"_id": object_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return serialize_document(order)
