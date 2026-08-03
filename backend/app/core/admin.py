ALL_ADMIN_PERMISSIONS = [
    "purchases.read",
    "purchases.manage",
    "products.read",
    "products.create",
    "products.update",
    "products.delete",
    "categories.read",
    "categories.manage",
    "inventory.update",
    "orders.read",
    "orders.update",
    "admins.manage",
]

ADMIN_PERMISSION_PROFILES = {
    "viewer": [
        "purchases.read",
        "products.read",
        "categories.read",
        "orders.read",
    ],
    "catalog_admin": [
        "purchases.read",
        "products.read",
        "products.create",
        "products.update",
        "categories.read",
        "categories.manage",
        "orders.read",
        "orders.update",
    ],
    "inventory_admin": [
        "purchases.read",
        "purchases.manage",
        "products.read",
        "categories.read",
        "inventory.update",
        "orders.read",
    ],
    "super_admin": ALL_ADMIN_PERMISSIONS,
}

DEFAULT_ROLE_PERMISSIONS = {
    "customer": [],
    "admin": ADMIN_PERMISSION_PROFILES["catalog_admin"],
    "super_admin": ALL_ADMIN_PERMISSIONS,
}


def normalize_role(role: str | None) -> str:
    normalized = (role or "customer").strip().casefold()
    if normalized not in {"customer", "admin", "super_admin"}:
        return "customer"
    return normalized


def get_effective_permissions(role: str, permissions: list[str] | None) -> list[str]:
    if role == "super_admin":
        return ALL_ADMIN_PERMISSIONS

    if permissions is not None:
        return sorted({permission.strip() for permission in permissions if permission.strip()})

    return DEFAULT_ROLE_PERMISSIONS.get(role, [])


def normalize_admin_user(user: dict | None) -> dict | None:
    if not user:
        return user

    normalized_user = {**user}
    role = normalize_role(normalized_user.get("role"))
    normalized_user["role"] = role
    normalized_user["permissions"] = get_effective_permissions(
        role,
        normalized_user.get("permissions"),
    )
    normalized_user["isActive"] = bool(normalized_user.get("isActive", True))
    normalized_user["adminCode"] = normalized_user.get("adminCode") or None
    return normalized_user


def has_permission(user: dict, permission: str) -> bool:
    normalized_user = normalize_admin_user(user) or {}
    role = normalized_user.get("role", "customer")
    if role == "super_admin":
        return True
    return permission in normalized_user.get("permissions", [])
