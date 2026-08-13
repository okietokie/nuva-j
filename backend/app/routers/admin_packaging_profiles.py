from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_database
from app.dependencies.auth import require_permission
from app.schemas.packaging_profile import PackagingProfileCreate, PackagingProfileUpdate
from app.services.packaging_profile_service import (
    maybe_object_id,
    normalize_packaging_profile_payload,
    serialize_packaging_profile,
)

router = APIRouter(prefix="/admin/packaging-profiles", tags=["Admin Packaging Profiles"])


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid packaging profile id.")
    return ObjectId(value)


@router.get("")
async def get_admin_packaging_profiles(_admin=Depends(require_permission("packaging.read"))):
    db = get_database()
    profiles = await db.packaging_profiles.find({}).sort([("sortOrder", 1), ("name", 1)]).to_list(length=None)
    return [serialize_packaging_profile(profile) for profile in profiles]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_admin_packaging_profile(
    payload: PackagingProfileCreate,
    _admin=Depends(require_permission("packaging.profiles.manage")),
):
    db = get_database()
    now = datetime.now(timezone.utc)
    document = normalize_packaging_profile_payload(payload.model_dump())
    document["createdAt"] = now
    document["updatedAt"] = now
    document["createdBy"] = maybe_object_id(_admin.get("id"))
    document["updatedBy"] = maybe_object_id(_admin.get("id"))
    result = await db.packaging_profiles.insert_one(document)
    profile = await db.packaging_profiles.find_one({"_id": result.inserted_id})
    return serialize_packaging_profile(profile)


@router.patch("/{profile_id}")
async def update_admin_packaging_profile(
    profile_id: str,
    payload: PackagingProfileUpdate,
    _admin=Depends(require_permission("packaging.profiles.manage")),
):
    db = get_database()
    object_id = to_object_id(profile_id)
    existing = await db.packaging_profiles.find_one({"_id": object_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Packaging profile not found.")

    updates = normalize_packaging_profile_payload({**existing, **payload.model_dump(exclude_unset=True)})
    updates["updatedAt"] = datetime.now(timezone.utc)
    updates["updatedBy"] = maybe_object_id(_admin.get("id"))
    await db.packaging_profiles.update_one({"_id": object_id}, {"$set": updates})
    profile = await db.packaging_profiles.find_one({"_id": object_id})
    return serialize_packaging_profile(profile)
