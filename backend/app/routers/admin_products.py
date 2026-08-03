from datetime import datetime, timezone
import re
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.admin import has_permission
from app.db.mongodb import get_database
from app.dependencies.auth import require_admin, require_permission
from app.services.b2_service import delete_image_from_b2
from app.core.sku import build_sku_details
from app.routers.products import (
    attach_category_details,
    build_image_only_product,
    ensure_unique_product_fields,
    maybe_object_id,
    normalize_product_payload,
    normalize_product_updates,
    normalize_status_visibility,
    to_object_id,
    validate_visibility_rules,
)
from app.schemas.product import (
    ProductBulkDeleteRequest,
    ProductCreate,
    ProductDeleteResult,
    ProductFromImageCreate,
    ProductImage,
    ProductUpdate,
)
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])


async def delete_product_images_if_unused(db, product: dict) -> None:
    image_keys = {
        (image.get("key") or "").strip()
        for image in product.get("images", [])
        if (image.get("key") or "").strip()
    }
    if not image_keys:
        return

    for key in image_keys:
        other_reference = await db.products.find_one(
            {"_id": {"$ne": product["_id"]}, "images.key": key},
            {"_id": 1},
        )
        if other_reference:
            continue
        await delete_image_from_b2(key)


async def delete_product_record(db, product: dict) -> None:
    await db.products.delete_one({"_id": product["_id"]})
    try:
        await delete_product_images_if_unused(db, product)
    except Exception:
        # Storage cleanup is best-effort. A product that is safe to delete
        # should not remain in the database just because external image removal failed.
        pass


async def try_delete_product(db, product_id: str) -> ProductDeleteResult:
    try:
        object_id = to_object_id(product_id)
    except HTTPException:
        return ProductDeleteResult(
            productId=product_id,
            success=False,
            reason="Invalid product id.",
        )

    product = await db.products.find_one({"_id": object_id})
    if not product:
        return ProductDeleteResult(
            productId=product_id,
            success=False,
            reason="Product not found.",
        )

    await delete_product_record(db, product)

    return ProductDeleteResult(
        productId=product_id,
        productName=product.get("name"),
        success=True,
    )


def build_admin_product_filters(
    search: str | None = None,
    category: str | None = None,
    status_value: str | None = None,
    visibility: str | None = None,
    stock: str | None = None,
):
    filters = {}

    if search:
        pattern = re.escape(search.strip())
        filters["$or"] = [
            {"name": {"$regex": pattern, "$options": "i"}},
            {"sku": {"$regex": pattern, "$options": "i"}},
        ]

    if category:
        filters["categoryId"] = category if ObjectId.is_valid(category) else category

    if status_value:
        filters["status"] = status_value

    if visibility:
        filters["visibility"] = visibility

    if stock == "out_of_stock":
        filters["stock"] = 0
    elif stock == "low_stock":
        filters["$expr"] = {"$and": [{"$gt": ["$stock", 0]}, {"$lte": ["$stock", "$lowStockLimit"]}]}
    elif stock == "in_stock":
        filters["$expr"] = {"$gt": ["$stock", "$lowStockLimit"]}
    elif stock == "not_set":
        filters["name"] = "Untitled Product"

    return filters


@router.post("", status_code=status.HTTP_201_CREATED)
async def admin_create_product(
    payload: ProductCreate,
    _admin=Depends(require_permission("products.create")),
):
    db = get_database()
    now = datetime.now(timezone.utc)
    product_data = normalize_product_payload(payload.model_dump())
    product_data = await attach_category_details(db, product_data)
    if product_data.get("categoryId"):
        product_data.update(await build_sku_details(db, product_data, reserve_number=True))
    product_data = normalize_status_visibility(product_data)
    validate_visibility_rules(product_data)
    await ensure_unique_product_fields(db, product_data)
    product_data["createdAt"] = now
    product_data["updatedAt"] = now
    product_data["createdBy"] = maybe_object_id(_admin.get("id"))
    product_data["updatedBy"] = maybe_object_id(_admin.get("id"))
    result = await db.products.insert_one(product_data)
    product = await db.products.find_one({"_id": result.inserted_id})
    return serialize_document(product)


@router.get("/sku-preview")
async def get_sku_preview(
    category_id: str | None = Query(default=None, alias="categoryId"),
    category_name: str | None = Query(default=None, alias="categoryName"),
    color: str | None = Query(default=None),
    size: str | None = Query(default=None),
    material: str | None = Query(default=None),
    variant_code: str | None = Query(default=None, alias="variantCode"),
    _admin=Depends(require_permission("products.create")),
):
    db = get_database()
    details = await build_sku_details(
        db,
        {
            "categoryId": category_id,
            "categoryName": category_name,
            "color": color,
            "size": size,
            "material": material,
            "variantCode": variant_code,
        },
        reserve_number=False,
    )
    return {
        "sku": details.get("sku", ""),
        "designNumber": details.get("designNumber", 0),
        "categoryCode": details.get("categoryCode", ""),
    }


