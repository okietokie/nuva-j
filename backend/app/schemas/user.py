from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    roleDisplayName: str = "Customer"
    adminCode: str | None = None
    permissions: list[str] = Field(default_factory=list)
    workspaceAccess: dict[str, bool] = Field(default_factory=dict)
    workspaceScopes: dict[str, str] = Field(default_factory=dict)
    responsibilities: list[str] = Field(default_factory=list)
    sensitivePermissions: list[str] = Field(default_factory=list)
    permissionOverrides: dict = Field(default_factory=dict)
    roleDefaults: dict = Field(default_factory=dict)
    canAccessAdmin: bool = False
    staffRoleKey: str | None = None
    staffRoleName: str | None = None
    staffStatus: str = "inactive"
    isActive: bool
    createdAt: datetime
    lastLoginAt: datetime | None = None
