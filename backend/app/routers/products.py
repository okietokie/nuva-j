from datetime import datetime, timezone
import re
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db.mongodb import get_database
from app.dependencies.auth import require_admin, require_permission
from app.core.sku import build_sku_details
from app.schemas.product import ProductCreate, ProductFromImageCreate, ProductUpdate, StockUpdate
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/products", tags=["Products"])


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid product id.")
    return ObjectId(value)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "product"


def maybe_object_id(value: str | None) -> ObjectId | None:
    if value and ObjectId.is_valid(value):
        return ObjectId(value)
    return None


def build_stock_movement(
    *,
    movement_type: str,
    previous_stock: int,
    new_stock: int,
    actor_id: str | None = None,
    actor_name: str | None = None,
    note: str | None = None,
    order_id: str | None = None,
) -> dict:
    return {
        "type": movement_type,
        "previousStock": max(0, int(previous_stock)),
        "newStock": max(0, int(new_stock)),
        "quantityChange": int(new_stock) - int(previous_stock),
        "note": (note or "").strip() or None,
        "actorId": actor_id,
        "actorName": actor_name,
        "orderId": order_id,
        "createdAt": datetime.now(timezone.utc),
    }


def calculate_suggested_selling_price(total_product_cost: float, profit_percentage: float = 35) -> float:
    safe_total_product_cost = max(0, float(total_product_cost or 0))
    safe_profit_percentage = max(0, float(profit_percentage or 0))
    if safe_total_product_cost <= 0:
        return 0.0

    return round(safe_total_product_cost * (1 + safe_profit_percentage / 100), 2)


def normalize_product_payload(payload: dict) -> dict:
    name = (payload.get("name") or "").strip()
    if name:
        payload["name"] = name

    payload["slug"] = slugify(payload.get("slug") or payload["name"])
    payload["categoryName"] = (payload.get("categoryName") or "").strip()
    payload["categoryCode"] = (payload.get("categoryCode") or "").strip().upper()
    payload["currency"] = payload.get("currency", "INR").upper()
    payload["sku"] = (payload.get("sku") or "").strip().upper()
    payload["normalizedSku"] = payload["sku"] or None
    payload["supplierId"] = (payload.get("supplierId") or "").strip() or None
    payload["supplierName"] = (payload.get("supplierName") or "").strip()
    payload["purchaseBatchId"] = (payload.get("purchaseBatchId") or "").strip() or None
    payload["packagingProfileId"] = (payload.get("packagingProfileId") or "").strip()
    payload["packagingProfileLabel"] = (payload.get("packagingProfileLabel") or "").strip()
    payload["packagingCostSource"] = (
        (payload.get("packagingCostSource") or "custom").strip() or "custom"
    )
    payload["material"] = (payload.get("material") or "").strip()
    payload["color"] = (payload.get("color") or "").strip()
    payload["variantName"] = (payload.get("variantName") or "").strip() or None
    payload["variantCode"] = (payload.get("variantCode") or "").strip().upper() or None
    payload["designNumber"] = max(0, int(payload.get("designNumber") or 0))
    payload["quantityPurchased"] = max(0, int(payload.get("quantityPurchased") or 0))
    payload["stockMovements"] = payload.get("stockMovements", [])
    payload["purchaseUnitCost"] = max(0, float(payload.get("purchaseUnitCost") or 0))
    payload["purchaseTotalCost"] = max(0, float(payload.get("purchaseTotalCost") or 0))
    payload["directProductExpense"] = max(0, float(payload.get("directProductExpense") or 0))
    payload["allocatedBatchExpense"] = max(0, float(payload.get("allocatedBatchExpense") or 0))
    payload["packagingCost"] = max(0, float(payload.get("packagingCost") or 0))
    payload["totalProductCost"] = max(0, float(payload.get("totalProductCost") or 0))
    payload["profitPercentage"] = max(0, float(payload.get("profitPercentage") or 35))
    payload["suggestedSellingPrice"] = calculate_suggested_selling_price(
        payload["totalProductCost"],
        payload["profitPercentage"],
    )

    for key in ("size", "weight", "plating", "stoneType", "occasion", "careInstructions"):
        if payload.get(key):
            payload[key] = payload[key].strip()

    payload["tags"] = sorted(
        {
            tag.strip().lower()
            for tag in payload.get("tags", [])
            if isinstance(tag, str) and tag.strip()
        }
    )

    images = payload.get("images", [])
    normalized_images = []
    for index, image in enumerate(images):
        normalized_images.append(
            {
                "id": image.get("id") or uuid4().hex,
                "url": image["url"].strip(),
                "key": image.get("key", "").strip(),
                "alt": image.get("alt", "").strip() or payload["name"],
                "isPrimary": bool(image.get("isPrimary", index == 0)),
            }
        )

    if normalized_images and not any(image["isPrimary"] for image in normalized_images):
        normalized_images[0]["isPrimary"] = True

    payload["images"] = normalized_images
    return payload


