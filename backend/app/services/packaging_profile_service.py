from datetime import datetime, timezone

from bson import ObjectId


DEFAULT_PACKAGING_PROFILES = [
    {
        "name": "Standard Core",
        "description": "Everyday catalog pieces and standard fulfilment.",
        "defaultCost": 2,
        "currency": "AED",
        "sortOrder": 10,
        "recommendationRules": [{"key": "workflowStatus", "operator": "not_equals", "value": "published"}],
    },
    {
        "name": "Premium Finish",
        "description": "Published pieces and elevated presentation.",
        "defaultCost": 5,
        "currency": "AED",
        "sortOrder": 20,
        "recommendationRules": [{"key": "workflowStatus", "operator": "equals", "value": "published"}],
    },
    {
        "name": "Gift Box",
        "description": "Gift-led occasions and gifting tags.",
        "defaultCost": 6,
        "currency": "AED",
        "sortOrder": 30,
        "recommendationRules": [{"key": "occasion", "operator": "equals", "value": "Gift"}],
    },
    {
        "name": "Luxury Bridal",
        "description": "Wedding and premium presentation items.",
        "defaultCost": 10,
        "currency": "AED",
        "sortOrder": 40,
        "recommendationRules": [{"key": "occasion", "operator": "equals", "value": "Wedding"}],
    },
]


def serialize_packaging_profile(profile: dict) -> dict:
    return {
        **profile,
        "id": str(profile["_id"]),
        "_id": str(profile["_id"]),
        "createdBy": str(profile["createdBy"]) if profile.get("createdBy") else None,
        "updatedBy": str(profile["updatedBy"]) if profile.get("updatedBy") else None,
    }


def normalize_packaging_profile_payload(payload: dict) -> dict:
    recommendation_rules = payload.get("recommendationRules") or []
    return {
        "name": (payload.get("name") or "").strip(),
        "description": (payload.get("description") or "").strip(),
        "defaultCost": max(0, float(payload.get("defaultCost") or 0)),
        "currency": (payload.get("currency") or "AED").strip().upper(),
        "active": bool(payload.get("active", True)),
        "sortOrder": max(0, int(payload.get("sortOrder") or 0)),
        "recommendationRules": recommendation_rules,
    }


def maybe_object_id(value: str | None) -> ObjectId | None:
    if value and ObjectId.is_valid(value):
        return ObjectId(value)
    return None


async def ensure_default_packaging_profiles(db) -> None:
    existing_count = await db.packaging_profiles.count_documents({})
    if existing_count:
        return

    now = datetime.now(timezone.utc)
    documents = [
        {
            **normalize_packaging_profile_payload(profile),
            "createdAt": now,
            "updatedAt": now,
            "createdBy": None,
            "updatedBy": None,
        }
        for profile in DEFAULT_PACKAGING_PROFILES
    ]
    if documents:
        await db.packaging_profiles.insert_many(documents)
