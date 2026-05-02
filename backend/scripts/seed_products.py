import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "products.seed.json"


async def seed_products() -> None:
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Seed file not found: {DATA_FILE}")

    products = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)

    normalized_products = []
    for product in products:
        normalized_products.append(
            {
                **product,
                "createdAt": now,
                "updatedAt": now,
            }
        )

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    try:
        if not normalized_products:
            print("No products found in products.seed.json")
            return

        await db.products.delete_many({})
        result = await db.products.insert_many(normalized_products)
        print(f"Inserted {len(result.inserted_ids)} products into the catalog.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_products())