def normalize_product_updates(updates: dict) -> dict:
    normalized = dict(updates)

    if "name" in normalized and normalized["name"]:
        normalized["name"] = normalized["name"].strip()

    if "name" in normalized and "slug" not in normalized:
        normalized["slug"] = slugify(normalized["name"])

    if "slug" in normalized:
        base_name = normalized.get("name") or normalized.get("slug")
        normalized["slug"] = slugify(base_name)

    if "categoryName" in normalized and normalized["categoryName"]:
        normalized["categoryName"] = normalized["categoryName"].strip()

    if "categoryCode" in normalized and normalized["categoryCode"]:
        normalized["categoryCode"] = normalized["categoryCode"].strip().upper()

    if "currency" in normalized and normalized["currency"]:
        normalized["currency"] = normalized["currency"].upper()

    if "sku" in normalized and normalized["sku"]:
        normalized["sku"] = normalized["sku"].strip().upper()
        normalized["normalizedSku"] = normalized["sku"]
    elif "sku" in normalized and not normalized["sku"]:
        normalized["normalizedSku"] = None

    for key in ("supplierId", "purchaseBatchId"):
        if key in normalized:
            normalized[key] = (normalized[key] or "").strip() or None

    for key in ("supplierName", "packagingProfileId", "packagingProfileLabel", "packagingCostSource"):
        if key in normalized and isinstance(normalized[key], str):
            normalized[key] = normalized[key].strip()

    for key in (
        "material",
        "color",
        "size",
        "variantName",
        "variantCode",
        "weight",
        "plating",
        "stoneType",
        "occasion",
            "careInstructions",
    ):
        if key in normalized and isinstance(normalized[key], str):
            normalized[key] = normalized[key].strip()

    for key in (
        "quantityPurchased",
        "purchaseUnitCost",
        "purchaseTotalCost",
        "directProductExpense",
        "allocatedBatchExpense",
        "packagingCost",
        "totalProductCost",
        "profitPercentage",
        "suggestedSellingPrice",
    ):
        if key in normalized and normalized[key] is not None:
            numeric_value = float(normalized[key])
            normalized[key] = int(numeric_value) if key == "quantityPurchased" else numeric_value

    if "tags" in normalized:
        normalized["tags"] = sorted(
            {
                tag.strip().lower()
                for tag in normalized["tags"]
                if isinstance(tag, str) and tag.strip()
            }
        )

    if "images" in normalized:
        normalized["images"] = normalize_product_payload(
            {
                "name": normalized.get("name") or "Product",
                "categoryName": normalized.get("categoryName") or "Uncategorized",
                "sku": normalized.get("sku") or "TEMP-SKU",
                "material": normalized.get("material") or "Not specified",
                "color": normalized.get("color") or "Not specified",
                "images": normalized["images"],
            }
        )["images"]

    return normalized


async def attach_category_details(db, payload: dict) -> dict:
    category_id = payload.get("categoryId")
    category_name = payload.get("categoryName")
    category = None

    if category_id and ObjectId.is_valid(category_id):
        category = await db.categories.find_one({"_id": ObjectId(category_id)})
    elif category_name:
        category = await db.categories.find_one({"name": category_name})

    if not category:
        if payload.get("status") == "draft":
            payload["categoryId"] = ""
            payload["categoryName"] = ""
            return payload
        raise HTTPException(status_code=400, detail="Selected category does not exist.")

    payload["categoryId"] = str(category["_id"])
    payload["categoryName"] = category["name"]
    payload["categoryCode"] = category.get("code", "")
    return payload


def build_image_only_product(payload: ProductFromImageCreate) -> dict:
    image_alt = (payload.imageAlt or "Untitled Product").strip() or "Untitled Product"
    draft_slug = f"untitled-product-{uuid4().hex[:8]}"
    return normalize_product_payload(
        {
            "name": "Untitled Product",
            "slug": draft_slug,
            "description": "",
            "categoryId": "",
            "categoryName": "",
            "categoryCode": "",
            "price": 0,
            "salePrice": None,
            "currency": "INR",
            "images": [
                {
                    "url": payload.imageUrl,
                    "key": payload.imageKey,
                    "alt": image_alt,
                    "isPrimary": True,
                }
            ],
            "stock": 0,
            "lowStockLimit": 0,
            "sku": "",
            "taxIncluded": True,
            "allowBackorder": False,
            "material": "",
            "plating": None,
            "stoneType": None,
            "color": "",
            "size": None,
            "variantName": None,
            "variantCode": None,
            "weight": None,
            "occasion": None,
            "careInstructions": None,
            "tags": [],
            "status": "draft",
            "visibility": "hidden",
            "isFeatured": False,
            "isBestSeller": False,
            "isNewArrival": False,
        }
    )


