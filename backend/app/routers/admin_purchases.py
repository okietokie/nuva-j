from datetime import datetime, timezone
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db.mongodb import get_database
from app.dependencies.auth import require_permission
from app.routers.products import calculate_suggested_selling_price, maybe_object_id
from app.schemas.purchase import (
    PurchaseBatchCreate,
    PurchaseBatchUpdate,
    SupplierCreate,
    SupplierUpdate,
)
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/admin/purchases", tags=["Admin Purchases"])


def to_object_id(value: str, detail: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=detail)
    return ObjectId(value)


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def normalize_supplier_payload(payload: dict) -> dict:
    normalized = dict(payload)
    normalized["name"] = payload["name"].strip()
    for key in ("contactPerson", "email", "phone", "whatsapp", "address", "city", "country", "notes"):
        normalized[key] = normalize_text(payload.get(key))
    return normalized


async def ensure_unique_supplier_name(db, name: str, supplier_id: str | None = None):
    filter_query = {"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}
    if supplier_id:
        filter_query["_id"] = {"$ne": to_object_id(supplier_id, "Invalid supplier id.")}
    existing = await db.suppliers.find_one(filter_query)
    if existing:
        raise HTTPException(status_code=400, detail="Supplier name must be unique.")


async def resolve_supplier(db, supplier_id: str) -> dict:
    supplier = await db.suppliers.find_one({"_id": to_object_id(supplier_id, "Invalid supplier id.")})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return supplier


def normalize_purchase_item(item: dict) -> dict:
    quantity = int(item["quantity"])
    unit_cost = float(item["unitCost"])
    return {
        "productId": item.get("productId") or "",
        "productName": item["productName"].strip(),
        "quantity": quantity,
        "unitCost": unit_cost,
        "totalPurchaseCost": round(quantity * unit_cost, 2),
        "categoryName": normalize_text(item.get("categoryName")) or "",
        "sku": (item.get("sku") or "").strip().upper(),
        "notes": normalize_text(item.get("notes")) or "",
        "manualAllocatedSharedExpense": float(item.get("manualAllocatedSharedExpense") or 0),
        "allocatedSharedExpense": 0.0,
    }


def allocate_shared_expense(items: list[dict], total_shared_expense: float, allocation_method: str) -> list[dict]:
    if not items:
        return items

    if total_shared_expense <= 0:
        for item in items:
            item["allocatedSharedExpense"] = 0.0
        return items

    if allocation_method == "manual":
        allocated_total = sum(float(item.get("manualAllocatedSharedExpense", 0)) for item in items)
        if round(allocated_total, 2) != round(total_shared_expense, 2):
            raise HTTPException(
                status_code=400,
                detail="Manual shared expense allocations must add up to the total shared expense.",
            )
        for item in items:
            item["allocatedSharedExpense"] = round(float(item.get("manualAllocatedSharedExpense", 0)), 2)
        return items

    if allocation_method == "equal":
        base_share = round(total_shared_expense / len(items), 2)
        remainder = round(total_shared_expense - (base_share * len(items)), 2)
        for index, item in enumerate(items):
            item["allocatedSharedExpense"] = base_share + (remainder if index == len(items) - 1 else 0)
        return items

    if allocation_method == "quantity":
        divisor = sum(item["quantity"] for item in items)
    else:
        divisor = sum(item["totalPurchaseCost"] for item in items)

    if divisor <= 0:
        raise HTTPException(status_code=400, detail="Unable to allocate shared expense with zero-value items.")

    running_total = 0.0
    for index, item in enumerate(items):
        weight = item["quantity"] if allocation_method == "quantity" else item["totalPurchaseCost"]
        share = round(total_shared_expense * (weight / divisor), 2)
        running_total += share
        item["allocatedSharedExpense"] = share

    difference = round(total_shared_expense - running_total, 2)
    items[-1]["allocatedSharedExpense"] = round(items[-1]["allocatedSharedExpense"] + difference, 2)
    return items


def normalize_purchase_batch_payload(payload: dict, supplier: dict) -> dict:
    normalized = dict(payload)
    items = [normalize_purchase_item(item) for item in payload.get("items", [])]
    total_shared_expense = round(
        float(payload.get("transportExpense", 0))
        + float(payload.get("supplierDeliveryExpense", 0))
        + float(payload.get("customsExpense", 0))
        + float(payload.get("otherSharedExpense", 0)),
        2,
    )
    items = allocate_shared_expense(items, total_shared_expense, payload.get("allocationMethod", "value"))
    total_purchase_value = round(sum(item["totalPurchaseCost"] for item in items), 2)

    normalized["supplierId"] = str(supplier["_id"])
    normalized["supplierName"] = supplier["name"]
    normalized["invoiceNumber"] = normalize_text(payload.get("invoiceNumber"))
    normalized["paymentMethod"] = normalize_text(payload.get("paymentMethod"))
    normalized["receiptImageUrl"] = normalize_text(payload.get("receiptImageUrl"))
    normalized["notes"] = normalize_text(payload.get("notes"))
    normalized["transportExpense"] = round(float(payload.get("transportExpense", 0)), 2)
    normalized["supplierDeliveryExpense"] = round(float(payload.get("supplierDeliveryExpense", 0)), 2)
    normalized["customsExpense"] = round(float(payload.get("customsExpense", 0)), 2)
    normalized["otherSharedExpense"] = round(float(payload.get("otherSharedExpense", 0)), 2)
    normalized["totalSharedExpense"] = total_shared_expense
    normalized["allocationMethod"] = payload.get("allocationMethod", "value")
    normalized["items"] = items
    normalized["totalPurchaseValue"] = total_purchase_value
    normalized["grandTotal"] = round(total_purchase_value + total_shared_expense, 2)
    return normalized


async def sync_batch_products(db, batch_id: str, batch_data: dict, admin_user: dict):
    for item in batch_data.get("items", []):
        product_id = item.get("productId")
        if not product_id or not ObjectId.is_valid(product_id):
            continue

        product = await db.products.find_one(
            {"_id": ObjectId(product_id)},
            {"profitPercentage": 1, "suggestedSellingPrice": 1, "totalProductCost": 1},
        )
        existing_total_product_cost = float((product or {}).get("totalProductCost") or 0)
        existing_suggested_selling_price = float((product or {}).get("suggestedSellingPrice") or 0)
        derived_profit_percentage = (
            ((existing_suggested_selling_price / existing_total_product_cost) - 1) * 100
            if existing_total_product_cost > 0 and existing_suggested_selling_price > 0
            else 35
        )
        profit_percentage = max(0, float((product or {}).get("profitPercentage") or derived_profit_percentage))

        total_product_cost = round(
            float(item["totalPurchaseCost"])
            + float(item.get("allocatedSharedExpense", 0))
            + float(item.get("manualAllocatedSharedExpense", 0)),
            2,
        )
        suggested_selling_price = calculate_suggested_selling_price(total_product_cost, profit_percentage)

        await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {
                "$set": {
                    "supplierId": batch_data["supplierId"],
                    "supplierName": batch_data["supplierName"],
                    "purchaseBatchId": batch_id,
                    "purchaseDate": batch_data["purchaseDate"],
                    "quantityPurchased": int(item["quantity"]),
                    "purchaseUnitCost": float(item["unitCost"]),
                    "purchaseTotalCost": float(item["totalPurchaseCost"]),
                    "allocatedBatchExpense": float(item.get("allocatedSharedExpense", 0)),
                    "totalProductCost": total_product_cost,
                    "profitPercentage": round(profit_percentage, 2),
                    "suggestedSellingPrice": suggested_selling_price,
                    "updatedAt": datetime.now(timezone.utc),
                    "updatedBy": maybe_object_id(admin_user.get("id")),
                }
            },
        )


