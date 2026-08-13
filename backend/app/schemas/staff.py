from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class PermissionOverridesIn(BaseModel):
    grantPermissions: list[str] = Field(default_factory=list)
    revokePermissions: list[str] = Field(default_factory=list)
    workspaceAccess: dict[str, bool] = Field(default_factory=dict)
    workspaceScopes: dict[str, str] = Field(default_factory=dict)
    addResponsibilities: list[str] = Field(default_factory=list)
    removeResponsibilities: list[str] = Field(default_factory=list)
    grantSensitivePermissions: list[str] = Field(default_factory=list)
    revokeSensitivePermissions: list[str] = Field(default_factory=list)


class RoleProfileIn(BaseModel):
    permissions: list[str] = Field(default_factory=list)
    workspaceAccess: dict[str, bool] = Field(default_factory=dict)
    workspaceScopes: dict[str, str] = Field(default_factory=dict)
    responsibilities: list[str] = Field(default_factory=list)
    sensitivePermissions: list[str] = Field(default_factory=list)


class StaffRoleCreate(BaseModel):
    name: str
    description: str | None = None
    accountRole: str = "staff"
    profile: RoleProfileIn = Field(default_factory=RoleProfileIn)


class StaffRoleUpdate(BaseModel):
    name: str
    description: str | None = None
    profile: RoleProfileIn = Field(default_factory=RoleProfileIn)
    applyToAssignedStaff: bool = True


class StaffAccessUpdate(BaseModel):
    roleId: str | None = None
    roleKey: str | None = None
    accountRole: str = "staff"
    canAccessAdmin: bool = True
    responsibilities: list[str] = Field(default_factory=list)
    permissionOverrides: PermissionOverridesIn = Field(default_factory=PermissionOverridesIn)
    confirmValue: str | None = None
    deactivateAccess: bool = False


class StaffSearchResult(BaseModel):
    id: str
    name: str
    email: EmailStr
    isActive: bool
    canAccessAdmin: bool
    role: str
    roleDisplayName: str
    staffRoleName: str | None = None


class AccessAuditEntryOut(BaseModel):
    id: str
    actorName: str
    actorEmail: EmailStr | None = None
    targetType: str
    targetId: str | None = None
    targetName: str | None = None
    action: str
    previousValue: dict = Field(default_factory=dict)
    newValue: dict = Field(default_factory=dict)
    createdAt: datetime

