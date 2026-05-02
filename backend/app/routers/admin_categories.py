from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_database
from app.dependencies.auth import require_permission
from app.routers.categories import (
    normalize_category_payload,
    normalize_category_updates,
    to_object_id,
)
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/admin/categories", tags=["Admin Categories"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    now = datetime.now(timezone.utc)
    category_data = normalize_category_payload(payload.model_dump())
    category_data["createdAt"] = now
    category_data["updatedAt"] = now
    result = await db.categories.insert_one(category_data)
    category = await db.categories.find_one({"_id": result.inserted_id})
    return serialize_document(category)


@router.get("")
async def get_admin_categories(_admin=Depends(require_permission("categories.read"))):
    db = get_database()
    categories = await db.categories.find().sort([("sortOrder", 1), ("name", 1)]).to_list(
        length=None
    )
    return serialize_many(categories)


@router.get("/{category_id}")
async def get_admin_category(
    category_id: str,
    _admin=Depends(require_permission("categories.read")),
):
    db = get_database()
    category = await db.categories.find_one({"_id": to_object_id(category_id)})
    return serialize_document(category)


@router.put("/{category_id}")
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    object_id = to_object_id(category_id)
    existing_category = await db.categories.find_one({"_id": object_id})
    if not existing_category:
        raise HTTPException(status_code=404, detail="Category not found.")
    updates = normalize_category_updates(payload.model_dump(exclude_unset=True))
    updates["updatedAt"] = datetime.now(timezone.utc)
    await db.categories.update_one({"_id": object_id}, {"$set": updates})
    if "name" in updates:
        await db.products.update_many(
            {"categoryId": category_id},
            {"$set": {"categoryName": updates["name"], "updatedAt": datetime.now(timezone.utc)}},
        )
    category = await db.categories.find_one({"_id": object_id})
    return serialize_document(category)


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    object_id = to_object_id(category_id)
    linked_product = await db.products.find_one(
        {"categoryId": category_id, "status": {"$ne": "deleted"}}
    )
    if linked_product:
        raise HTTPException(
            status_code=400,
            detail="Category cannot be deleted while products are still linked to it.",
        )
    await db.categories.delete_one({"_id": object_id})
    return {"message": "Category deleted successfully."}
