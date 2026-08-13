from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.admin import (
    RESPONSIBILITY_LABELS,
    RESPONSIBILITY_OPTIONS,
    WORKSPACE_LABELS,
    can_view_sensitive,
    get_default_role_document,
    get_permission_catalog,
    has_permission,
    has_workspace_access,
    normalize_account_role,
    normalize_admin_user,
    normalize_permission_overrides,
    normalize_role_profile,
    resolve_effective_profile,
)
from app.db.mongodb import get_database
from app.dependencies.auth import require_admin, require_permission
from app.schemas.staff import StaffAccessUpdate, StaffRoleCreate, StaffRoleUpdate
from app.utils.serializers import sanitize_user, serialize_document, serialize_many

router = APIRouter(prefix="/admin/staff", tags=["Admin Staff"])


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def maybe_object_id(value: str | None) -> ObjectId | None:
    if value and ObjectId.is_valid(value):
        return ObjectId(value)
    return None


def require_staff_permission(current_user: dict, permission: str) -> None:
    if current_user.get("role") == "super_admin":
        return
    if not has_permission(current_user, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {permission}",
        )


def build_role_usage_counts(users: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for user in users:
        role_id = user.get("staffRoleId")
        if role_id:
            counts[role_id] = counts.get(role_id, 0) + 1
    return counts


def serialize_role(role: dict, usage_count: int = 0) -> dict:
    serialized = serialize_document(role) or {}
    serialized["usageCount"] = usage_count
    serialized["profile"] = normalize_role_profile(serialized, serialized.get("accountRole", "staff"))
    return serialized


def responsibilities_to_override(
    desired_responsibilities: list[str], role_defaults: dict
) -> dict[str, list[str]]:
    desired = sorted({item for item in desired_responsibilities if item in RESPONSIBILITY_OPTIONS})
    default_items = set(role_defaults.get("responsibilities", []))
    return {
        "addResponsibilities": sorted(set(desired) - default_items),
        "removeResponsibilities": sorted(default_items - set(desired)),
    }


def build_access_warnings(user: dict) -> list[dict]:
    warnings: list[dict] = []
    responsibilities = set(user.get("responsibilities") or [])
    workspace_access = user.get("workspaceAccess") or {}
    permissions = set(user.get("permissions") or [])
    sensitive_permissions = set(user.get("sensitivePermissions") or [])

    if user.get("canAccessAdmin") and not user.get("staffRoleName") and user.get("role") != "super_admin":
        warnings.append(
            {
                "code": "missing_role",
                "label": "No assigned role",
                "severity": "high",
                "message": "This staff member can access admin areas but has no staff role assigned.",
            }
        )

    if user.get("canAccessAdmin") and not responsibilities:
        warnings.append(
            {
                "code": "missing_responsibility",
                "label": "No responsibility",
                "severity": "medium",
                "message": "This staff member has admin access but no assigned operational responsibility.",
            }
        )

    responsibility_requirements = {
        "catalog_management": ("products", "products.read"),
        "inventory_management": ("inventory", "inventory.read"),
        "order_processing": ("orders", "orders.read"),
        "packaging": ("packaging", "packaging.read"),
        "purchasing": ("purchases", "purchases.read"),
        "supplier_management": ("suppliers", "suppliers.read"),
        "expense_entry": ("expenses", "expenses.read"),
        "finance_review": ("finance", "finance.read"),
        "reports_review": ("reports", "reports.read"),
    }

    for responsibility, (workspace, permission) in responsibility_requirements.items():
        if responsibility in responsibilities and (
            not workspace_access.get(workspace, False) or permission not in permissions
        ):
            warnings.append(
                {
                    "code": f"responsibility_mismatch_{responsibility}",
                    "label": "Responsibility mismatch",
                    "severity": "high",
                    "message": f"{RESPONSIBILITY_LABELS.get(responsibility, responsibility)} is assigned without the required {WORKSPACE_LABELS.get(workspace, workspace)} access.",
                }
            )

    if not user.get("isActive", True) and user.get("canAccessAdmin"):
        warnings.append(
            {
                "code": "inactive_privileged",
                "label": "Inactive but privileged",
                "severity": "high",
                "message": "This inactive account still retains privileged admin access.",
            }
        )

    if len(sensitive_permissions) >= 5 and user.get("role") != "super_admin":
        warnings.append(
            {
                "code": "broad_sensitive_access",
                "label": "Broad sensitive access",
                "severity": "medium",
                "message": "This staff member has unusually broad sensitive-data visibility.",
            }
        )

    overrides = user.get("permissionOverrides") or {}
    if overrides.get("grantPermissions") or overrides.get("revokePermissions"):
        warnings.append(
            {
                "code": "has_overrides",
                "label": "Custom overrides applied",
                "severity": "low",
                "message": "This staff member has individual permission overrides beyond the role default.",
            }
        )

    last_login_at = user.get("lastLoginAt")
    if user.get("canAccessAdmin") and last_login_at:
        try:
            last_seen = datetime.fromisoformat(str(last_login_at).replace("Z", "+00:00"))
            if last_seen < now_utc() - timedelta(days=45):
                warnings.append(
                    {
                        "code": "stale_access",
                        "label": "No recent admin activity",
                        "severity": "medium",
                        "message": "This staff account has not logged in recently and should be reviewed.",
                    }
                )
        except ValueError:
            pass

    return warnings


def build_staff_summary(staff_members: list[dict], roles: list[dict]) -> dict:
    role_distribution: dict[str, int] = {}
    for member in staff_members:
        role_label = member.get("roleDisplayName") or "Unassigned"
        role_distribution[role_label] = role_distribution.get(role_label, 0) + 1

    access_issue_count = sum(1 for member in staff_members if member.get("accessWarnings"))
    role_usage = build_role_usage_counts(staff_members)
    role_without_members = sum(1 for role in roles if role_usage.get(role.get("id"), 0) == 0)

    return {
        "totalStaff": len(staff_members),
        "activeStaff": sum(1 for member in staff_members if member.get("isActive")),
        "inactiveStaff": sum(1 for member in staff_members if not member.get("isActive")),
        "superAdmins": sum(1 for member in staff_members if member.get("role") == "super_admin"),
        "admins": sum(1 for member in staff_members if member.get("role") == "admin"),
        "roleDistribution": role_distribution,
        "withoutResponsibilities": sum(
            1
            for member in staff_members
            if member.get("canAccessAdmin") and not member.get("responsibilities")
        ),
        "withAccessIssues": access_issue_count,
        "rolesWithoutMembers": role_without_members,
    }


async def write_audit_log(
    action: str,
    actor: dict,
    target_type: str,
    target_id: str | None,
    target_name: str | None,
    previous_value: dict | None,
    new_value: dict | None,
) -> None:
    db = get_database()
    await db.access_audit_logs.insert_one(
        {
            "actorId": maybe_object_id(actor.get("id")),
            "actorName": actor.get("name") or actor.get("email") or "Unknown",
            "actorEmail": actor.get("email"),
            "targetType": target_type,
            "targetId": target_id,
            "targetName": target_name,
            "action": action,
            "previousValue": previous_value or {},
            "newValue": new_value or {},
            "createdAt": now_utc(),
        }
    )


async def count_active_super_admins() -> int:
    db = get_database()
    return await db.users.count_documents(
        {"role": "super_admin", "isActive": True, "canAccessAdmin": True}
    )


async def get_role_or_404(role_id: str | None, role_key: str | None) -> dict:
    db = get_database()
    role_doc = None
    if role_id and ObjectId.is_valid(role_id):
        role_doc = await db.staff_roles.find_one({"_id": ObjectId(role_id)})
    if not role_doc and role_key:
        role_doc = await db.staff_roles.find_one({"key": role_key})
    if not role_doc:
        raise HTTPException(status_code=404, detail="Staff role not found.")
    return role_doc


def build_user_directory_item(user_doc: dict) -> dict:
    normalized = normalize_admin_user(sanitize_user(user_doc))
    normalized["assignedWorkspaces"] = [
        WORKSPACE_LABELS.get(workspace, workspace.title())
        for workspace, allowed in (normalized.get("workspaceAccess") or {}).items()
        if allowed and workspace != "profile"
    ]
    normalized["permissionSummary"] = (
        f"Can access {', '.join(normalized['assignedWorkspaces'][:4])}"
        if normalized["assignedWorkspaces"]
        else "No admin workspaces assigned"
    )
    normalized["accessWarnings"] = build_access_warnings(normalized)
    return normalized


@router.get("/catalog")
async def get_staff_catalog(_staff=Depends(require_permission("staff.read"))):
    return get_permission_catalog()


@router.get("/search")
async def search_registered_users(
    query: str = Query(min_length=1, max_length=120),
    _staff=Depends(require_permission("staff.read")),
):
    db = get_database()
    safe_query = query.strip()
    regex = re.escape(safe_query)

    exact_matches = await db.users.find(
        {"email": {"$regex": f"^{regex}$", "$options": "i"}}
    ).limit(5).to_list(5)
    partial_matches = await db.users.find(
        {
            "$and": [
                {"email": {"$not": {"$regex": f"^{regex}$", "$options": "i"}}},
                {
                    "$or": [
                        {"email": {"$regex": regex, "$options": "i"}},
                        {"name": {"$regex": regex, "$options": "i"}},
                    ]
                },
            ]
        }
    ).limit(10).to_list(10)

    results = [build_user_directory_item(item) for item in [*exact_matches, *partial_matches]]
    return {
        "query": safe_query,
        "results": [
            {
                "id": item["id"],
                "name": item["name"],
                "email": item["email"],
                "isActive": item["isActive"],
                "canAccessAdmin": item["canAccessAdmin"],
                "role": item["role"],
                "roleDisplayName": item["roleDisplayName"],
                "staffRoleName": item.get("staffRoleName"),
                "staffStatus": item.get("staffStatus"),
            }
            for item in results
        ],
    }


@router.get("/directory")
async def get_staff_directory(
    search: str | None = None,
    role: str | None = None,
    status_value: str | None = Query(default=None, alias="status"),
    workspace: str | None = None,
    access_issue: bool | None = None,
    _staff=Depends(require_permission("staff.read")),
):
    db = get_database()
    query: dict = {"$or": [{"canAccessAdmin": True}, {"role": {"$in": ["admin", "super_admin", "staff"]}}]}
    if status_value == "active":
        query["isActive"] = True
    elif status_value == "inactive":
        query["isActive"] = False

    if role:
        query["$or"] = [{"role": role}, {"staffRoleKey": role}]

    raw_users = await db.users.find(query).sort("createdAt", -1).to_list(None)
    roles = [serialize_document(role_doc) for role_doc in await db.staff_roles.find({}).to_list(None)]

    directory = [build_user_directory_item(user_doc) for user_doc in raw_users]

    if search:
        safe = search.strip().lower()
        directory = [
            item
            for item in directory
            if safe in " ".join(
                [
                    item.get("name", ""),
                    item.get("email", ""),
                    item.get("roleDisplayName", ""),
                ]
            ).lower()
        ]

    if workspace:
        directory = [
            item for item in directory if (item.get("workspaceAccess") or {}).get(workspace, False)
        ]

    if access_issue:
        directory = [item for item in directory if item.get("accessWarnings")]

    return {
        "summary": build_staff_summary(directory, roles),
        "staff": directory,
    }


@router.get("/members/{user_id}")
async def get_staff_member(
    user_id: str,
    _staff=Depends(require_permission("staff.read")),
):
    db = get_database()
    user_doc = await db.users.find_one({"_id": maybe_object_id(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found.")

    member = build_user_directory_item(user_doc)
    audit_logs = serialize_many(
        await db.access_audit_logs.find({"targetId": user_id}).sort("createdAt", -1).limit(20).to_list(20)
    )
    return {
        "member": member,
        "audit": audit_logs,
    }


@router.get("/roles")
async def get_staff_roles(_staff=Depends(require_permission("staff.read"))):
    db = get_database()
    roles = serialize_many(await db.staff_roles.find({}).sort("name", 1).to_list(None))
    users = serialize_many(
        await db.users.find({"staffRoleId": {"$exists": True, "$ne": None}}).to_list(None)
    )
    usage_counts = build_role_usage_counts(users)
    return {
        "roles": [serialize_role(role, usage_counts.get(role.get("id"), 0)) for role in roles]
    }


@router.post("/roles", status_code=status.HTTP_201_CREATED)
async def create_staff_role(
    payload: StaffRoleCreate,
    current_user=Depends(require_permission("roles.manage")),
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can create roles.")

    db = get_database()
    role_key = re.sub(r"[^a-z0-9]+", "_", payload.name.strip().casefold()).strip("_")
    existing = await db.staff_roles.find_one({"key": role_key})
    if existing:
        raise HTTPException(status_code=400, detail="A role with this name already exists.")

    profile = normalize_role_profile(payload.profile.model_dump(), payload.accountRole)
    now = now_utc()
    role_doc = {
        "key": role_key,
        "name": payload.name.strip(),
        "description": (payload.description or "").strip() or None,
        "accountRole": normalize_account_role(payload.accountRole),
        "isSystem": False,
        "isActive": True,
        **profile,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.staff_roles.insert_one(role_doc)
    created = serialize_document(await db.staff_roles.find_one({"_id": result.inserted_id}))
    await write_audit_log(
        "create_role",
        current_user,
        "role",
        created["id"],
        created["name"],
        {},
        created,
    )
    return {"role": serialize_role(created, 0)}


@router.post("/roles/{role_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_staff_role(
    role_id: str,
    current_user=Depends(require_permission("roles.manage")),
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can duplicate roles.")

    db = get_database()
    source = await db.staff_roles.find_one({"_id": maybe_object_id(role_id)})
    if not source:
        raise HTTPException(status_code=404, detail="Role not found.")

    now = now_utc()
    duplicate_name = f"{source['name']} Copy"
    duplicate_key = re.sub(r"[^a-z0-9]+", "_", duplicate_name.casefold()).strip("_")
    role_doc = {
        **source,
        "name": duplicate_name,
        "key": duplicate_key,
        "isSystem": False,
        "createdAt": now,
        "updatedAt": now,
    }
    role_doc.pop("_id", None)
    result = await db.staff_roles.insert_one(role_doc)
    created = serialize_document(await db.staff_roles.find_one({"_id": result.inserted_id}))
    await write_audit_log(
        "duplicate_role",
        current_user,
        "role",
        created["id"],
        created["name"],
        serialize_document(source),
        created,
    )
    return {"role": serialize_role(created, 0)}


async def propagate_role_update(role_doc: dict, current_user: dict) -> None:
    db = get_database()
    users = await db.users.find({"staffRoleId": str(role_doc["_id"])}).to_list(None)
    role_defaults = normalize_role_profile(role_doc, role_doc.get("accountRole", "staff"))

    for user in users:
        overrides = user.get("permissionOverrides") or {}
        effective = resolve_effective_profile(user.get("role", "staff"), role_defaults, overrides)
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "staffRoleName": role_doc["name"],
                    "roleDefaults": role_defaults,
                    "permissions": effective["permissions"],
                    "workspaceAccess": effective["workspaceAccess"],
                    "workspaceScopes": effective["workspaceScopes"],
                    "responsibilities": effective["responsibilities"],
                    "sensitivePermissions": effective["sensitivePermissions"],
                    "updatedAt": now_utc(),
                    "updatedBy": maybe_object_id(current_user.get("id")),
                }
            },
        )


@router.put("/roles/{role_id}")
async def update_staff_role(
    role_id: str,
    payload: StaffRoleUpdate,
    current_user=Depends(require_permission("roles.manage")),
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can edit roles.")

    db = get_database()
    role_doc = await db.staff_roles.find_one({"_id": maybe_object_id(role_id)})
    if not role_doc:
        raise HTTPException(status_code=404, detail="Role not found.")

    previous = serialize_document(role_doc)
    profile = normalize_role_profile(payload.profile.model_dump(), role_doc.get("accountRole", "staff"))
    updates = {
        "name": payload.name.strip(),
        "description": (payload.description or "").strip() or None,
        **profile,
        "updatedAt": now_utc(),
    }
    await db.staff_roles.update_one({"_id": role_doc["_id"]}, {"$set": updates})
    updated_role = await db.staff_roles.find_one({"_id": role_doc["_id"]})

    if payload.applyToAssignedStaff:
        await propagate_role_update(updated_role, current_user)

    serialized = serialize_document(updated_role)
    await write_audit_log(
        "update_role",
        current_user,
        "role",
        serialized["id"],
        serialized["name"],
        previous,
        serialized,
    )
    usage_count = await db.users.count_documents({"staffRoleId": serialized["id"]})
    return {"role": serialize_role(serialized, usage_count)}


@router.delete("/roles/{role_id}")
async def delete_staff_role(
    role_id: str,
    current_user=Depends(require_permission("roles.manage")),
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can delete roles.")

    db = get_database()
    role_doc = await db.staff_roles.find_one({"_id": maybe_object_id(role_id)})
    if not role_doc:
        raise HTTPException(status_code=404, detail="Role not found.")
    if role_doc.get("isSystem"):
        raise HTTPException(status_code=400, detail="System roles cannot be deleted.")

    usage_count = await db.users.count_documents({"staffRoleId": role_id, "canAccessAdmin": True})
    if usage_count:
        raise HTTPException(status_code=400, detail="Remove assigned staff before deleting this role.")

    await db.staff_roles.delete_one({"_id": role_doc["_id"]})
    await write_audit_log(
        "delete_role",
        current_user,
        "role",
        role_id,
        role_doc.get("name"),
        serialize_document(role_doc),
        {},
    )
    return {"ok": True}


@router.put("/members/{user_id}/access")
async def update_staff_access(
    user_id: str,
    payload: StaffAccessUpdate,
    current_user=Depends(require_permission("staff.manage")),
):
    db = get_database()
    target_user = await db.users.find_one({"_id": maybe_object_id(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    previous = build_user_directory_item(target_user)
    target_email = previous.get("email", "").strip().casefold()

    if payload.deactivateAccess or not payload.canAccessAdmin:
        if previous.get("role") == "super_admin" and await count_active_super_admins() <= 1:
            raise HTTPException(
                status_code=400,
                detail="The final active Super Admin cannot remove their own or anyone else's last Super Admin access.",
            )

        updates = {
            "role": "customer",
            "staffRoleId": None,
            "staffRoleKey": None,
            "staffRoleName": None,
            "roleDefaults": {},
            "permissionOverrides": {},
            "permissions": [],
            "workspaceAccess": {"profile": True},
            "workspaceScopes": {"profile": "all"},
            "responsibilities": [],
            "sensitivePermissions": [],
            "canAccessAdmin": False,
            "staffStatus": "inactive",
            "updatedAt": now_utc(),
            "updatedBy": maybe_object_id(current_user.get("id")),
        }
        await db.users.update_one({"_id": target_user["_id"]}, {"$set": updates})
        updated = await db.users.find_one({"_id": target_user["_id"]})
        updated_item = build_user_directory_item(updated)
        await write_audit_log(
            "revoke_staff_access",
            current_user,
            "user",
            updated_item["id"],
            updated_item["email"],
            previous,
            updated_item,
        )
        return {"member": updated_item}

    role_doc = await get_role_or_404(payload.roleId, payload.roleKey)
    role_account_role = normalize_account_role(role_doc.get("accountRole"))
    target_account_role = normalize_account_role(payload.accountRole or role_account_role)

    require_staff_permission(current_user, "staff.manage")
    if target_account_role == "admin":
        require_staff_permission(current_user, "staff.promote.admin")
    if target_account_role == "super_admin":
        require_staff_permission(current_user, "staff.promote.super_admin")
        if current_user.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Only a Super Admin can promote another Super Admin.")
        if (payload.confirmValue or "").strip().casefold() != target_email:
            raise HTTPException(
                status_code=400,
                detail="Promoting a Super Admin requires typing the target user's email as confirmation.",
            )

    role_defaults = normalize_role_profile(role_doc, target_account_role)
    override_payload = payload.permissionOverrides.model_dump()
    responsibility_override = responsibilities_to_override(payload.responsibilities, role_defaults)
    override_payload["addResponsibilities"] = responsibility_override["addResponsibilities"]
    override_payload["removeResponsibilities"] = responsibility_override["removeResponsibilities"]
    overrides = normalize_permission_overrides(override_payload)
    effective = resolve_effective_profile(target_account_role, role_defaults, overrides)

    if previous.get("role") == "super_admin" and target_account_role != "super_admin":
        if await count_active_super_admins() <= 1:
            raise HTTPException(
                status_code=400,
                detail="The final active Super Admin cannot be downgraded or removed.",
            )

    updates = {
        "role": target_account_role,
        "staffRoleId": str(role_doc["_id"]),
        "staffRoleKey": role_doc["key"],
        "staffRoleName": role_doc["name"],
        "roleDefaults": role_defaults,
        "permissionOverrides": overrides,
        "permissions": effective["permissions"],
        "workspaceAccess": effective["workspaceAccess"],
        "workspaceScopes": effective["workspaceScopes"],
        "responsibilities": effective["responsibilities"],
        "sensitivePermissions": effective["sensitivePermissions"],
        "canAccessAdmin": True,
        "staffStatus": "active",
        "updatedAt": now_utc(),
        "updatedBy": maybe_object_id(current_user.get("id")),
    }
    await db.users.update_one({"_id": target_user["_id"]}, {"$set": updates})
    updated = await db.users.find_one({"_id": target_user["_id"]})
    updated_item = build_user_directory_item(updated)

    action = "grant_staff_access"
    if target_account_role == "admin":
        action = "promote_admin"
    elif target_account_role == "super_admin":
        action = "promote_super_admin"
    elif previous.get("canAccessAdmin"):
        action = "update_staff_access"

    await write_audit_log(
        action,
        current_user,
        "user",
        updated_item["id"],
        updated_item["email"],
        previous,
        updated_item,
    )
    return {"member": updated_item}


@router.get("/audit")
async def get_staff_audit_log(
    limit: int = Query(default=50, ge=1, le=200),
    _staff=Depends(require_permission("staff.audit.read")),
):
    db = get_database()
    logs = serialize_many(
        await db.access_audit_logs.find({}).sort("createdAt", -1).limit(limit).to_list(limit)
    )
    return {"audit": logs}
