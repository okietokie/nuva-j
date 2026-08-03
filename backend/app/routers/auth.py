import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.admin import normalize_admin_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.mongodb import get_database
from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.utils.serializers import sanitize_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    db = get_database()
    existing_user = await db.users.find_one(
        {"email": {"$regex": f"^{re.escape(payload.email)}$", "$options": "i"}}
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered.")

    now = datetime.now(timezone.utc)
    user_data = {
        "name": payload.name,
        "email": payload.email,
        "passwordHash": hash_password(payload.password),
        "role": "customer",
        "permissions": [],
        "isActive": True,
        "adminCode": None,
        "createdAt": now,
        "lastLoginAt": None,
    }
    result = await db.users.insert_one(user_data)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    serialized_user = normalize_admin_user(sanitize_user(created_user))
    token = create_access_token(serialized_user["email"])

    return {"access_token": token, "user": serialized_user}


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    db = get_database()
    user = await db.users.find_one(
        {"email": {"$regex": f"^{re.escape(payload.email)}$", "$options": "i"}}
    )
    password_hash = user.get("passwordHash") if user else None
    if user and not password_hash:
        password_hash = user.get("password")

    if not user or not password_hash or not verify_password(payload.password, password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="This account is inactive.")

    now = datetime.now(timezone.utc)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"lastLoginAt": now}})
    refreshed_user = await db.users.find_one({"_id": user["_id"]})
    serialized_user = normalize_admin_user(sanitize_user(refreshed_user))
    token = create_access_token(serialized_user["email"])
    return {"access_token": token, "user": serialized_user}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user
