from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone

WORKSPACE_SCOPE_OPTIONS = {"none", "own", "assigned", "all"}

WORKSPACE_LABELS = {
    "dashboard": "Dashboard",
    "products": "Products",
    "categories": "Categories",
    "inventory": "Inventory",
    "purchases": "Purchases",
    "suppliers": "Suppliers",
    "orders": "Orders",
    "customers": "Customers",
    "packaging": "Packaging",
    "expenses": "Expenses",
    "finance": "Finance",
    "reports": "Reports",
    "staff": "Staff",
    "website": "Website",
    "media": "Media",
    "settings": "Settings",
    "profile": "Profile",
}

RESPONSIBILITY_OPTIONS = [
    "catalog_management",
    "inventory_management",
    "order_processing",
    "packaging",
    "purchasing",
    "supplier_management",
    "expense_entry",
    "finance_review",
    "reports_review",
]

RESPONSIBILITY_LABELS = {
    "catalog_management": "Catalog Management",
    "inventory_management": "Inventory Management",
    "order_processing": "Order Processing",
    "packaging": "Packaging",
    "purchasing": "Purchasing",
    "supplier_management": "Supplier Management",
    "expense_entry": "Expense Entry",
    "finance_review": "Finance Review",
    "reports_review": "Reports Review",
}

