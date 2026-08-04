import re

from bson import ObjectId
from pymongo import ASCENDING, ReturnDocument

DEFAULT_CATEGORY_CODES = [
    {"name": "Earrings", "code": "ER", "slug": "earrings", "sortOrder": 1},
    {"name": "Necklace", "code": "NK", "slug": "necklace", "sortOrder": 2},
    {"name": "Bracelet", "code": "BR", "slug": "bracelet", "sortOrder": 3},
    {"name": "Ring", "code": "RG", "slug": "ring", "sortOrder": 4},
    {"name": "Anklet", "code": "AN", "slug": "anklet", "sortOrder": 5},
    {"name": "Pendant", "code": "PD", "slug": "pendant", "sortOrder": 6},
    {"name": "Jewellery Set", "code": "JS", "slug": "jewellery-set", "sortOrder": 7},
    {"name": "Other", "code": "OT", "slug": "other", "sortOrder": 8},
]

DEFAULT_VARIANT_CODES = [
    {"name": "Gold", "code": "GD", "type": "color", "sortOrder": 1},
    {"name": "Silver", "code": "SV", "type": "color", "sortOrder": 2},
    {"name": "Rose Gold", "code": "RG", "type": "color", "sortOrder": 3},
    {"name": "Black", "code": "BK", "type": "color", "sortOrder": 4},
    {"name": "White", "code": "WH", "type": "color", "sortOrder": 5},
    {"name": "Multicolor", "code": "MC", "type": "color", "sortOrder": 6},
]


def normalize_alpha_code(value: str, *, min_length: int = 2, max_length: int = 4) -> str:
    code = re.sub(r"[^A-Za-z]+", "", (value or "").upper())
    if len(code) < min_length:
        return ""
    return code[:max_length]


def normalize_size_code(value: str | None) -> str:
    text = (value or "").strip().upper()
    if not text:
        return ""
    digits = re.sub(r"[^0-9]+", "", text)
    if digits:
        return digits[-2:].zfill(2)
    return re.sub(r"[^A-Z0-9]+", "", text)[:4]


