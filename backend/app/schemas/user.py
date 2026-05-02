from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    adminCode: str | None = None
    permissions: list[str] = []
    isActive: bool
    createdAt: datetime
    lastLoginAt: datetime | None = None
