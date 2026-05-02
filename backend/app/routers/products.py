from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_database
from app.dependencies.auth import require_admin
from app.schemas.product import ProductCreate, ProductUpdate, StockUpdate
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/products", tags=["Products"])


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid product id.")
    return ObjectId(value)


@router.get("")
async def get_all_products():
    db = get_database()
    products = await db.products.find().sort("createdAt", -1).to_list(length=None)
    return serialize_many(products)


@router.get("/{product_id}")
async def get_single_product(product_id: str):
    db = get_database()
    product = await db.products.find_one({"_id": to_object_id(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)


@router.post("", status_code=status.HTTP_201_CREATED)
async def admin_create_product(payload: ProductCreate, _admin=Depends(require_admin)):
    db = get_database()
    now = datetime.now(timezone.utc)
    product_data = {**payload.model_dump(), "createdAt": now, "updatedAt": now}
    result = await db.products.insert_one(product_data)
    product = await db.products.find_one({"_id": result.inserted_id})
    return serialize_document(product)


@router.put("/{product_id}")
async def admin_update_product(
    product_id: str,
    payload: ProductUpdate,
    _admin=Depends(require_admin),
):
    db = get_database()
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    updates["updatedAt"] = datetime.now(timezone.utc)
    object_id = to_object_id(product_id)
    await db.products.update_one({"_id": object_id}, {"$set": updates})
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)


@router.delete("/{product_id}")
async def admin_delete_product(product_id: str, _admin=Depends(require_admin)):
    db = get_database()
    result = await db.products.delete_one({"_id": to_object_id(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found.")
    return {"message": "Product deleted successfully."}


@router.patch("/{product_id}/stock")
async def admin_update_stock(
    product_id: str,
    payload: StockUpdate,
    _admin=Depends(require_admin),
):
    db = get_database()
    object_id = to_object_id(product_id)
    await db.products.update_one(
        {"_id": object_id},
        {
            "$set": {
                "stock": payload.stock,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)