def normalize_label(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def compose_sku(*, category_code: str, design_number: int, suffix_codes: list[str]) -> str:
    parts = ["NV", category_code, f"{int(design_number):03d}"]
    parts.extend([code for code in suffix_codes if code])
    return "-".join(parts)


async def ensure_sku_indexes(db):
    await db.products.create_index(
        [("normalizedSku", ASCENDING)],
        unique=True,
        sparse=True,
        name="uq_products_normalized_sku",
    )
    await db.categories.create_index(
        [("code", ASCENDING)],
        unique=True,
        sparse=True,
        name="uq_categories_code",
    )
    await db.variant_codes.create_index(
        [("code", ASCENDING)],
        unique=True,
        sparse=True,
        name="uq_variant_codes_code",
    )
    await db.sku_counters.create_index(
        [("categoryCode", ASCENDING)],
        unique=True,
        name="uq_sku_counters_category_code",
    )


async def ensure_default_sku_reference_data(db):
    for category in DEFAULT_CATEGORY_CODES:
        await db.categories.update_one(
            {"name": category["name"]},
            {
                "$setOnInsert": {
                    "description": None,
                    "imageUrl": None,
                    "isActive": True,
                    "createdAt": None,
                },
                "$set": {
                    "code": category["code"],
                    "slug": category["slug"],
                    "sortOrder": category["sortOrder"],
                    "updatedAt": None,
                },
            },
            upsert=True,
        )

    for variant in DEFAULT_VARIANT_CODES:
        await db.variant_codes.update_one(
            {"name": variant["name"]},
            {
                "$set": {
                    "code": variant["code"],
                    "type": variant["type"],
                    "sortOrder": variant["sortOrder"],
                    "isActive": True,
                },
                "$setOnInsert": {"description": None, "createdAt": None, "updatedAt": None},
            },
            upsert=True,
        )


async def get_variant_code_lookup(db) -> dict[tuple[str, str], str]:
    variant_codes = await db.variant_codes.find({"isActive": True}).to_list(length=None)
    lookup = {}
    for item in variant_codes:
        item_type = str(item.get("type") or "other").strip().lower()
        name = normalize_label(item.get("name"))
        code = normalize_alpha_code(item.get("code"), max_length=4)
        if name and code:
            lookup[(item_type, name.lower())] = code
    return lookup


async def resolve_category_code(db, *, category_id: str | None, category_name: str | None) -> str:
    category = None
    if category_id:
        if ObjectId.is_valid(category_id):
            category = await db.categories.find_one({"_id": ObjectId(category_id)})
        else:
            category = await db.categories.find_one({"_id": category_id})
    if not category and category_name:
        category = await db.categories.find_one({"name": normalize_label(category_name)})

    if not category:
        return ""

    return normalize_alpha_code(category.get("code"), max_length=3)


async def get_existing_max_design_number(db, category_code: str) -> int:
    max_value = 0
    products = await db.products.find(
        {"$or": [{"categoryCode": category_code}, {"sku": {"$regex": f"^NV-{category_code}-"}}]},
        {"designNumber": 1, "sku": 1},
    ).to_list(length=None)

    for product in products:
        design_number = int(product.get("designNumber") or 0)
        if design_number > max_value:
            max_value = design_number
            continue

        sku = str(product.get("sku") or "").upper()
        match = re.match(rf"^NV-{re.escape(category_code)}-(\d{{3,}})", sku)
        if match:
            max_value = max(max_value, int(match.group(1)))

    return max_value


async def get_next_design_number_preview(db, category_code: str) -> int:
    counter = await db.sku_counters.find_one({"categoryCode": category_code})
    counter_value = int(counter.get("lastUsedNumber") or 0) if counter else 0
    existing_value = await get_existing_max_design_number(db, category_code)
    return max(counter_value, existing_value) + 1


async def reserve_design_number(db, category_code: str) -> int:
    existing_value = await get_existing_max_design_number(db, category_code)
    await db.sku_counters.update_one(
        {"categoryCode": category_code},
        {"$setOnInsert": {"categoryCode": category_code, "lastUsedNumber": existing_value}},
        upsert=True,
    )
    if existing_value:
        await db.sku_counters.update_one(
            {"categoryCode": category_code, "lastUsedNumber": {"$lt": existing_value}},
            {"$set": {"lastUsedNumber": existing_value}},
        )
    counter = await db.sku_counters.find_one_and_update(
        {"categoryCode": category_code},
        {"$inc": {"lastUsedNumber": 1}},
        return_document=ReturnDocument.AFTER,
    )
    return int(counter.get("lastUsedNumber") or 0)


async def build_sku_details(db, payload: dict, *, reserve_number: bool) -> dict:
    category_code = await resolve_category_code(
        db,
        category_id=payload.get("categoryId"),
        category_name=payload.get("categoryName"),
    )
    if not category_code:
        return {"sku": "", "normalizedSku": None, "designNumber": 0, "categoryCode": ""}

    variant_lookup = await get_variant_code_lookup(db)
    color = normalize_label(payload.get("color"))
    material = normalize_label(payload.get("material"))
    custom_variant_code = normalize_alpha_code(payload.get("variantCode"), max_length=4)
    size_code = normalize_size_code(payload.get("size"))

    suffix_codes = []
    if color:
        suffix_codes.append(
            variant_lookup.get(("color", color.lower())) or normalize_alpha_code(color, max_length=2)
        )
    if material:
        material_code = variant_lookup.get(("material", material.lower()))
        if material_code:
            suffix_codes.append(material_code)
    if custom_variant_code:
        suffix_codes.append(custom_variant_code)
    if size_code:
        suffix_codes.append(size_code)

    design_number = (
        await reserve_design_number(db, category_code)
        if reserve_number
        else await get_next_design_number_preview(db, category_code)
    )
    sku = compose_sku(
        category_code=category_code,
        design_number=design_number,
        suffix_codes=[code for code in suffix_codes if code],
    )
    return {
        "sku": sku,
        "normalizedSku": sku.upper(),
        "designNumber": design_number,
        "categoryCode": category_code,
    }