@router.post("/from-image", status_code=status.HTTP_201_CREATED)
async def admin_create_product_from_image(
    payload: ProductFromImageCreate,
    _admin=Depends(require_permission("products.create")),
):
    db = get_database()
    now = datetime.now(timezone.utc)
    product_data = build_image_only_product(payload)
    await ensure_unique_product_fields(db, product_data)
    product_data["createdAt"] = now
    product_data["updatedAt"] = now
    product_data["createdBy"] = maybe_object_id(_admin.get("id"))
    product_data["updatedBy"] = maybe_object_id(_admin.get("id"))
    result = await db.products.insert_one(product_data)
    product = await db.products.find_one({"_id": result.inserted_id})
    return serialize_document(product)


@router.get("")
async def get_admin_products(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    visibility: str | None = Query(default=None),
    stock: str | None = Query(default=None),
    _admin=Depends(require_permission("products.read")),
):
    db = get_database()
    filters = build_admin_product_filters(search, category, status_value, visibility, stock)
    products = await db.products.find(filters).sort("updatedAt", -1).to_list(length=None)
    return serialize_many(products)


@router.post("/bulk-delete")
async def admin_bulk_delete_products(
    payload: ProductBulkDeleteRequest,
    _admin=Depends(require_permission("products.delete")),
):
    db = get_database()
    unique_product_ids = list(dict.fromkeys(payload.productIds))
    results = [await try_delete_product(db, product_id) for product_id in unique_product_ids]

    deleted_count = sum(1 for result in results if result.success)
    blocked_count = len(results) - deleted_count
    return {
        "results": [result.model_dump() for result in results],
        "deletedCount": deleted_count,
        "blockedCount": blocked_count,
    }


