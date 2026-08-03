from datetime import datetime, timezone
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.catalog import PRODUCT_LABELS
from app.core.sku import normalize_alpha_code
from app.db.mongodb import get_database
from app.dependencies.auth import require_admin
from app.schemas.category import CategoryCreate, CategoryUpdate, VariantCodeCreate, VariantCodeUpdate
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/categories", tags=["Categories"])


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid category id.")
    return ObjectId(value)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "category"


def normalize_category_payload(payload: dict) -> dict:
    normalized = dict(payload)
    normalized["name"] = normalized["name"].strip()
    normalized["code"] = normalize_alpha_code(normalized.get("code"), max_length=3)
    if len(normalized["code"]) < 2:
        raise HTTPException(status_code=400, detail="Category code must be 2 or 3 letters.")
    normalized["slug"] = slugify(normalized.get("slug") or normalized["name"])

    if normalized.get("description"):
        normalized["description"] = normalized["description"].strip()

    if normalized.get("imageUrl"):
        normalized["imageUrl"] = normalized["imageUrl"].strip()

    return normalized


def normalize_category_updates(updates: dict) -> dict:
    normalized = dict(updates)

    if "name" in normalized and normalized["name"]:
        normalized["name"] = normalized["name"].strip()

    if "code" in normalized and normalized["code"] is not None:
        normalized["code"] = normalize_alpha_code(normalized["code"], max_length=3)
        if normalized["code"] and len(normalized["code"]) < 2:
            raise HTTPException(status_code=400, detail="Category code must be 2 or 3 letters.")

    if "name" in normalized and "slug" not in normalized:
        normalized["slug"] = slugify(normalized["name"])

    if "slug" in normalized:
        base_name = normalized.get("name") or normalized.get("slug")
        normalized["slug"] = slugify(base_name)

    if "description" in normalized and isinstance(normalized["description"], str):
        normalized["description"] = normalized["description"].strip()

    if "imageUrl" in normalized and isinstance(normalized["imageUrl"], str):
        normalized["imageUrl"] = normalized["imageUrl"].strip()

    return normalized


def normalize_variant_code_payload(payload: dict) -> dict:
    normalized = dict(payload)
    normalized["name"] = normalized["name"].strip()
    normalized["code"] = normalize_alpha_code(normalized.get("code"), max_length=4)
    if len(normalized["code"]) < 2:
        raise HTTPException(status_code=400, detail="Variant code must be at least 2 letters.")
    normalized["type"] = (normalized.get("type") or "color").strip().lower()
    if normalized.get("description"):
        normalized["description"] = normalized["description"].strip()
    return normalized


def normalize_variant_code_updates(updates: dict) -> dict:
    normalized = dict(updates)
    if "name" in normalized and normalized["name"]:
        normalized["name"] = normalized["name"].strip()
    if "code" in normalized and normalized["code"] is not None:
        normalized["code"] = normalize_alpha_code(normalized["code"], max_length=4)
        if normalized["code"] and len(normalized["code"]) < 2:
            raise HTTPException(status_code=400, detail="Variant code must be at least 2 letters.")
    if "type" in normalized and normalized["type"]:
        normalized["type"] = normalized["type"].strip().lower()
    if "description" in normalized and isinstance(normalized["description"], str):
        normalized["description"] = normalized["description"].strip()
    return normalized


@router.get("")
async def get_categories():
    db = get_database()
    categories = await db.categories.find({"isActive": True}).sort(
        [("sortOrder", 1), ("name", 1)]
    ).to_list(length=None)
    return serialize_many(categories)


@router.get("/admin/list")
async def get_admin_categories(_admin=Depends(require_admin)):
    db = get_database()
    categories = await db.categories.find().sort([("sortOrder", 1), ("name", 1)]).to_list(
        length=None
    )
    return serialize_many(categories)


@router.get("/labels")
async def get_product_labels():
    return PRODUCT_LABELS


@router.get("/variant-codes")
async def get_variant_codes():
    db = get_database()
    variant_codes = await db.variant_codes.find({"isActive": True}).sort(
        [("type", 1), ("sortOrder", 1), ("name", 1)]
    ).to_list(length=None)
    return serialize_many(variant_codes)


@router.get("/admin/{category_id}")
async def get_admin_category(category_id: str, _admin=Depends(require_admin)):
    db = get_database()
    category = await db.categories.find_one({"_id": to_object_id(category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    return serialize_document(category)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, _admin=Depends(require_admin)):
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


@router.put("/{category_id}")
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    _admin=Depends(require_admin),
):
    db = get_database()
    object_id = to_object_id(category_id)
    category = await db.categories.find_one({"_id": object_id})
    if not category:
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
    updated = await db.categories.find_one({"_id": object_id})
    return serialize_document(updated)


@router.delete("/{category_id}")
async def delete_category(category_id: str, _admin=Depends(require_admin)):
    db = get_database()
    object_id = to_object_id(category_id)
    category = await db.categories.find_one({"_id": object_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

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


@router.post("/variant-codes", status_code=status.HTTP_201_CREATED)
async def create_variant_code(payload: VariantCodeCreate, _admin=Depends(require_admin)):
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
    _admin=Depends(require_admin),
):
    db = get_database()
    object_id = to_object_id(variant_code_id)
    variant_code = await db.variant_codes.find_one({"_id": object_id})
    if not variant_code:
        raise HTTPException(status_code=404, detail="Variant code not found.")

    updates = normalize_variant_code_updates(payload.model_dump(exclude_unset=True))
    if updates.get("code"):
        existing = await db.variant_codes.find_one({"code": updates["code"], "_id": {"$ne": object_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Variant code must be unique.")
    updates["updatedAt"] = datetime.now(timezone.utc)
    await db.variant_codes.update_one({"_id": object_id}, {"$set": updates})
    updated = await db.variant_codes.find_one({"_id": object_id})
    return serialize_document(updated)


@router.delete("/variant-codes/{variant_code_id}")
async def delete_variant_code(variant_code_id: str, _admin=Depends(require_admin)):
    db = get_database()
    object_id = to_object_id(variant_code_id)
    await db.variant_codes.delete_one({"_id": object_id})
    return {"message": "Variant code deleted successfully."}