@router.get("/suppliers")
async def get_suppliers(
    active_only: bool = Query(default=False),
    _admin=Depends(require_permission("purchases.read")),
):
    db = get_database()
    filter_query = {"isActive": True} if active_only else {}
    suppliers = await db.suppliers.find(filter_query).sort([("name", 1)]).to_list(length=None)
    return serialize_many(suppliers)


@router.post("/suppliers", status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    _admin=Depends(require_permission("purchases.manage")),
):
    db = get_database()
    supplier_data = normalize_supplier_payload(payload.model_dump())
    await ensure_unique_supplier_name(db, supplier_data["name"])
    now = datetime.now(timezone.utc)
    supplier_data["createdAt"] = now
    supplier_data["updatedAt"] = now
    supplier_data["createdBy"] = maybe_object_id(_admin.get("id"))
    supplier_data["updatedBy"] = maybe_object_id(_admin.get("id"))
    result = await db.suppliers.insert_one(supplier_data)
    supplier = await db.suppliers.find_one({"_id": result.inserted_id})
    return serialize_document(supplier)


@router.get("/suppliers/{supplier_id}")
async def get_supplier(
    supplier_id: str,
    _admin=Depends(require_permission("purchases.read")),
):
    db = get_database()
    supplier = await db.suppliers.find_one({"_id": to_object_id(supplier_id, "Invalid supplier id.")})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return serialize_document(supplier)