@router.get("/{product_id}")
async def get_admin_product(
    product_id: str,
    _admin=Depends(require_permission("products.read")),
):
    db = get_database()
    product = await db.products.find_one({"_id": to_object_id(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)


@router.put("/{product_id}")
async def admin_update_product(
    product_id: str,
    payload: ProductUpdate,
    _admin=Depends(require_permission("products.update")),
):
    db = get_database()
    updates = payload.model_dump(exclude_unset=True)
    object_id = to_object_id(product_id)
    existing_product = await db.products.find_one({"_id": object_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found.")

    next_price = updates.get("price", existing_product["price"])
    next_sale_price = updates.get("salePrice", existing_product.get("salePrice"))
    if next_sale_price is not None and next_sale_price >= next_price:
        raise HTTPException(
            status_code=400,
            detail="Sale price must be less than regular price.",
        )

    updates = normalize_product_updates(updates)
    if "categoryId" in updates or "categoryName" in updates:
        resolved_category = await attach_category_details(db, {**existing_product, **updates})
        updates["categoryId"] = resolved_category["categoryId"]
        updates["categoryName"] = resolved_category["categoryName"]
    next_product = normalize_status_visibility({**existing_product, **updates})
    validate_visibility_rules(next_product)
    await ensure_unique_product_fields(db, next_product, product_id=product_id)

    updates["visibility"] = next_product["visibility"]
    updates["updatedAt"] = datetime.now(timezone.utc)
    updates["updatedBy"] = maybe_object_id(_admin.get("id"))
    await db.products.update_one({"_id": object_id}, {"$set": updates})
    product = await db.products.find_one({"_id": object_id})
    return serialize_document(product)


@router.patch("/{product_id}/visibility")
async def admin_update_product_visibility(
    product_id: str,
    payload: dict,
    _admin=Depends(require_permission("products.update")),
):
    db = get_database()
    object_id = to_object_id(product_id)
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    visibility = payload.get("visibility")
    if visibility not in {"visible", "hidden"}:
        raise HTTPException(status_code=400, detail="Invalid visibility value.")
    validate_visibility_rules({**product, "visibility": visibility})

    await db.products.update_one(
        {"_id": object_id},
        {
            "$set": {
                "visibility": visibility,
                "updatedAt": datetime.now(timezone.utc),
                "updatedBy": maybe_object_id(_admin.get("id")),
            }
        },
    )
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)


@router.patch("/{product_id}/status")
async def admin_update_product_status(
    product_id: str,
    payload: dict,
    _admin=Depends(require_admin),
):
    db = get_database()
    object_id = to_object_id(product_id)
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    status_value = payload.get("status")
    if status_value not in {"active", "draft", "archived", "deleted"}:
        raise HTTPException(status_code=400, detail="Invalid status value.")
    required_permission = "products.delete" if status_value in {"archived", "deleted"} else "products.update"
    if not has_permission(_admin, required_permission):
        raise HTTPException(
            status_code=403,
            detail=f"Missing permission: {required_permission}",
        )

    next_product = normalize_status_visibility({**product, "status": status_value})
    validate_visibility_rules(next_product)

    await db.products.update_one(
        {"_id": object_id},
        {
            "$set": {
                "status": status_value,
                "visibility": next_product["visibility"],
                "updatedAt": datetime.now(timezone.utc),
                "updatedBy": maybe_object_id(_admin.get("id")),
            }
        },
    )
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)


@router.post("/{product_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def admin_duplicate_product(
    product_id: str,
    _admin=Depends(require_permission("products.create")),
):
    db = get_database()
    source = await db.products.find_one({"_id": to_object_id(product_id)})
    if not source:
        raise HTTPException(status_code=404, detail="Product not found.")

    duplicated = {
        key: value for key, value in source.items() if key not in {"_id", "createdAt", "updatedAt"}
    }
    now = datetime.now(timezone.utc)
    duplicated["name"] = f"{source['name']} Copy"
    duplicated["slug"] = (
        f"{normalize_product_payload({**duplicated, 'name': duplicated['name']}).get('slug')}"
        f"-{uuid4().hex[:6]}"
    )
    duplicated["sku"] = ""
    duplicated["status"] = "draft"
    duplicated["visibility"] = "hidden"
    duplicated["createdAt"] = now
    duplicated["updatedAt"] = now
    duplicated["createdBy"] = maybe_object_id(_admin.get("id"))
    duplicated["updatedBy"] = maybe_object_id(_admin.get("id"))
    await ensure_unique_product_fields(db, duplicated)
    result = await db.products.insert_one(duplicated)
    product = await db.products.find_one({"_id": result.inserted_id})
    return serialize_document(product)


@router.delete("/{product_id}")
async def admin_delete_product(
    product_id: str,
    _admin=Depends(require_permission("products.delete")),
):
    db = get_database()
    result = await try_delete_product(db, product_id)
    if result.success:
        return {"message": "Product deleted successfully.", "result": result.model_dump()}
    if result.reason == "Product not found.":
        raise HTTPException(status_code=404, detail=result.reason)
    if result.reason == "Invalid product id.":
        raise HTTPException(status_code=400, detail=result.reason)
    raise HTTPException(status_code=409, detail=result.reason)


@router.post("/{product_id}/images")
async def admin_add_product_images(
    product_id: str,
    payload: dict,
    _admin=Depends(require_permission("products.update")),
):
    db = get_database()
    object_id = to_object_id(product_id)
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    new_images = [ProductImage(**image).model_dump() for image in payload.get("images", [])]
    normalized = normalize_product_payload({**product, "name": product["name"], "images": new_images})[
        "images"
    ]
    await db.products.update_one(
        {"_id": object_id},
        {
            "$push": {"images": {"$each": normalized}},
            "$set": {
                "updatedAt": datetime.now(timezone.utc),
                "updatedBy": maybe_object_id(_admin.get("id")),
            },
        },
    )
    updated = await db.products.find_one({"_id": object_id})
    return serialize_document(updated)


@router.delete("/{product_id}/images/{image_id}")
async def admin_delete_product_image(
    product_id: str,
    image_id: str,
    _admin=Depends(require_permission("products.update")),
):
    db = get_database()
    object_id = to_object_id(product_id)
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    images = [image for image in product.get("images", []) if image.get("id") != image_id]
    if len(images) == len(product.get("images", [])):
        raise HTTPException(status_code=404, detail="Image not found.")
    if images and not any(image.get("isPrimary") for image in images):
        images[0]["isPrimary"] = True

    await db.products.update_one(
        {"_id": object_id},
        {
            "$set": {
                "images": images,
                "updatedAt": datetime.now(timezone.utc),
                "updatedBy": maybe_object_id(_admin.get("id")),
            }
        },
    )
    updated = await db.products.find_one({"_id": object_id})
    return serialize_document(updated)


@router.patch("/{product_id}/images/primary")
async def admin_set_primary_product_image(
    product_id: str,
    payload: dict,
    _admin=Depends(require_permission("products.update")),
):
    db = get_database()
    object_id = to_object_id(product_id)
    image_id = payload.get("imageId")
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    found = False
    images = []
    for image in product.get("images", []):
        is_primary = image.get("id") == image_id
        found = found or is_primary
        images.append({**image, "isPrimary": is_primary})
    if not found:
        raise HTTPException(status_code=404, detail="Image not found.")

    await db.products.update_one(
        {"_id": object_id},
        {
            "$set": {
                "images": images,
                "updatedAt": datetime.now(timezone.utc),
                "updatedBy": maybe_object_id(_admin.get("id")),
            }
        },
    )
    updated = await db.products.find_one({"_id": object_id})
    return serialize_document(updated)