async def ensure_unique_product_fields(
    db,
    payload: dict,
    product_id: str | None = None,
):
    exclude_filter = {"$ne": to_object_id(product_id)} if product_id else None

    slug = (payload.get("slug") or "").strip()
    if slug:
        slug_filter = {"slug": slug}
        if exclude_filter:
            slug_filter["_id"] = exclude_filter
        existing_slug = await db.products.find_one(slug_filter)
        if existing_slug:
            raise HTTPException(status_code=400, detail="Slug must be unique.")

    sku = (payload.get("sku") or "").strip()
    if sku:
        sku_filter = {"normalizedSku": sku.upper()}
        if exclude_filter:
            sku_filter["_id"] = exclude_filter
        existing_sku = await db.products.find_one(sku_filter)
        if existing_sku:
            raise HTTPException(status_code=400, detail="SKU must be unique.")


def validate_visibility_rules(payload: dict):
    if payload.get("visibility") != "visible":
        return

    if not (payload.get("name") or "").strip():
        raise HTTPException(status_code=400, detail="Product cannot be visible if name is missing.")
    if not (payload.get("categoryName") or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Product cannot be visible if category is missing.",
        )
    if not payload.get("images"):
        raise HTTPException(status_code=400, detail="Product cannot be visible if no image exists.")
    if not payload.get("price"):
        raise HTTPException(status_code=400, detail="Product cannot be visible if price is missing.")


def normalize_status_visibility(payload: dict):
    if payload.get("status") in {"archived", "deleted"}:
        payload["visibility"] = "hidden"
    return payload


@router.get("")
async def get_all_products(category: str | None = Query(default=None)):
    db = get_database()
    filters = {"status": "active", "visibility": "visible"}
    if category:
        filters["categoryName"] = category
    products = await db.products.find(filters).sort("createdAt", -1).to_list(length=None)
    return serialize_many(products)


@router.get("/admin/list")
async def get_admin_products(
    include_archived: bool = Query(default=False),
    include_deleted: bool = Query(default=False),
    _admin=Depends(require_admin),
):
    db = get_database()
    filters = {}
    excluded_statuses = []
    if not include_archived:
        excluded_statuses.append("archived")
    if not include_deleted:
        excluded_statuses.append("deleted")
    if excluded_statuses:
        filters["status"] = {"$nin": excluded_statuses}

    products = await db.products.find(filters).sort("updatedAt", -1).to_list(length=None)
    return serialize_many(products)


@router.get("/admin/{product_id}")
async def get_admin_product(product_id: str, _admin=Depends(require_admin)):
    db = get_database()
    product = await db.products.find_one({"_id": to_object_id(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)


@router.get("/{product_slug}")
async def get_single_product(product_slug: str):
    db = get_database()
    product = await db.products.find_one(
        {"slug": product_slug, "status": "active", "visibility": "visible"}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return serialize_document(product)


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
        resolved_category = await attach_category_details(
            db,
            {**existing_product, **updates},
        )
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


@router.delete("/{product_id}")
async def admin_delete_product(
    product_id: str,
    _admin=Depends(require_permission("products.delete")),
):
    db = get_database()
    object_id = to_object_id(product_id)
    result = await db.products.update_one(
        {"_id": object_id},
        {
            "$set": {
                "status": "deleted",
                "visibility": "hidden",
                "updatedAt": datetime.now(timezone.utc),
                "updatedBy": maybe_object_id(_admin.get("id")),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found.")
    return {"message": "Product moved to deleted status."}


@router.patch("/{product_id}/stock")
async def admin_update_stock(
    product_id: str,
    payload: StockUpdate,
    _admin=Depends(require_permission("inventory.update")),
):
    db = get_database()
    object_id = to_object_id(product_id)
    product = await db.products.find_one({"_id": object_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    previous_stock = int(product.get("stock", 0))
    next_stock = int(payload.stock)
    movement = build_stock_movement(
        movement_type=payload.movementType,
        previous_stock=previous_stock,
        new_stock=next_stock,
        actor_id=_admin.get("id"),
        actor_name=_admin.get("email") or _admin.get("name"),
        note=payload.note,
    )

    await db.products.update_one(
        {"_id": object_id},
        {
            "$push": {
                "stockMovements": {
                    "$each": [movement],
                    "$slice": -20,
                }
            },
            "$set": {
                "stock": next_stock,
                "updatedAt": datetime.now(timezone.utc),
                "updatedBy": maybe_object_id(_admin.get("id")),
            }
        },
    )
    product = await db.products.find_one({"_id": object_id})
    return serialize_document(product)
