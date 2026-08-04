from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_database
from app.dependencies.auth import require_permission
from app.routers.categories import (
    normalize_category_payload,
    normalize_category_updates,
    normalize_variant_code_payload,
    normalize_variant_code_updates,
    to_object_id,
)
from app.schemas.category import (
    CategoryBulkDeleteRequest,
    CategoryCreate,
    CategoryDeleteResult,
    CategoryUpdate,
    VariantCodeCreate,
    VariantCodeUpdate,
)
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/admin/categories", tags=["Admin Categories"])


async def try_delete_category(db, category_id: str) -> CategoryDeleteResult:
    try:
        object_id = to_object_id(category_id)
    except HTTPException:
        return CategoryDeleteResult(id=category_id, success=False, reason="Invalid category id.")

    category = await db.categories.find_one({"_id": object_id})
    if not category:
        return CategoryDeleteResult(id=category_id, success=False, reason="Category not found.")

    linked_product = await db.products.find_one(
        {"categoryId": category_id, "status": {"$ne": "deleted"}},
        {"_id": 1},
    )
    if linked_product:
        return CategoryDeleteResult(
            id=category_id,
            name=category.get("name"),
            success=False,
            reason="Category cannot be deleted while products are still linked to it.",
        )

    await db.categories.delete_one({"_id": object_id})
    return CategoryDeleteResult(id=category_id, name=category.get("name"), success=True)


async def try_delete_variant_code(db, variant_code_id: str) -> CategoryDeleteResult:
    try:
        object_id = to_object_id(variant_code_id)
    except HTTPException:
        return CategoryDeleteResult(id=variant_code_id, success=False, reason="Invalid variant code id.")

    variant_code = await db.variant_codes.find_one({"_id": object_id})
    if not variant_code:
        return CategoryDeleteResult(id=variant_code_id, success=False, reason="Variant code not found.")

    await db.variant_codes.delete_one({"_id": object_id})
    return CategoryDeleteResult(id=variant_code_id, name=variant_code.get("name"), success=True)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    now = datetime.now(timezone.utc)
    category_data = normalize_category_payload(payload.model_dump())
    existing = await db.categories.find_one({"code": category_data["code"]})
    if existing:
        raise HTTPException(status_code=400, detail="Category code must be unique.")
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


@router.post("/bulk-delete")
async def bulk_delete_categories(
    payload: CategoryBulkDeleteRequest,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    unique_ids = list(dict.fromkeys(payload.ids))
    results = [await try_delete_category(db, category_id) for category_id in unique_ids]
    deleted_count = sum(1 for result in results if result.success)
    return {
        "results": [result.model_dump() for result in results],
        "deletedCount": deleted_count,
        "blockedCount": len(results) - deleted_count,
    }


@router.get("/variant-codes")
async def get_admin_variant_codes(_admin=Depends(require_permission("categories.read"))):
    db = get_database()
    variant_codes = await db.variant_codes.find().sort([("type", 1), ("sortOrder", 1), ("name", 1)]).to_list(
        length=None
    )
    return serialize_many(variant_codes)


@router.post("/variant-codes/bulk-delete")
async def bulk_delete_variant_codes(
    payload: CategoryBulkDeleteRequest,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    unique_ids = list(dict.fromkeys(payload.ids))
    results = [await try_delete_variant_code(db, variant_code_id) for variant_code_id in unique_ids]
    deleted_count = sum(1 for result in results if result.success)
    return {
        "results": [result.model_dump() for result in results],
        "deletedCount": deleted_count,
        "blockedCount": len(results) - deleted_count,
    }


@router.post("/variant-codes", status_code=status.HTTP_201_CREATED)
async def create_variant_code(
    payload: VariantCodeCreate,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    now = datetime.now(timezone.utc)
    variant_data = normalize_variant_code_payload(payload.model_dump())
    existing = await db.variant_codes.find_one({"code": variant_data["code"]})
    if existing:
        raise HTTPException(status_code=400, detail="Variant code must be unique.")
    variant_data["createdAt"] = now
    variant_data["updatedAt"] = now
    result = await db.variant_codes.insert_one(variant_data)
    created = await db.variant_codes.find_one({"_id": result.inserted_id})
    return serialize_document(created)


@router.put("/variant-codes/{variant_code_id}")
async def update_variant_code(
    variant_code_id: str,
    payload: VariantCodeUpdate,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    object_id = to_object_id(variant_code_id)
    existing_variant = await db.variant_codes.find_one({"_id": object_id})
    if not existing_variant:
        raise HTTPException(status_code=404, detail="Variant code not found.")
    updates = normalize_variant_code_updates(payload.model_dump(exclude_unset=True))
    if updates.get("code"):
        existing_code = await db.variant_codes.find_one({"code": updates["code"], "_id": {"$ne": object_id}})
        if existing_code:
            raise HTTPException(status_code=400, detail="Variant code must be unique.")
    updates["updatedAt"] = datetime.now(timezone.utc)
    await db.variant_codes.update_one({"_id": object_id}, {"$set": updates})
    variant_code = await db.variant_codes.find_one({"_id": object_id})
    return serialize_document(variant_code)


@router.delete("/variant-codes/{variant_code_id}")
async def delete_variant_code(
    variant_code_id: str,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    result = await try_delete_variant_code(db, variant_code_id)
    if result.success:
        return {"message": "Variant code deleted successfully.", "result": result.model_dump()}
    if result.reason == "Variant code not found.":
        raise HTTPException(status_code=404, detail=result.reason)
    if result.reason == "Invalid variant code id.":
        raise HTTPException(status_code=400, detail=result.reason)
    raise HTTPException(status_code=409, detail=result.reason)


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
    if updates.get("code"):
        existing_code = await db.categories.find_one({"code": updates["code"], "_id": {"$ne": object_id}})
        if existing_code:
            raise HTTPException(status_code=400, detail="Category code must be unique.")
    updates["updatedAt"] = datetime.now(timezone.utc)
    await db.categories.update_one({"_id": object_id}, {"$set": updates})
    if "name" in updates or "code" in updates:
        product_updates = {"updatedAt": datetime.now(timezone.utc)}
        if "name" in updates:
            product_updates["categoryName"] = updates["name"]
        if "code" in updates:
            product_updates["categoryCode"] = updates["code"]
        await db.products.update_many(
            {"categoryId": category_id},
            {"$set": product_updates},
        )
    category = await db.categories.find_one({"_id": object_id})
    return serialize_document(category)


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    _admin=Depends(require_permission("categories.manage")),
):
    db = get_database()
    result = await try_delete_category(db, category_id)
    if result.success:
        return {"message": "Category deleted successfully.", "result": result.model_dump()}
    if result.reason == "Category not found.":
        raise HTTPException(status_code=404, detail=result.reason)
    if result.reason == "Invalid category id.":
        raise HTTPException(status_code=400, detail=result.reason)
    raise HTTPException(status_code=409, detail=result.reason)
