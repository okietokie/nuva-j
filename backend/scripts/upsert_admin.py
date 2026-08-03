import argparse
import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.admin import get_effective_permissions, normalize_role
from app.core.config import settings
from app.core.security import hash_password


def parse_args():
    parser = argparse.ArgumentParser(
        description="Create or promote a local admin user for development."
    )
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--password", required=True, help="User password")
    parser.add_argument("--name", default="Local Admin", help="Display name")
    parser.add_argument(
        "--role",
        default="admin",
        choices=["admin", "super_admin"],
        help="Admin role to assign",
    )
    return parser.parse_args()


async def upsert_admin() -> None:
    args = parse_args()
    email = args.email.strip().lower()
    role = normalize_role(args.role)
    now = datetime.now(timezone.utc)

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    try:
        existing_user = await db.users.find_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}}
        )
        update_payload = {
            "name": args.name.strip(),
            "email": email,
            "passwordHash": hash_password(args.password),
            "role": role,
            "permissions": get_effective_permissions(role, None),
            "isActive": True,
            "adminCode": None,
            "lastLoginAt": None,
        }

        if existing_user:
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        **update_payload,
                        "updatedAt": now,
                    }
                },
            )
            print(f"Updated existing user '{email}' with role '{role}'.")
        else:
            await db.users.insert_one(
                {
                    **update_payload,
                    "createdAt": now,
                }
            )
            print(f"Created new user '{email}' with role '{role}'.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(upsert_admin())