WORKSPACE_PERMISSION_CATALOG = [
    {
        "workspace": "dashboard",
        "label": "Dashboard",
        "summary": "Overview metrics and admin home view.",
        "actions": [
            {"key": "dashboard.read", "label": "View"},
        ],
        "sensitive": [
            {"key": "dashboard.view_financials", "label": "View Financial Highlights"},
        ],
        "visibilityScopes": False,
    },
    {
        "workspace": "products",
        "label": "Products",
        "summary": "Catalog records, creation, editing, and publishing readiness.",
        "actions": [
            {"key": "products.read", "label": "View"},
            {"key": "products.create", "label": "Create"},
            {"key": "products.update", "label": "Edit"},
            {"key": "products.delete", "label": "Delete / Archive"},
        ],
        "sensitive": [
            {"key": "prices.view_selling", "label": "View Selling Price"},
            {"key": "prices.view_cost", "label": "View Purchase Cost"},
            {"key": "prices.view_margin", "label": "View Profit / Margin"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "categories",
        "label": "Categories",
        "summary": "Category structure and related codes.",
        "actions": [
            {"key": "categories.read", "label": "View"},
            {"key": "categories.manage", "label": "Manage"},
        ],
        "sensitive": [],
        "visibilityScopes": False,
    },
    {
        "workspace": "inventory",
        "label": "Inventory",
        "summary": "Stock, thresholds, and inventory updates.",
        "actions": [
            {"key": "inventory.read", "label": "View"},
            {"key": "inventory.update", "label": "Edit / Adjust"},
            {"key": "inventory.export", "label": "Export"},
        ],
        "sensitive": [
            {"key": "prices.view_cost", "label": "View Purchase Cost"},
            {"key": "prices.view_margin", "label": "View Profit / Margin"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "purchases",
        "label": "Purchases",
        "summary": "Suppliers, batches, and landed purchasing data.",
        "actions": [
            {"key": "purchases.read", "label": "View"},
            {"key": "purchases.manage", "label": "Create / Edit"},
            {"key": "purchases.approve", "label": "Approve"},
            {"key": "purchases.export", "label": "Export"},
        ],
        "sensitive": [
            {"key": "suppliers.view_sensitive", "label": "View Supplier Contact Details"},
            {"key": "prices.view_cost", "label": "View Purchase Cost"},
            {"key": "finance.view_sensitive", "label": "View Financial Details"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "suppliers",
        "label": "Suppliers",
        "summary": "Supplier identities and contact details.",
        "actions": [
            {"key": "suppliers.read", "label": "View"},
            {"key": "suppliers.manage", "label": "Create / Edit"},
        ],
        "sensitive": [
            {"key": "suppliers.view_sensitive", "label": "View Supplier Contact Details"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "orders",
        "label": "Orders",
        "summary": "Customer order review and workflow handling.",
        "actions": [
            {"key": "orders.read", "label": "View"},
            {"key": "orders.update", "label": "Edit / Update"},
            {"key": "orders.assign", "label": "Assign"},
            {"key": "orders.approve", "label": "Approve"},
            {"key": "orders.export", "label": "Export"},
        ],
        "sensitive": [
            {"key": "customers.view_sensitive", "label": "View Customer Contact Details"},
            {"key": "payments.view_sensitive", "label": "View Payment Information"},
            {"key": "prices.view_margin", "label": "View Profit / Margin"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "customers",
        "label": "Customers",
        "summary": "Customer records and customer data access.",
        "actions": [
            {"key": "customers.read", "label": "View"},
            {"key": "customers.update", "label": "Edit"},
            {"key": "customers.export", "label": "Export"},
        ],
        "sensitive": [
            {"key": "customers.view_sensitive", "label": "View Customer Contact Details"},
            {"key": "payments.view_sensitive", "label": "View Payment Information"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "packaging",
        "label": "Packaging",
        "summary": "Packaging readiness and packaging operations.",
        "actions": [
            {"key": "packaging.read", "label": "View"},
            {"key": "packaging.update", "label": "Edit"},
            {"key": "packaging.assign", "label": "Assign"},
        ],
        "sensitive": [
            {"key": "prices.view_cost", "label": "View Purchase Cost"},
            {"key": "prices.view_margin", "label": "View Profit / Margin"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "expenses",
        "label": "Expenses",
        "summary": "Expense records, approvals, and payment proof.",
        "actions": [
            {"key": "expenses.read", "label": "View"},
            {"key": "expenses.create", "label": "Create"},
            {"key": "expenses.edit", "label": "Edit"},
            {"key": "expenses.delete", "label": "Delete"},
            {"key": "expenses.approve", "label": "Approve"},
            {"key": "expenses.export", "label": "Export"},
        ],
        "sensitive": [
            {"key": "expenses.view_sensitive", "label": "View Expense Details"},
            {"key": "finance.view_sensitive", "label": "View Finance Summaries"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "finance",
        "label": "Finance",
        "summary": "Operating margin, profit signals, and financial views.",
        "actions": [
            {"key": "finance.read", "label": "View"},
            {"key": "finance.export", "label": "Export"},
        ],
        "sensitive": [
            {"key": "finance.view_summary", "label": "View Finance Summaries"},
            {"key": "finance.view_sensitive", "label": "View Sensitive Financial Details"},
            {"key": "prices.view_margin", "label": "View Profit / Margin"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "reports",
        "label": "Reports",
        "summary": "Reporting, exports, and operational summaries.",
        "actions": [
            {"key": "reports.read", "label": "View"},
            {"key": "reports.export", "label": "Export"},
        ],
        "sensitive": [
            {"key": "reports.view_financials", "label": "View Financial Report Details"},
            {"key": "prices.view_margin", "label": "View Profit / Margin"},
        ],
        "visibilityScopes": True,
    },
    {
        "workspace": "staff",
        "label": "Staff",
        "summary": "Staff access, roles, responsibilities, and audit review.",
        "actions": [
            {"key": "staff.read", "label": "View"},
            {"key": "staff.manage", "label": "Manage Staff Access"},
            {"key": "roles.manage", "label": "Manage Roles"},
            {"key": "staff.overrides.manage", "label": "Manage Overrides"},
            {"key": "staff.promote.admin", "label": "Promote to Admin"},
            {"key": "staff.promote.super_admin", "label": "Promote to Super Admin"},
        ],
        "sensitive": [
            {"key": "staff.audit.read", "label": "View Access Audit Log"},
            {"key": "security.manage", "label": "Manage Security-Critical Access"},
        ],
        "visibilityScopes": False,
    },
    {
        "workspace": "website",
        "label": "Website",
        "summary": "Storefront preview, homepage management, publishing, and version control.",
        "actions": [
            {"key": "website.view", "label": "View Website Workspace"},
            {"key": "website.preview", "label": "Preview Website Changes"},
            {"key": "website.edit_content", "label": "Edit Website Content"},
            {"key": "website.edit_layout", "label": "Reorder Homepage Sections"},
            {"key": "website.manage_featured_products", "label": "Manage Featured Products"},
            {"key": "website.manage_navigation", "label": "Manage Website Navigation"},
            {"key": "website.manage_announcements", "label": "Manage Announcements"},
            {"key": "website.manage_seo", "label": "Manage SEO Settings"},
        ],
        "sensitive": [
            {"key": "website.publish", "label": "Publish Website Changes"},
            {"key": "website.schedule", "label": "Schedule Website Changes"},
            {"key": "website.restore_version", "label": "Restore Previous Version"},
        ],
        "visibilityScopes": False,
    },
    {
        "workspace": "media",
        "label": "Media",
        "summary": "Media intake and website assets.",
        "actions": [
            {"key": "media.read", "label": "View"},
            {"key": "media.update", "label": "Edit"},
            {"key": "media.delete", "label": "Delete"},
        ],
        "sensitive": [],
        "visibilityScopes": False,
    },
    {
        "workspace": "settings",
        "label": "Settings",
        "summary": "Workspace and system settings.",
        "actions": [
            {"key": "settings.read", "label": "View"},
            {"key": "settings.manage", "label": "Manage Settings"},
        ],
        "sensitive": [
            {"key": "security.manage", "label": "Manage Security-Critical Access"},
        ],
        "visibilityScopes": False,
    },
    {
        "workspace": "profile",
        "label": "Profile",
        "summary": "Own profile access.",
        "actions": [
            {"key": "profile.read", "label": "View"},
            {"key": "profile.update", "label": "Edit"},
        ],
        "sensitive": [],
        "visibilityScopes": False,
    },
]

PERMISSION_TO_WORKSPACE = {}
ALL_ADMIN_PERMISSIONS = []
for workspace in WORKSPACE_PERMISSION_CATALOG:
    for permission in workspace["actions"] + workspace["sensitive"]:
        PERMISSION_TO_WORKSPACE[permission["key"]] = workspace["workspace"]
        ALL_ADMIN_PERMISSIONS.append(permission["key"])
ALL_ADMIN_PERMISSIONS = sorted(set(ALL_ADMIN_PERMISSIONS + ["admins.manage"]))

PARENT_PERMISSION_DEPENDENCIES = {
    "products.create": ["products.read"],
    "products.update": ["products.read"],
    "products.delete": ["products.read"],
    "categories.manage": ["categories.read"],
    "inventory.update": ["inventory.read"],
    "inventory.export": ["inventory.read"],
    "purchases.manage": ["purchases.read"],
    "purchases.approve": ["purchases.read"],
    "purchases.export": ["purchases.read"],
    "suppliers.manage": ["suppliers.read"],
    "orders.update": ["orders.read"],
    "orders.assign": ["orders.read"],
    "orders.approve": ["orders.read"],
    "orders.export": ["orders.read"],
    "customers.update": ["customers.read"],
    "customers.export": ["customers.read"],
    "packaging.update": ["packaging.read"],
    "packaging.assign": ["packaging.read"],
    "expenses.create": ["expenses.read"],
    "expenses.edit": ["expenses.read"],
    "expenses.delete": ["expenses.read"],
    "expenses.approve": ["expenses.read"],
    "expenses.export": ["expenses.read"],
    "finance.export": ["finance.read", "finance.view_summary"],
    "reports.export": ["reports.read"],
    "website.preview": ["website.view"],
    "website.edit_content": ["website.view"],
    "website.edit_layout": ["website.view"],
    "website.manage_featured_products": ["website.view"],
    "website.manage_navigation": ["website.view"],
    "website.manage_announcements": ["website.view"],
    "website.manage_seo": ["website.view"],
    "website.publish": ["website.view", "website.preview"],
    "website.schedule": ["website.view", "website.preview"],
    "website.restore_version": ["website.view", "website.preview"],
    "media.update": ["media.read"],
    "media.delete": ["media.read"],
    "settings.manage": ["settings.read"],
    "profile.update": ["profile.read"],
    "finance.view_sensitive": ["finance.read", "finance.view_summary"],
    "reports.view_financials": ["reports.read"],
    "staff.manage": ["staff.read"],
    "roles.manage": ["staff.read"],
    "staff.overrides.manage": ["staff.read"],
    "staff.promote.admin": ["staff.read"],
    "staff.promote.super_admin": ["staff.read"],
    "staff.audit.read": ["staff.read"],
    "security.manage": ["settings.read"],
}

DEFAULT_ROLE_TEMPLATES = [
    {
        "key": "super_admin",
        "name": "Super Admin",
        "description": "Unrestricted access across the entire admin panel.",
        "accountRole": "super_admin",
        "isSystem": True,
        "workspaceAccess": {workspace["workspace"]: True for workspace in WORKSPACE_PERMISSION_CATALOG},
        "workspaceScopes": {workspace["workspace"]: "all" for workspace in WORKSPACE_PERMISSION_CATALOG},
        "permissions": list(ALL_ADMIN_PERMISSIONS),
        "responsibilities": RESPONSIBILITY_OPTIONS,
        "sensitivePermissions": [
            "dashboard.view_financials",
            "prices.view_selling",
            "prices.view_cost",
            "prices.view_margin",
            "suppliers.view_sensitive",
            "customers.view_sensitive",
            "payments.view_sensitive",
            "expenses.view_sensitive",
            "finance.view_summary",
            "finance.view_sensitive",
            "reports.view_financials",
            "staff.audit.read",
            "security.manage",
        ],
    },
    {
        "key": "admin",
        "name": "Admin",
        "description": "Broad operational access without super admin security controls.",
        "accountRole": "admin",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "products": True,
            "categories": True,
            "inventory": True,
            "purchases": True,
            "suppliers": True,
            "orders": True,
            "customers": True,
            "packaging": True,
            "expenses": True,
            "finance": True,
            "reports": True,
            "staff": False,
            "website": True,
            "media": True,
            "settings": False,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "all",
            "products": "all",
            "categories": "all",
            "inventory": "all",
            "purchases": "all",
            "suppliers": "all",
            "orders": "all",
            "customers": "all",
            "packaging": "all",
            "expenses": "all",
            "finance": "all",
            "reports": "all",
            "profile": "all",
            "media": "all",
            "website": "all",
        },
        "permissions": [
            "dashboard.read",
            "dashboard.view_financials",
            "products.read",
            "products.create",
            "products.update",
            "products.delete",
            "categories.read",
            "categories.manage",
            "inventory.read",
            "inventory.update",
            "purchases.read",
            "purchases.manage",
            "suppliers.read",
            "suppliers.manage",
            "orders.read",
            "orders.update",
            "orders.assign",
            "customers.read",
            "customers.update",
            "packaging.read",
            "packaging.update",
            "expenses.read",
            "expenses.create",
            "expenses.edit",
            "expenses.approve",
            "finance.read",
            "finance.view_summary",
            "reports.read",
            "reports.export",
            "website.view",
            "website.preview",
            "website.edit_content",
            "website.edit_layout",
            "website.manage_featured_products",
            "website.manage_navigation",
            "website.manage_announcements",
            "website.manage_seo",
            "media.read",
            "media.update",
            "profile.read",
            "profile.update",
            "prices.view_selling",
            "prices.view_cost",
            "prices.view_margin",
            "customers.view_sensitive",
            "suppliers.view_sensitive",
            "expenses.view_sensitive",
            "finance.view_sensitive",
        ],
        "responsibilities": RESPONSIBILITY_OPTIONS,
        "sensitivePermissions": [
            "dashboard.view_financials",
            "prices.view_selling",
            "prices.view_cost",
            "prices.view_margin",
            "customers.view_sensitive",
            "suppliers.view_sensitive",
            "expenses.view_sensitive",
            "finance.view_summary",
            "finance.view_sensitive",
            "reports.view_financials",
            "website.publish",
            "website.schedule",
            "website.restore_version",
        ],
    },
    {
        "key": "operations",
        "name": "Operations",
        "description": "Coordinates orders, customer handling, and packaging operations.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "orders": True,
            "customers": True,
            "packaging": True,
            "inventory": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "assigned",
            "orders": "assigned",
            "customers": "assigned",
            "packaging": "assigned",
            "inventory": "assigned",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "orders.read",
            "orders.update",
            "orders.assign",
            "customers.read",
            "packaging.read",
            "packaging.update",
            "inventory.read",
            "profile.read",
            "profile.update",
        ],
        "responsibilities": ["order_processing", "packaging"],
        "sensitivePermissions": [],
    },
    {
        "key": "catalog",
        "name": "Catalog",
        "description": "Manages products, categories, and media readiness.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "products": True,
            "categories": True,
            "media": True,
            "website": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "assigned",
            "products": "all",
            "categories": "all",
            "media": "all",
            "website": "all",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "products.read",
            "products.create",
            "products.update",
            "categories.read",
            "categories.manage",
            "media.read",
            "media.update",
            "website.view",
            "website.preview",
            "website.edit_content",
            "website.edit_layout",
            "website.manage_featured_products",
            "profile.read",
            "profile.update",
            "prices.view_selling",
        ],
        "responsibilities": ["catalog_management"],
        "sensitivePermissions": ["prices.view_selling"],
    },
    {
        "key": "inventory",
        "name": "Inventory",
        "description": "Handles stock adjustments and inventory visibility.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "inventory": True,
            "products": True,
            "orders": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "assigned",
            "inventory": "all",
            "products": "assigned",
            "orders": "assigned",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "inventory.read",
            "inventory.update",
            "products.read",
            "orders.read",
            "profile.read",
            "profile.update",
        ],
        "responsibilities": ["inventory_management"],
        "sensitivePermissions": ["prices.view_cost"],
    },
    {
        "key": "purchasing",
        "name": "Purchasing",
        "description": "Manages suppliers, batches, and purchase-linked costing.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "purchases": True,
            "suppliers": True,
            "products": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "assigned",
            "purchases": "all",
            "suppliers": "all",
            "products": "assigned",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "purchases.read",
            "purchases.manage",
            "suppliers.read",
            "suppliers.manage",
            "products.read",
            "profile.read",
            "profile.update",
            "prices.view_cost",
            "suppliers.view_sensitive",
        ],
        "responsibilities": ["purchasing", "supplier_management"],
        "sensitivePermissions": ["prices.view_cost", "suppliers.view_sensitive"],
    },
    {
        "key": "orders",
        "name": "Orders",
        "description": "Processes customer orders and fulfillment workflow.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "orders": True,
            "customers": True,
            "inventory": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "assigned",
            "orders": "assigned",
            "customers": "assigned",
            "inventory": "assigned",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "orders.read",
            "orders.update",
            "customers.read",
            "inventory.read",
            "profile.read",
            "profile.update",
            "customers.view_sensitive",
        ],
        "responsibilities": ["order_processing"],
        "sensitivePermissions": ["customers.view_sensitive"],
    },
    {
        "key": "packaging",
        "name": "Packaging",
        "description": "Prepares and tracks packaging readiness.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "packaging": True,
            "orders": True,
            "inventory": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "assigned",
            "packaging": "assigned",
            "orders": "assigned",
            "inventory": "assigned",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "packaging.read",
            "packaging.update",
            "orders.read",
            "inventory.read",
            "profile.read",
            "profile.update",
        ],
        "responsibilities": ["packaging"],
        "sensitivePermissions": [],
    },
    {
        "key": "finance",
        "name": "Finance",
        "description": "Reviews expenses, finance summaries, and margin details.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "expenses": True,
            "finance": True,
            "reports": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "all",
            "expenses": "all",
            "finance": "all",
            "reports": "all",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "dashboard.view_financials",
            "expenses.read",
            "expenses.create",
            "expenses.edit",
            "expenses.approve",
            "finance.read",
            "finance.view_summary",
            "finance.view_sensitive",
            "reports.read",
            "reports.export",
            "profile.read",
            "profile.update",
            "expenses.view_sensitive",
            "prices.view_margin",
            "prices.view_cost",
            "prices.view_selling",
        ],
        "responsibilities": ["expense_entry", "finance_review"],
        "sensitivePermissions": [
            "dashboard.view_financials",
            "finance.view_summary",
            "finance.view_sensitive",
            "expenses.view_sensitive",
            "prices.view_margin",
            "prices.view_cost",
            "prices.view_selling",
        ],
    },
    {
        "key": "reports_viewer",
        "name": "Reports Viewer",
        "description": "Views reporting and operational summaries without editing.",
        "accountRole": "staff",
        "isSystem": True,
        "workspaceAccess": {
            "dashboard": True,
            "reports": True,
            "finance": True,
            "profile": True,
        },
        "workspaceScopes": {
            "dashboard": "all",
            "reports": "all",
            "finance": "all",
            "profile": "all",
        },
        "permissions": [
            "dashboard.read",
            "reports.read",
            "finance.read",
            "finance.view_summary",
            "profile.read",
            "profile.update",
        ],
        "responsibilities": ["reports_review"],
        "sensitivePermissions": ["finance.view_summary"],
    },
]


def normalize_account_role(role: str | None) -> str:
    normalized = (role or "customer").strip().casefold()
    if normalized in {"customer", "staff", "admin", "super_admin"}:
        return normalized
    return "customer"


def normalize_role(role: str | None) -> str:
    return normalize_account_role(role)


def _unique_list(values: list[str] | None) -> list[str]:
    if not values:
        return []
    return sorted({str(value).strip() for value in values if str(value).strip()})


def ensure_permission_dependencies(permissions: list[str]) -> list[str]:
    resolved = set(_unique_list(permissions))
    added = True
    while added:
        added = False
        for permission in list(resolved):
            for dependency in PARENT_PERMISSION_DEPENDENCIES.get(permission, []):
                if dependency not in resolved:
                    resolved.add(dependency)
                    added = True
    return sorted(resolved)


def infer_workspace_access(permissions: list[str], role: str) -> dict[str, bool]:
    workspace_access = {workspace["workspace"]: False for workspace in WORKSPACE_PERMISSION_CATALOG}
    if role == "super_admin":
        return {key: True for key in workspace_access}

    for permission in permissions:
        workspace = PERMISSION_TO_WORKSPACE.get(permission)
        if workspace:
            workspace_access[workspace] = True

    if role in {"staff", "admin"}:
        workspace_access["profile"] = True

    return workspace_access


def normalize_workspace_access(workspace_access: dict | None, permissions: list[str], role: str) -> dict[str, bool]:
    inferred = infer_workspace_access(permissions, role)
    provided = workspace_access or {}
    normalized = {}
    for workspace in WORKSPACE_LABELS:
        value = provided.get(workspace)
        normalized[workspace] = inferred.get(workspace, False) if value is None else bool(value)

    if role == "super_admin":
        return {workspace: True for workspace in normalized}

    if role in {"staff", "admin"}:
        normalized["profile"] = True

    return normalized


def normalize_workspace_scopes(workspace_scopes: dict | None, workspace_access: dict[str, bool], role: str) -> dict[str, str]:
    normalized = {}
    provided = workspace_scopes or {}
    for workspace, allowed in workspace_access.items():
        default_scope = "all" if role in {"super_admin", "admin"} else "assigned"
        if workspace in {"dashboard", "profile", "settings", "website", "media", "staff", "categories"}:
            default_scope = "all"
        raw_scope = str(provided.get(workspace, default_scope)).strip().casefold()
        scope = raw_scope if raw_scope in WORKSPACE_SCOPE_OPTIONS else default_scope
        normalized[workspace] = scope if allowed else "none"
    return normalized


def normalize_role_profile(profile: dict | None, role: str = "customer") -> dict:
    safe = profile or {}
    permissions = ensure_permission_dependencies(safe.get("permissions", []))
    workspace_access = normalize_workspace_access(safe.get("workspaceAccess"), permissions, role)
    workspace_scopes = normalize_workspace_scopes(safe.get("workspaceScopes"), workspace_access, role)
    responsibilities = _unique_list(safe.get("responsibilities"))
    sensitive_permissions = ensure_permission_dependencies(safe.get("sensitivePermissions", []))

    # Workspace access controls the final permission surface.
    permissions = [
        permission
        for permission in permissions
        if workspace_access.get(PERMISSION_TO_WORKSPACE.get(permission, ""), True)
    ]
    sensitive_permissions = [
        permission
        for permission in sensitive_permissions
        if workspace_access.get(PERMISSION_TO_WORKSPACE.get(permission, ""), True)
    ]

    return {
        "permissions": sorted(set(permissions)),
        "workspaceAccess": workspace_access,
        "workspaceScopes": workspace_scopes,
        "responsibilities": responsibilities,
        "sensitivePermissions": sorted(set(sensitive_permissions)),
    }


def normalize_permission_overrides(overrides: dict | None) -> dict:
    safe = overrides or {}
    return {
        "grantPermissions": ensure_permission_dependencies(safe.get("grantPermissions", [])),
        "revokePermissions": _unique_list(safe.get("revokePermissions")),
        "workspaceAccess": {
            key: bool(value)
            for key, value in (safe.get("workspaceAccess") or {}).items()
            if key in WORKSPACE_LABELS
        },
        "workspaceScopes": {
            key: value
            for key, value in (safe.get("workspaceScopes") or {}).items()
            if key in WORKSPACE_LABELS and str(value).strip().casefold() in WORKSPACE_SCOPE_OPTIONS
        },
        "addResponsibilities": _unique_list(safe.get("addResponsibilities")),
        "removeResponsibilities": _unique_list(safe.get("removeResponsibilities")),
        "grantSensitivePermissions": ensure_permission_dependencies(
            safe.get("grantSensitivePermissions", [])
        ),
        "revokeSensitivePermissions": _unique_list(safe.get("revokeSensitivePermissions")),
    }


def resolve_effective_profile(
    account_role: str,
    role_defaults: dict | None,
    overrides: dict | None = None,
) -> dict:
    base = normalize_role_profile(role_defaults, account_role)
    normalized_overrides = normalize_permission_overrides(overrides)

    permissions = set(base["permissions"])
    permissions.update(normalized_overrides["grantPermissions"])
    permissions.difference_update(normalized_overrides["revokePermissions"])
    permissions = set(ensure_permission_dependencies(list(permissions)))

    sensitive_permissions = set(base["sensitivePermissions"])
    sensitive_permissions.update(normalized_overrides["grantSensitivePermissions"])
    sensitive_permissions.difference_update(normalized_overrides["revokeSensitivePermissions"])
    sensitive_permissions = set(ensure_permission_dependencies(list(sensitive_permissions)))

    workspace_access = dict(base["workspaceAccess"])
    workspace_access.update(normalized_overrides["workspaceAccess"])

    for permission in list(permissions):
        workspace = PERMISSION_TO_WORKSPACE.get(permission)
        if workspace and not workspace_access.get(workspace, False):
            permissions.discard(permission)

    for permission in list(sensitive_permissions):
        workspace = PERMISSION_TO_WORKSPACE.get(permission)
        if workspace and not workspace_access.get(workspace, False):
            sensitive_permissions.discard(permission)

    workspace_scopes = normalize_workspace_scopes(
        {**base["workspaceScopes"], **normalized_overrides["workspaceScopes"]},
        workspace_access,
        account_role,
    )

    responsibilities = set(base["responsibilities"])
    responsibilities.update(normalized_overrides["addResponsibilities"])
    responsibilities.difference_update(normalized_overrides["removeResponsibilities"])

    if account_role == "super_admin":
        workspace_access = {workspace: True for workspace in workspace_access}
        workspace_scopes = {workspace: "all" for workspace in workspace_scopes}
        permissions = set(ALL_ADMIN_PERMISSIONS)
        sensitive_permissions = set(
            permission["key"]
            for workspace in WORKSPACE_PERMISSION_CATALOG
            for permission in workspace["sensitive"]
        )
        responsibilities = set(RESPONSIBILITY_OPTIONS)

    return {
        "permissions": sorted(permissions),
        "workspaceAccess": workspace_access,
        "workspaceScopes": workspace_scopes,
        "responsibilities": sorted(responsibilities),
        "sensitivePermissions": sorted(sensitive_permissions),
        "permissionOverrides": normalized_overrides,
    }


def get_default_role_document(key: str) -> dict | None:
    for role in DEFAULT_ROLE_TEMPLATES:
        if role["key"] == key:
            return deepcopy(role)
    return None


def get_default_role_documents() -> list[dict]:
    return [deepcopy(role) for role in DEFAULT_ROLE_TEMPLATES]


def get_role_display_name(user: dict) -> str:
    account_role = normalize_account_role(user.get("role"))
    if account_role == "super_admin":
        return "Super Admin"
    if account_role == "admin":
        return user.get("staffRoleName") or "Admin"
    if account_role == "staff":
        return user.get("staffRoleName") or "Staff"
    return "Customer"


def get_default_role_profile_for_user(user: dict) -> dict:
    account_role = normalize_account_role(user.get("role"))
    if account_role == "super_admin":
        return get_default_role_document("super_admin") or {}
    if account_role == "admin":
        return get_default_role_document("admin") or {}
    if account_role == "staff":
        if user.get("staffRoleKey"):
            for template in DEFAULT_ROLE_TEMPLATES:
                if template["key"] == user.get("staffRoleKey"):
                    return deepcopy(template)
        return {
            "permissions": user.get("permissions", []),
            "workspaceAccess": user.get("workspaceAccess", {}),
            "workspaceScopes": user.get("workspaceScopes", {}),
            "responsibilities": user.get("responsibilities", []),
            "sensitivePermissions": user.get("sensitivePermissions", []),
        }
    return {
        "permissions": [],
        "workspaceAccess": {"profile": True},
        "workspaceScopes": {"profile": "all"},
        "responsibilities": [],
        "sensitivePermissions": [],
    }


def normalize_admin_user(user: dict | None) -> dict | None:
    if not user:
        return user

    normalized_user = {**user}
    account_role = normalize_account_role(normalized_user.get("role"))
    role_defaults = normalize_role_profile(
        normalized_user.get("roleDefaults") or get_default_role_profile_for_user(normalized_user),
        account_role,
    )
    overrides = normalized_user.get("permissionOverrides") or {}
    effective = resolve_effective_profile(account_role, role_defaults, overrides)

    # Prefer stored effective fields if present, but normalize them.
    stored_permissions = normalized_user.get("permissions")
    stored_workspace_access = normalized_user.get("workspaceAccess")
    stored_workspace_scopes = normalized_user.get("workspaceScopes")
    stored_responsibilities = normalized_user.get("responsibilities")
    stored_sensitive_permissions = normalized_user.get("sensitivePermissions")

    if stored_permissions is not None:
        effective["permissions"] = ensure_permission_dependencies(stored_permissions)
    if stored_workspace_access is not None:
        effective["workspaceAccess"] = normalize_workspace_access(
            stored_workspace_access,
            effective["permissions"],
            account_role,
        )
    if stored_workspace_scopes is not None:
        effective["workspaceScopes"] = normalize_workspace_scopes(
            stored_workspace_scopes,
            effective["workspaceAccess"],
            account_role,
        )
    if stored_responsibilities is not None:
        effective["responsibilities"] = _unique_list(stored_responsibilities)
    if stored_sensitive_permissions is not None:
        effective["sensitivePermissions"] = ensure_permission_dependencies(
            stored_sensitive_permissions
        )

    can_access_admin = bool(
        normalized_user.get(
            "canAccessAdmin",
            account_role in {"staff", "admin", "super_admin"},
        )
    )

    normalized_user["role"] = account_role
    normalized_user["roleDisplayName"] = get_role_display_name(normalized_user)
    normalized_user["staffStatus"] = (
        normalized_user.get("staffStatus")
        or ("active" if can_access_admin and normalized_user.get("isActive", True) else "inactive")
    )
    normalized_user["permissions"] = effective["permissions"]
    normalized_user["workspaceAccess"] = effective["workspaceAccess"]
    normalized_user["workspaceScopes"] = effective["workspaceScopes"]
    normalized_user["responsibilities"] = effective["responsibilities"]
    normalized_user["sensitivePermissions"] = effective["sensitivePermissions"]
    normalized_user["permissionOverrides"] = effective["permissionOverrides"]
    normalized_user["roleDefaults"] = role_defaults
    normalized_user["isActive"] = bool(normalized_user.get("isActive", True))
    normalized_user["canAccessAdmin"] = bool(can_access_admin and normalized_user["isActive"])
    normalized_user["adminCode"] = normalized_user.get("adminCode") or None
    normalized_user["staffRoleKey"] = normalized_user.get("staffRoleKey") or None
    normalized_user["staffRoleName"] = normalized_user.get("staffRoleName") or None
    return normalized_user


def has_permission(user: dict, permission: str) -> bool:
    normalized_user = normalize_admin_user(user) or {}
    if normalized_user.get("role") == "super_admin":
        return True
    return permission in normalized_user.get("permissions", []) or permission in normalized_user.get("sensitivePermissions", [])


def has_workspace_access(user: dict, workspace: str) -> bool:
    normalized_user = normalize_admin_user(user) or {}
    if normalized_user.get("role") == "super_admin":
        return True
    if not normalized_user.get("canAccessAdmin"):
        return False
    return bool((normalized_user.get("workspaceAccess") or {}).get(workspace, False))


def can_view_sensitive(user: dict, permission: str) -> bool:
    normalized_user = normalize_admin_user(user) or {}
    if normalized_user.get("role") == "super_admin":
        return True
    return permission in normalized_user.get("sensitivePermissions", [])


def get_effective_permissions(role: str, permissions: list[str] | None) -> list[str]:
    account_role = normalize_account_role(role)
    if account_role == "super_admin":
        return list(ALL_ADMIN_PERMISSIONS)
    if permissions is not None:
        return ensure_permission_dependencies(permissions)
    defaults = get_default_role_document("admin" if account_role == "admin" else "operations")
    if not defaults:
        return []
    return ensure_permission_dependencies(defaults.get("permissions", []))


def get_permission_catalog() -> dict:
    return {
        "workspaces": deepcopy(WORKSPACE_PERMISSION_CATALOG),
        "responsibilities": [
            {"key": key, "label": RESPONSIBILITY_LABELS.get(key, key)}
            for key in RESPONSIBILITY_OPTIONS
        ],
        "workspaceLabels": deepcopy(WORKSPACE_LABELS),
        "scopeOptions": [
            {"key": "none", "label": "No access"},
            {"key": "own", "label": "Own records only"},
            {"key": "assigned", "label": "Assigned records only"},
            {"key": "all", "label": "All records"},
        ],
    }


async def ensure_default_staff_roles(db) -> None:
    now = datetime.now(timezone.utc)
    for role in DEFAULT_ROLE_TEMPLATES:
        existing = await db.staff_roles.find_one({"key": role["key"]})
        if existing:
            if existing.get("isSystem"):
                await db.staff_roles.update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            **deepcopy(role),
                            "updatedAt": now,
                            "isActive": existing.get("isActive", True),
                        }
                    },
                )
            continue

        await db.staff_roles.insert_one(
            {
                **deepcopy(role),
                "createdAt": now,
                "updatedAt": now,
                "isActive": True,
                "usageCount": 0,
            }
        )