@router.put("/suppliers/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    _admin=Depends(require_permission("purchases.manage")),
):
    db = get_database()
    object_id = to_object_id(supplier_id, "Invalid supplier id.")
    existing = await db.suppliers.find_one({"_id": object_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    updates = normalize_supplier_payload(payload.model_dump(exclude_unset=True))
    if "name" in updates and updates["name"]:
        await ensure_unique_supplier_name(db, updates["name"], supplier_id=supplier_id)
    updates["updatedAt"] = datetime.now(timezone.utc)
    updates["updatedBy"] = maybe_object_id(_admin.get("id"))
    await db.suppliers.update_one({"_id": object_id}, {"$set": updates})
    if "name" in updates:
        await db.purchase_batches.update_many(
            {"supplierId": supplier_id},
            {"$set": {"supplierName": updates["name"], "updatedAt": datetime.now(timezone.utc)}},
        )
    supplier = await db.suppliers.find_one({"_id": object_id})
    return serialize_document(supplier)


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    _admin=Depends(require_permission("purchases.manage")),
):
    db = get_database()
    object_id = to_object_id(supplier_id, "Invalid supplier id.")
    linked_batch = await db.purchase_batches.find_one({"supplierId": supplier_id})
    if linked_batch:
        raise HTTPException(
            status_code=400,
            detail="Supplier cannot be deleted while purchase batches are linked to it.",
        )
    result = await db.suppliers.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return {"message": "Supplier deleted successfully."}


@router.get("/batches")
async def get_purchase_batches(_admin=Depends(require_permission("purchases.read"))):
    db = get_database()
    batches = await db.purchase_batches.find().sort([("purchaseDate", -1), ("createdAt", -1)]).to_list(
        length=None
    )
    return serialize_many(batches)


@router.post("/batches", status_code=status.HTTP_201_CREATED)
async def create_purchase_batch(
    payload: PurchaseBatchCreate,
    _admin=Depends(require_permission("purchases.manage")),
):
    db = get_database()
    supplier = await resolve_supplier(db, payload.supplierId)
    batch_data = normalize_purchase_batch_payload(payload.model_dump(), supplier)
    now = datetime.now(timezone.utc)
    batch_data["createdAt"] = now
    batch_data["updatedAt"] = now
    batch_data["createdBy"] = maybe_object_id(_admin.get("id"))
    batch_data["updatedBy"] = maybe_object_id(_admin.get("id"))
    result = await db.purchase_batches.insert_one(batch_data)
    await sync_batch_products(db, str(result.inserted_id), batch_data, _admin)
    batch = await db.purchase_batches.find_one({"_id": result.inserted_id})
    return serialize_document(batch)


@router.get("/batches/{batch_id}")
async def get_purchase_batch(
    batch_id: str,
    _admin=Depends(require_permission("purchases.read")),
):
    db = get_database()
    batch = await db.purchase_batches.find_one({"_id": to_object_id(batch_id, "Invalid purchase batch id.")})
    if not batch:
        raise HTTPException(status_code=404, detail="Purchase batch not found.")
    return serialize_document(batch)


@router.put("/batches/{batch_id}")
async def update_purchase_batch(
    batch_id: str,
    payload: PurchaseBatchUpdate,
    _admin=Depends(require_permission("purchases.manage")),
):
    db = get_database()
    object_id = to_object_id(batch_id, "Invalid purchase batch id.")
    existing = await db.purchase_batches.find_one({"_id": object_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase batch not found.")

    next_payload = {**existing, **payload.model_dump(exclude_unset=True)}
    supplier = await resolve_supplier(db, next_payload["supplierId"])
    batch_data = normalize_purchase_batch_payload(next_payload, supplier)
    batch_data.pop("_id", None)
    batch_data.pop("id", None)
    batch_data.pop("createdAt", None)
    batch_data.pop("createdBy", None)
    batch_data["updatedAt"] = datetime.now(timezone.utc)
    batch_data["updatedBy"] = maybe_object_id(_admin.get("id"))
    await db.purchase_batches.update_one({"_id": object_id}, {"$set": batch_data})
    await sync_batch_products(db, batch_id, {**existing, **batch_data}, _admin)
    batch = await db.purchase_batches.find_one({"_id": object_id})
    return serialize_document(batch)
