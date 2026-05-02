import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "categories.seed.json"


async def seed_categories() -> None:
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Seed file not found: {DATA_FILE}")

    categories = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)

    normalized_categories = []
    for category in categories:
        normalized_categories.append(
            {
                **category,
                "createdAt": now,
                "updatedAt": now,
            }
        )

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    try:
        if not normalized_categories:
            print("No categories found in categories.seed.json")
            return

        await db.categories.delete_many({})
        result = await db.categories.insert_many(normalized_categories)
        print(f"Inserted {len(result.inserted_ids)} categories into the catalog.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_categories())
