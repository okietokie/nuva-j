from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.db.mongodb import get_database
from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.utils.serializers import sanitize_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    db = get_database()
    existing_user = await db.users.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered.")

    now = datetime.now(timezone.utc)
    user_data = {
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": "user",
        "createdAt": now,
    }
    result = await db.users.insert_one(user_data)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    serialized_user = sanitize_user(created_user)
    token = create_access_token(serialized_user["email"])

    return {"access_token": token, "user": serialized_user}


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    db = get_database()
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    serialized_user = sanitize_user(user)
    token = create_access_token(serialized_user["email"])
    return {"access_token": token, "user": serialized_user}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user
