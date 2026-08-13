from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4
from urllib.parse import urlparse

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from jose import JWTError, jwt

from app.core.admin import has_permission
from app.core.config import settings
from app.db.mongodb import get_database
from app.dependencies.auth import get_current_user, require_permission
from app.schemas.website import (
    WebsiteDiscardRequest,
    WebsiteDraftUpdate,
    WebsitePreviewTokenRequest,
    WebsitePublishRequest,
    WebsiteRestoreRequest,
    WebsiteScheduleRequest,
)
from app.utils.serializers import serialize_document, serialize_many

router = APIRouter(prefix="/website", tags=["Website"])

STORE_CONFIG_KEY = "storefront"
SUPPORTED_SECTION_TYPES = {"hero", "brand_story", "new_arrivals", "featured_products"}
SUPPORTED_INTERNAL_ROUTES = {
    "/",
    "/shop",
    "/cart",
    "/wishlist",
    "/orders",
    "/login",
    "/register",
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def maybe_object_id(value: str | None) -> ObjectId | None:
    if value and ObjectId.is_valid(value):
        return ObjectId(value)
    return None


def create_preview_token(*, mode: str, path: str) -> str:
    expires_at = now_utc() + timedelta(minutes=20)
    payload = {
        "type": "website_preview",
        "mode": mode,
        "path": path,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_preview_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as error:
        raise HTTPException(status_code=401, detail="Invalid or expired preview token.") from error

    if payload.get("type") != "website_preview":
        raise HTTPException(status_code=401, detail="Invalid preview token.")
    return payload


def is_safe_external_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def is_supported_internal_route(value: str) -> bool:
    if not value:
        return False
    if value in SUPPORTED_INTERNAL_ROUTES:
        return True
    if value.startswith("/shop?"):
        return True
    if value.startswith("/products/"):
        return True
    return False


def is_valid_link(value: str) -> bool:
    if not value:
        return False
    if value.startswith("/"):
        return is_supported_internal_route(value)
    return is_safe_external_url(value)


def build_default_storefront_config() -> dict:
    return {
        "announcement": {
            "visible": True,
            "message": "Complimentary UAE delivery on orders above AED 250.00",
            "destination": "/shop",
            "startAt": None,
            "endAt": None,
            "timezone": "Asia/Dubai",
        },
        "navigation": {
            "headerLinks": [
                {"id": "shop", "label": "Shop", "href": "/shop", "visible": True, "essential": True},
                {"id": "earrings", "label": "Earrings", "href": "/shop?category=Earrings", "visible": True, "essential": False},
                {"id": "collections", "label": "Collections", "href": "/shop", "visible": True, "essential": False},
            ],
            "footerGroups": [
                {
                    "id": "shop",
                    "label": "Shop",
                    "links": [
                        {"id": "all-products", "label": "All Products", "href": "/shop", "visible": True, "essential": True},
                        {"id": "new-in", "label": "New In", "href": "/shop?sort=newest", "visible": True, "essential": False},
                        {"id": "wishlist", "label": "Wishlist", "href": "/wishlist", "visible": True, "essential": False},
                        {"id": "cart", "label": "Cart", "href": "/cart", "visible": True, "essential": True},
                    ],
                },
                {
                    "id": "customer-care",
                    "label": "Customer Care",
                    "links": [
                        {"id": "account", "label": "My Account", "href": "/orders", "visible": True, "essential": True},
                        {"id": "faq", "label": "FAQ", "href": "/shop", "visible": True, "essential": False},
                        {"id": "delivery", "label": "Delivery Information", "href": "/shop", "visible": True, "essential": False},
                        {"id": "care", "label": "Jewellery Care", "href": "/shop", "visible": True, "essential": False},
                        {"id": "privacy", "label": "Privacy Policy", "href": "/shop", "visible": True, "essential": False},
                    ],
                },
            ],
        },
        "social": {
            "instagramUrl": "",
            "whatsappNumber": "",
        },
        "seo": {
            "home": {
                "browserTitle": "NUVA Jewellery",
                "metaDescription": "Modern jewellery, styled for easy everyday shopping.",
                "socialTitle": "NUVA Jewellery",
                "socialDescription": "Modern jewellery, styled for easy everyday shopping.",
                "socialImageUrl": "/nuva-hero-editorial.png",
                "canonicalPath": "/",
                "noIndex": False,
            }
        },
        "homepageSections": [
            {
                "id": "hero-primary",
                "type": "hero",
                "visible": True,
                "locked": True,
                "title": "Jewellery for every day.",
                "subtitle": "Everyday Styling",
                "body": "Modern jewellery, styled for easy everyday shopping.",
                "desktopImageUrl": "/nuva-hero-editorial.png",
                "mobileImageUrl": "",
                "imageAlt": "NUVA jewellery editorial hero",
                "primaryCtaLabel": "Shop New Arrivals",
                "primaryCtaHref": "/shop?sort=newest",
                "secondaryCtaLabel": "Explore Collections",
                "secondaryCtaHref": "/shop",
                "textAlign": "left",
                "textTone": "light",
                "overlayStrength": "medium",
                "startAt": None,
                "endAt": None,
            },
            {
                "id": "brand-story",
                "type": "brand_story",
                "visible": True,
                "locked": True,
                "title": "Jewellery for the way you move",
                "subtitle": "Brand Story",
                "body": "NUVA brings together soft shine, easy styling, and pieces chosen to slip naturally into everyday dressing.",
                "startAt": None,
                "endAt": None,
            },
            {
                "id": "new-arrivals",
                "type": "new_arrivals",
                "visible": True,
                "locked": False,
                "title": "Fresh additions to the edit.",
                "subtitle": "New Arrivals",
                "body": "",
                "ctaLabel": "View All",
                "ctaHref": "/shop?sort=newest",
                "selectionMode": "rule_new_arrivals",
                "productIds": [],
                "categoryId": "",
                "limit": 4,
                "startAt": None,
                "endAt": None,
            },
            {
                "id": "featured-products",
                "type": "featured_products",
                "visible": True,
                "locked": False,
                "title": "Pieces we are highlighting right now.",
                "subtitle": "Featured Selection",
                "body": "",
                "ctaLabel": "",
                "ctaHref": "",
                "selectionMode": "rule_featured",
                "productIds": [],
                "categoryId": "",
                "limit": 4,
                "startAt": None,
                "endAt": None,
            },
        ],
    }


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_link_items(items: list[dict] | None) -> list[dict]:
    normalized = []
    for index, item in enumerate(items or []):
        normalized.append(
            {
                "id": normalize_text(item.get("id")) or uuid4().hex,
                "label": normalize_text(item.get("label")),
                "href": normalize_text(item.get("href")),
                "visible": bool(item.get("visible", True)),
                "essential": bool(item.get("essential", False)),
                "position": index,
            }
        )
    return normalized


def normalize_footer_groups(groups: list[dict] | None) -> list[dict]:
    normalized = []
    for index, group in enumerate(groups or []):
        normalized.append(
            {
                "id": normalize_text(group.get("id")) or uuid4().hex,
                "label": normalize_text(group.get("label")) or f"Footer Group {index + 1}",
                "links": normalize_link_items(group.get("links") or []),
                "position": index,
            }
        )
    return normalized


def normalize_homepage_sections(sections: list[dict] | None) -> list[dict]:
    normalized = []
    for index, raw in enumerate(sections or []):
        section_type = normalize_text(raw.get("type"))
        if section_type not in SUPPORTED_SECTION_TYPES:
            continue

        normalized.append(
            {
                "id": normalize_text(raw.get("id")) or uuid4().hex,
                "type": section_type,
                "visible": bool(raw.get("visible", True)),
                "locked": bool(raw.get("locked", False)),
                "title": normalize_text(raw.get("title")),
                "subtitle": normalize_text(raw.get("subtitle")),
                "body": normalize_text(raw.get("body")),
                "desktopImageUrl": normalize_text(raw.get("desktopImageUrl")),
                "mobileImageUrl": normalize_text(raw.get("mobileImageUrl")),
                "imageAlt": normalize_text(raw.get("imageAlt")),
                "primaryCtaLabel": normalize_text(raw.get("primaryCtaLabel")),
                "primaryCtaHref": normalize_text(raw.get("primaryCtaHref")),
                "secondaryCtaLabel": normalize_text(raw.get("secondaryCtaLabel")),
                "secondaryCtaHref": normalize_text(raw.get("secondaryCtaHref")),
                "ctaLabel": normalize_text(raw.get("ctaLabel")),
                "ctaHref": normalize_text(raw.get("ctaHref")),
                "selectionMode": normalize_text(raw.get("selectionMode")) or ("manual" if section_type == "featured_products" else "rule_new_arrivals"),
                "productIds": [normalize_text(item) for item in raw.get("productIds", []) if normalize_text(item)],
                "categoryId": normalize_text(raw.get("categoryId")),
                "limit": max(1, min(12, int(raw.get("limit") or 4))),
                "textAlign": normalize_text(raw.get("textAlign")) or "left",
                "textTone": normalize_text(raw.get("textTone")) or "light",
                "overlayStrength": normalize_text(raw.get("overlayStrength")) or "medium",
                "startAt": raw.get("startAt"),
                "endAt": raw.get("endAt"),
                "position": index,
            }
        )
    return normalized


def normalize_storefront_config(config: dict | None) -> dict:
    merged = deepcopy(build_default_storefront_config())
    source = config or {}

    announcement = source.get("announcement") or {}
    merged["announcement"].update(
        {
            "visible": bool(announcement.get("visible", merged["announcement"]["visible"])),
            "message": normalize_text(announcement.get("message")) or merged["announcement"]["message"],
            "destination": normalize_text(announcement.get("destination")),
            "startAt": announcement.get("startAt"),
            "endAt": announcement.get("endAt"),
            "timezone": normalize_text(announcement.get("timezone")) or "Asia/Dubai",
        }
    )

    navigation = source.get("navigation") or {}
    merged["navigation"] = {
        "headerLinks": normalize_link_items(navigation.get("headerLinks") or merged["navigation"]["headerLinks"]),
        "footerGroups": normalize_footer_groups(navigation.get("footerGroups") or merged["navigation"]["footerGroups"]),
    }

    social = source.get("social") or {}
    merged["social"] = {
        "instagramUrl": normalize_text(social.get("instagramUrl")),
        "whatsappNumber": normalize_text(social.get("whatsappNumber")),
    }

    seo_home = ((source.get("seo") or {}).get("home")) or {}
    merged["seo"] = {
        "home": {
            "browserTitle": normalize_text(seo_home.get("browserTitle")) or merged["seo"]["home"]["browserTitle"],
            "metaDescription": normalize_text(seo_home.get("metaDescription")) or merged["seo"]["home"]["metaDescription"],
            "socialTitle": normalize_text(seo_home.get("socialTitle")) or merged["seo"]["home"]["socialTitle"],
            "socialDescription": normalize_text(seo_home.get("socialDescription")) or merged["seo"]["home"]["socialDescription"],
            "socialImageUrl": normalize_text(seo_home.get("socialImageUrl")) or merged["seo"]["home"]["socialImageUrl"],
            "canonicalPath": normalize_text(seo_home.get("canonicalPath")) or "/",
            "noIndex": bool(seo_home.get("noIndex", False)),
        }
    }

    merged["homepageSections"] = normalize_homepage_sections(source.get("homepageSections") or merged["homepageSections"])
    return merged


def change_kind_for_field(field: str) -> str:
    mapping = {
        "homepageSections": "layout",
        "navigation": "navigation",
        "announcement": "announcement",
        "seo": "seo",
        "social": "content",
    }
    return mapping.get(field, "content")


def enforce_edit_permissions(user: dict, current_draft: dict, next_draft: dict) -> None:
    changed_fields = [
        key
        for key in ("homepageSections", "navigation", "announcement", "seo", "social")
        if current_draft.get(key) != next_draft.get(key)
    ]
    if not changed_fields:
        return

    section_map = {section["id"]: section for section in current_draft.get("homepageSections", [])}
    next_section_map = {section["id"]: section for section in next_draft.get("homepageSections", [])}

    for field in changed_fields:
        kind = change_kind_for_field(field)
        if kind == "navigation" and not has_permission(user, "website.manage_navigation"):
            raise HTTPException(status_code=403, detail="Missing permission: website.manage_navigation")
        if kind == "announcement" and not has_permission(user, "website.manage_announcements"):
            raise HTTPException(status_code=403, detail="Missing permission: website.manage_announcements")
        if kind == "seo" and not has_permission(user, "website.manage_seo"):
            raise HTTPException(status_code=403, detail="Missing permission: website.manage_seo")

    if current_draft.get("homepageSections") != next_draft.get("homepageSections"):
        current_ids = [section["id"] for section in current_draft.get("homepageSections", [])]
        next_ids = [section["id"] for section in next_draft.get("homepageSections", [])]
        if current_ids != next_ids and not has_permission(user, "website.edit_layout"):
            raise HTTPException(status_code=403, detail="Missing permission: website.edit_layout")

        for section in next_draft.get("homepageSections", []):
            current_section = section_map.get(section["id"])
            if section["type"] == "featured_products" and current_section != section:
                if not has_permission(user, "website.manage_featured_products"):
                    raise HTTPException(status_code=403, detail="Missing permission: website.manage_featured_products")
            elif section["type"] == "new_arrivals" and current_section != section:
                if not has_permission(user, "website.edit_content"):
                    raise HTTPException(status_code=403, detail="Missing permission: website.edit_content")
            elif current_section != section and not has_permission(user, "website.edit_content"):
                raise HTTPException(status_code=403, detail="Missing permission: website.edit_content")

        for removed_id, removed_section in section_map.items():
            if removed_id not in next_section_map:
                if removed_section.get("locked"):
                    raise HTTPException(status_code=400, detail="Essential homepage sections cannot be removed.")
                if not has_permission(user, "website.edit_layout"):
                    raise HTTPException(status_code=403, detail="Missing permission: website.edit_layout")


async def get_or_create_storefront_state(db) -> dict:
    existing = await db.website_configs.find_one({"key": STORE_CONFIG_KEY})
    if existing:
        return existing

    default_config = normalize_storefront_config(None)
    now = now_utc()
    document = {
        "key": STORE_CONFIG_KEY,
        "publishedConfig": default_config,
        "draftConfig": default_config,
        "publishedVersion": 1,
        "draftUpdatedAt": now,
        "draftUpdatedBy": None,
        "lastPublishedAt": now,
        "lastPublishedBy": None,
        "scheduledConfig": None,
        "scheduledPublishAt": None,
        "scheduledBy": None,
        "draftLastPreviewedAt": None,
        "draftPreviewPath": "/",
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.website_configs.insert_one(document)
    created = await db.website_configs.find_one({"_id": result.inserted_id})
    await db.website_versions.insert_one(
        {
            "websiteConfigId": created["_id"],
            "versionNumber": 1,
            "publishType": "initial",
            "changeSummary": ["Initial website configuration created."],
            "config": default_config,
            "publishedAt": now,
            "publishedBy": None,
            "currentLive": True,
        }
    )
    return created


async def write_website_audit(
    db,
    *,
    action: str,
    actor: dict | None,
    affected_section: str | None = None,
    previous_value: Any = None,
    new_value: Any = None,
) -> None:
    await db.website_audit_logs.insert_one(
        {
            "action": action,
            "affectedSection": affected_section,
            "previousValue": previous_value,
            "newValue": new_value,
            "actorId": maybe_object_id((actor or {}).get("id")),
            "actorName": (actor or {}).get("name"),
            "actorEmail": (actor or {}).get("email"),
            "createdAt": now_utc(),
        }
    )


def ensure_expected_timestamp(expected: datetime | None, actual: datetime | None) -> None:
    if expected and actual and expected != actual:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The website draft changed after you opened it. Refresh and review the latest draft before saving.",
        )


def diff_summary(previous: dict, current: dict) -> list[str]:
    summary: list[str] = []
    previous_ids = [section["id"] for section in previous.get("homepageSections", [])]
    current_ids = [section["id"] for section in current.get("homepageSections", [])]
    if previous_ids != current_ids:
        summary.append("Homepage section order changed.")

    previous_sections = {section["id"]: section for section in previous.get("homepageSections", [])}
    for section in current.get("homepageSections", []):
        earlier = previous_sections.get(section["id"])
        if not earlier:
            summary.append(f"{section['title'] or section['type']} section added.")
            continue
        if earlier.get("visible") != section.get("visible"):
            visibility = "shown" if section.get("visible") else "hidden"
            summary.append(f"{section['title'] or section['type']} section {visibility}.")
        if earlier.get("title") != section.get("title"):
            summary.append(f"{section['type'].replace('_', ' ').title()} heading updated.")
        if section["type"] == "featured_products" and earlier.get("productIds") != section.get("productIds"):
            delta = abs(len(section.get("productIds", [])) - len(earlier.get("productIds", [])))
            summary.append(f"Featured products updated ({delta} selection change{'s' if delta != 1 else ''}).")

    if previous.get("announcement") != current.get("announcement"):
        summary.append("Announcement settings changed.")
    if previous.get("navigation") != current.get("navigation"):
        summary.append("Navigation or footer links updated.")
    if previous.get("seo") != current.get("seo"):
        summary.append("Homepage SEO settings changed.")
    return summary or ["Website draft updated."]


async def build_validation_report(db, config: dict) -> dict:
    checks: list[dict] = []
    products = await db.products.find({}).to_list(length=None)
    categories = await db.categories.find({}).to_list(length=None)
    product_map = {str(product["_id"]): serialize_document(product) for product in products}
    category_map = {str(category["_id"]): serialize_document(category) for category in categories}

    def add_check(level: str, location: str, message: str, why: str, fix: str) -> None:
        checks.append(
            {
                "level": level,
                "location": location,
                "message": message,
                "why": why,
                "fix": fix,
            }
        )

    announcement = config.get("announcement") or {}
    if announcement.get("visible") and not normalize_text(announcement.get("message")):
        add_check("blocking", "Announcement", "Visible announcement is empty.", "Customers would see a blank promotion bar.", "Add announcement copy or hide the announcement bar.")
    if announcement.get("destination") and not is_valid_link(announcement["destination"]):
        add_check("blocking", "Announcement", "Announcement destination is invalid.", "Broken links damage trust and preview accuracy.", "Choose a supported internal route or a safe external URL.")

    header_links = (config.get("navigation") or {}).get("headerLinks", [])
    seen_links: set[tuple[str, str]] = set()
    for link in header_links:
        key = (link.get("label", ""), link.get("href", ""))
        if key in seen_links:
            add_check("warning", "Header Navigation", f"Duplicate navigation link: {link.get('label')}.", "Repeated navigation items create confusion.", "Remove duplicates or change the label or destination.")
        seen_links.add(key)
        if link.get("visible") and not is_valid_link(link.get("href", "")):
            add_check("blocking", "Header Navigation", f"Invalid link for {link.get('label') or 'navigation item'}.", "Customers would reach an unsupported route.", "Choose a valid storefront route or safe external URL.")
        if link.get("essential") and not link.get("visible"):
            add_check("warning", "Header Navigation", f"Essential link {link.get('label')} is hidden.", "Removing core discovery routes can block storefront navigation.", "Keep essential storefront links visible.")

    for group in (config.get("navigation") or {}).get("footerGroups", []):
        for link in group.get("links", []):
            if link.get("visible") and not is_valid_link(link.get("href", "")):
                add_check("blocking", f"Footer: {group.get('label')}", f"Invalid footer link for {link.get('label') or 'footer item'}.", "Customers would hit a broken destination.", "Choose a valid route or safe external URL.")

    seo_home = ((config.get("seo") or {}).get("home")) or {}
    if len(normalize_text(seo_home.get("browserTitle"))) < 10:
        add_check("warning", "SEO", "Homepage browser title is very short.", "Short titles weaken search and sharing clarity.", "Expand the browser title to better describe the storefront.")
    if len(normalize_text(seo_home.get("metaDescription"))) < 40:
        add_check("warning", "SEO", "Homepage meta description is too short.", "Thin descriptions reduce search and sharing quality.", "Add a fuller meta description.")
    if seo_home.get("canonicalPath") and not is_supported_internal_route(normalize_text(seo_home.get("canonicalPath"))):
        add_check("blocking", "SEO", "Canonical path is not supported.", "Incorrect canonicals can mislead search engines.", "Use a real storefront path such as '/'.")
    if seo_home.get("noIndex"):
        add_check("warning", "SEO", "Homepage is marked no-index.", "A hidden homepage may disappear from search results.", "Confirm the no-index setting is intentional before publishing.")

    for section in config.get("homepageSections", []):
        title = section.get("title") or section.get("type")
        if section.get("type") == "hero":
            if section.get("visible") and not normalize_text(section.get("desktopImageUrl")):
                add_check("blocking", title, "Hero desktop image is missing.", "The homepage hero would render incomplete on large screens.", "Add a desktop hero image before publishing.")
            if section.get("visible") and not normalize_text(section.get("imageAlt")):
                add_check("blocking", title, "Hero image alt text is missing.", "Meaningful images need alt text for accessibility.", "Add descriptive alt text.")
            if section.get("primaryCtaHref") and not normalize_text(section.get("primaryCtaLabel")):
                add_check("blocking", title, "Hero primary CTA label is missing.", "Customers would see an unlabeled button.", "Add a CTA label or remove the destination.")
            if section.get("primaryCtaHref") and not is_valid_link(section.get("primaryCtaHref")):
                add_check("blocking", title, "Hero primary CTA destination is invalid.", "A broken CTA would send customers nowhere.", "Choose a supported route or safe external URL.")
        if section.get("type") == "featured_products":
            if section.get("visible") and section.get("selectionMode") == "manual" and not section.get("productIds"):
                add_check("blocking", title, "Featured products section is empty.", "Customers would see a featured area without products.", "Select products or hide the section.")
            for product_id in section.get("productIds", []):
                product = product_map.get(product_id)
                if not product:
                    add_check("blocking", title, "A featured product reference is missing.", "Deleted product references break storefront selections.", "Remove missing products from this section.")
                    continue
                if product.get("status") != "active":
                    add_check("warning", title, f"{product.get('name')} is not active.", "Inactive products should not be featured publicly.", "Choose active products before publishing.")
                if product.get("visibility") != "visible":
                    add_check("warning", title, f"{product.get('name')} is hidden.", "Hidden products can disappear from the live storefront.", "Unhide the product or remove it from the section.")
                if not product.get("images"):
                    add_check("warning", title, f"{product.get('name')} has no product image.", "Storefront cards need imagery to look complete.", "Add product imagery or remove the product from the section.")
                if float(product.get("price") or 0) <= 0:
                    add_check("warning", title, f"{product.get('name')} has invalid pricing.", "Products without a valid price create customer confusion.", "Fix pricing before featuring the product.")
                if int(product.get("stock") or 0) <= 0:
                    add_check("warning", title, f"{product.get('name')} is out of stock.", "Featuring sold-out items can hurt conversion.", "Replace it or confirm the storefront should still show sold-out products.")
        if section.get("categoryId") and section.get("categoryId") not in category_map:
            add_check("warning", title, "Selected category no longer exists.", "Broken category references weaken rule-based sections.", "Choose a valid category or remove the category filter.")

    blocking = len([check for check in checks if check["level"] == "blocking"])
    warnings = len([check for check in checks if check["level"] == "warning"])
    return {
        "checks": checks,
        "summary": {
            "blocking": blocking,
            "warnings": warnings,
            "passed": max(0, 1 if not checks else 0),
        },
    }


async def publish_config(
    db,
    *,
    state: dict,
    config: dict,
    actor: dict | None,
    publish_type: str,
    scheduled_for: datetime | None = None,
) -> dict:
    version_number = int(state.get("publishedVersion") or 0) + 1
    summary = diff_summary(state.get("publishedConfig") or {}, config)
    now = now_utc()

    await db.website_versions.update_many(
        {"websiteConfigId": state["_id"], "currentLive": True},
        {"$set": {"currentLive": False}},
    )
    await db.website_versions.insert_one(
        {
            "websiteConfigId": state["_id"],
            "versionNumber": version_number,
            "publishType": publish_type,
            "changeSummary": summary,
            "config": config,
            "publishedAt": now,
            "publishedBy": maybe_object_id((actor or {}).get("id")),
            "publishedByName": (actor or {}).get("name"),
            "publishedByEmail": (actor or {}).get("email"),
            "currentLive": True,
            "scheduledFor": scheduled_for,
        }
    )

    update_payload = {
        "publishedConfig": config,
        "draftConfig": config,
        "publishedVersion": version_number,
        "lastPublishedAt": now,
        "lastPublishedBy": {
            "id": (actor or {}).get("id"),
            "name": (actor or {}).get("name"),
            "email": (actor or {}).get("email"),
        },
        "scheduledConfig": None,
        "scheduledPublishAt": None,
        "scheduledBy": None,
        "draftUpdatedAt": now,
        "draftUpdatedBy": {
            "id": (actor or {}).get("id"),
            "name": (actor or {}).get("name"),
            "email": (actor or {}).get("email"),
        },
        "updatedAt": now,
    }
    await db.website_configs.update_one({"_id": state["_id"]}, {"$set": update_payload})
    await write_website_audit(
        db,
        action="website.published" if publish_type != "restored" else "website.restored",
        actor=actor,
        affected_section="storefront",
        previous_value={"version": state.get("publishedVersion")},
        new_value={"version": version_number, "publishType": publish_type},
    )
    return await db.website_configs.find_one({"_id": state["_id"]})


async def apply_due_schedule(db, state: dict) -> dict:
    scheduled_at = state.get("scheduledPublishAt")
    scheduled_config = state.get("scheduledConfig")
    if not scheduled_at or not scheduled_config or scheduled_at > now_utc():
        return state
    return await publish_config(
        db,
        state=state,
        config=scheduled_config,
        actor=state.get("scheduledBy"),
        publish_type="scheduled",
        scheduled_for=scheduled_at,
    )


def build_public_storefront_payload(config: dict, mode: str) -> dict:
    return {
        "mode": mode,
        "announcement": config.get("announcement") or {},
        "navigation": config.get("navigation") or {},
        "social": config.get("social") or {},
        "seo": config.get("seo") or {},
        "homepageSections": config.get("homepageSections") or [],
    }


async def build_workspace_payload(db, current_user: dict) -> dict:
    state = await apply_due_schedule(db, await get_or_create_storefront_state(db))
    draft = normalize_storefront_config(state.get("draftConfig"))
    published = normalize_storefront_config(state.get("publishedConfig"))
    validation = await build_validation_report(db, draft)
    versions = await db.website_versions.find({"websiteConfigId": state["_id"]}).sort("versionNumber", -1).to_list(length=20)
    audit = await db.website_audit_logs.find({}).sort("createdAt", -1).to_list(length=20)
    products = await db.products.find({}).sort("updatedAt", -1).to_list(length=80)
    categories = await db.categories.find({}).sort("name", 1).to_list(length=80)

    first_visible_product = next(
        (
            serialize_document(product)
            for product in products
            if product.get("status") == "active" and product.get("visibility") == "visible"
        ),
        None,
    )
    active_sections = [section for section in draft.get("homepageSections", []) if section.get("visible")]
    hidden_sections = [section for section in draft.get("homepageSections", []) if not section.get("visible")]
    featured_count = sum(
        len(section.get("productIds", []))
        for section in draft.get("homepageSections", [])
        if section.get("type") == "featured_products"
    )

    return {
        "state": {
            "id": str(state["_id"]),
            "draft": draft,
            "published": published,
            "draftUpdatedAt": state.get("draftUpdatedAt"),
            "draftUpdatedBy": state.get("draftUpdatedBy"),
            "draftLastPreviewedAt": state.get("draftLastPreviewedAt"),
            "lastPublishedAt": state.get("lastPublishedAt"),
            "lastPublishedBy": state.get("lastPublishedBy"),
            "publishedVersion": state.get("publishedVersion", 1),
            "scheduledPublishAt": state.get("scheduledPublishAt"),
            "scheduledBy": state.get("scheduledBy"),
            "hasUnpublishedChanges": draft != published,
        },
        "status": {
            "live": "Live",
            "draft": "Unpublished changes" if draft != published else "Draft matches live",
        },
        "summary": {
            "activeSections": len(active_sections),
            "hiddenSections": len(hidden_sections),
            "featuredProducts": featured_count,
            "announcementVisible": bool((draft.get("announcement") or {}).get("visible")),
            "blockingIssues": validation["summary"]["blocking"],
            "warnings": validation["summary"]["warnings"],
        },
        "pageShortcuts": [
            {"label": "Home", "path": "/"},
            {"label": "Shop", "path": "/shop"},
            {"label": "Cart", "path": "/cart"},
            {"label": "Wishlist", "path": "/wishlist"},
            {"label": "My Account", "path": "/orders"},
            {"label": "Product Page Preview", "path": f"/products/{first_visible_product['slug']}" if first_visible_product else "/shop"},
        ],
        "validation": validation,
        "versions": serialize_many(versions),
        "audit": serialize_many(audit),
        "catalogProducts": [
            {
                "id": str(product["_id"]),
                "name": product.get("name"),
                "slug": product.get("slug"),
                "sku": product.get("sku"),
                "categoryId": product.get("categoryId"),
                "categoryName": product.get("categoryName"),
                "status": product.get("status"),
                "visibility": product.get("visibility"),
                "stock": product.get("stock"),
                "price": product.get("price"),
                "images": product.get("images", []),
                "isFeatured": bool(product.get("isFeatured")),
                "isNewArrival": bool(product.get("isNewArrival")),
            }
            for product in products
        ],
        "categories": serialize_many(categories),
        "permissions": {
            "canView": has_permission(current_user, "website.view"),
            "canPreview": has_permission(current_user, "website.preview"),
            "canEditContent": has_permission(current_user, "website.edit_content"),
            "canEditLayout": has_permission(current_user, "website.edit_layout"),
            "canManageFeaturedProducts": has_permission(current_user, "website.manage_featured_products"),
            "canManageNavigation": has_permission(current_user, "website.manage_navigation"),
            "canManageAnnouncements": has_permission(current_user, "website.manage_announcements"),
            "canManageSeo": has_permission(current_user, "website.manage_seo"),
            "canPublish": has_permission(current_user, "website.publish"),
            "canSchedule": has_permission(current_user, "website.schedule"),
            "canRestoreVersion": has_permission(current_user, "website.restore_version"),
        },
    }


@router.get("/config")
async def get_public_storefront_config(
    preview_token: str | None = Query(default=None, alias="previewToken"),
):
    db = get_database()
    state = await apply_due_schedule(db, await get_or_create_storefront_state(db))
    if preview_token:
        payload = decode_preview_token(preview_token)
        config = normalize_storefront_config(state.get("draftConfig"))
        return build_public_storefront_payload(config, payload.get("mode", "draft"))
    return build_public_storefront_payload(normalize_storefront_config(state.get("publishedConfig")), "published")


@router.get("/admin/workspace")
async def get_website_workspace(current_user=Depends(require_permission("website.view"))):
    db = get_database()
    return await build_workspace_payload(db, current_user)


@router.put("/admin/draft")
async def update_website_draft(
    payload: WebsiteDraftUpdate,
    current_user=Depends(require_permission("website.view")),
):
    db = get_database()
    state = await get_or_create_storefront_state(db)
    ensure_expected_timestamp(payload.expectedUpdatedAt, state.get("draftUpdatedAt"))

    next_draft = normalize_storefront_config(payload.draft)
    current_draft = normalize_storefront_config(state.get("draftConfig"))
    enforce_edit_permissions(current_user, current_draft, next_draft)

    now = now_utc()
    await db.website_configs.update_one(
        {"_id": state["_id"]},
        {
            "$set": {
                "draftConfig": next_draft,
                "draftUpdatedAt": now,
                "draftUpdatedBy": {
                    "id": current_user.get("id"),
                    "name": current_user.get("name"),
                    "email": current_user.get("email"),
                },
                "scheduledConfig": None,
                "scheduledPublishAt": None,
                "scheduledBy": None,
                "updatedAt": now,
            }
        },
    )
    await write_website_audit(
        db,
        action="website.draft.updated",
        actor=current_user,
        affected_section="storefront",
        previous_value={"summary": diff_summary(current_draft, current_draft)},
        new_value={"summary": diff_summary(current_draft, next_draft)},
    )
    return await build_workspace_payload(db, current_user)


@router.post("/admin/preview-token")
async def issue_website_preview_token(
    payload: WebsitePreviewTokenRequest,
    current_user=Depends(require_permission("website.preview")),
):
    db = get_database()
    state = await get_or_create_storefront_state(db)
    now = now_utc()
    await db.website_configs.update_one(
        {"_id": state["_id"]},
        {
            "$set": {
                "draftLastPreviewedAt": now,
                "draftPreviewPath": payload.path,
                "updatedAt": now,
            }
        },
    )
    return {
        "token": create_preview_token(mode=payload.mode, path=payload.path),
        "expiresAt": now + timedelta(minutes=20),
        "path": payload.path,
    }


@router.post("/admin/publish")
async def publish_website_changes(
    payload: WebsitePublishRequest,
    current_user=Depends(require_permission("website.publish")),
):
    db = get_database()
    state = await get_or_create_storefront_state(db)
    ensure_expected_timestamp(payload.expectedUpdatedAt, state.get("draftUpdatedAt"))
    validation = await build_validation_report(db, normalize_storefront_config(state.get("draftConfig")))
    if validation["summary"]["blocking"] > 0:
        raise HTTPException(status_code=400, detail="Publishing is blocked until all blocking website checks are resolved.")
    await publish_config(
        db,
        state=state,
        config=normalize_storefront_config(state.get("draftConfig")),
        actor=current_user,
        publish_type="immediate",
    )
    return await build_workspace_payload(db, current_user)


@router.post("/admin/schedule")
async def schedule_website_changes(
    payload: WebsiteScheduleRequest,
    current_user=Depends(require_permission("website.schedule")),
):
    db = get_database()
    state = await get_or_create_storefront_state(db)
    ensure_expected_timestamp(payload.expectedUpdatedAt, state.get("draftUpdatedAt"))
    if payload.publishAt <= now_utc():
        raise HTTPException(status_code=400, detail="Scheduled publication must be set to a future date and time.")

    validation = await build_validation_report(db, normalize_storefront_config(state.get("draftConfig")))
    if validation["summary"]["blocking"] > 0:
        raise HTTPException(status_code=400, detail="Scheduling is blocked until all blocking website checks are resolved.")

    await db.website_configs.update_one(
        {"_id": state["_id"]},
        {
            "$set": {
                "scheduledConfig": normalize_storefront_config(state.get("draftConfig")),
                "scheduledPublishAt": payload.publishAt,
                "scheduledBy": {
                    "id": current_user.get("id"),
                    "name": current_user.get("name"),
                    "email": current_user.get("email"),
                },
                "updatedAt": now_utc(),
            }
        },
    )
    await write_website_audit(
        db,
        action="website.scheduled",
        actor=current_user,
        affected_section="storefront",
        previous_value=None,
        new_value={"publishAt": payload.publishAt.isoformat()},
    )
    return await build_workspace_payload(db, current_user)


@router.post("/admin/discard")
async def discard_website_draft(
    payload: WebsiteDiscardRequest,
    current_user=Depends(require_permission("website.edit_content")),
):
    db = get_database()
    state = await get_or_create_storefront_state(db)
    ensure_expected_timestamp(payload.expectedUpdatedAt, state.get("draftUpdatedAt"))
    now = now_utc()
    await db.website_configs.update_one(
        {"_id": state["_id"]},
        {
            "$set": {
                "draftConfig": normalize_storefront_config(state.get("publishedConfig")),
                "draftUpdatedAt": now,
                "draftUpdatedBy": {
                    "id": current_user.get("id"),
                    "name": current_user.get("name"),
                    "email": current_user.get("email"),
                },
                "scheduledConfig": None,
                "scheduledPublishAt": None,
                "scheduledBy": None,
                "updatedAt": now,
            }
        },
    )
    await write_website_audit(
        db,
        action="website.draft.discarded",
        actor=current_user,
        affected_section="storefront",
        previous_value={"draftUpdatedAt": state.get("draftUpdatedAt")},
        new_value={"resetToVersion": state.get("publishedVersion")},
    )
    return await build_workspace_payload(db, current_user)


@router.get("/admin/versions")
async def get_website_versions(current_user=Depends(require_permission("website.view"))):
    db = get_database()
    state = await get_or_create_storefront_state(db)
    versions = await db.website_versions.find({"websiteConfigId": state["_id"]}).sort("versionNumber", -1).to_list(length=50)
    return serialize_many(versions)


@router.post("/admin/versions/{version_id}/restore")
async def restore_website_version(
    version_id: str,
    payload: WebsiteRestoreRequest,
    current_user=Depends(require_permission("website.restore_version")),
):
    if not ObjectId.is_valid(version_id):
        raise HTTPException(status_code=400, detail="Invalid version id.")
    db = get_database()
    state = await get_or_create_storefront_state(db)
    ensure_expected_timestamp(payload.expectedUpdatedAt, state.get("draftUpdatedAt"))
    version = await db.website_versions.find_one({"_id": ObjectId(version_id), "websiteConfigId": state["_id"]})
    if not version:
        raise HTTPException(status_code=404, detail="Website version not found.")

    await publish_config(
        db,
        state=state,
        config=normalize_storefront_config(version.get("config")),
        actor=current_user,
        publish_type="restored",
    )
    return await build_workspace_payload(db, current_user)


@router.get("/admin/history")
async def get_website_history(current_user=Depends(require_permission("website.view"))):
    db = get_database()
    audit = await db.website_audit_logs.find({}).sort("createdAt", -1).to_list(length=100)
    return serialize_many(audit)


@router.get("/admin/me")
async def get_website_current_user(current_user=Depends(get_current_user)):
    return current_user
