import re

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.admin import has_permission, normalize_admin_user
from app.core.security import decode_access_token
from app.db.mongodb import get_database
from app.utils.serializers import sanitize_user

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    db = get_database()
    user = await db.users.find_one(
        {"email": {"$regex": f"^{re.escape(payload['sub'])}$", "$options": "i"}}
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    normalized_user = normalize_admin_user(sanitize_user(user))
    if not normalized_user["isActive"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )
    return normalized_user


async def require_admin(current_user=Depends(get_current_user)):
    if not current_user.get("canAccessAdmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


def require_permission(permission: str):
    async def permission_dependency(current_user=Depends(require_admin)):
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission}",
            )
        return current_user

    return permission_dependency
