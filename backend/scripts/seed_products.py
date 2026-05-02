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

        category_documents = await db.categories.find().to_list(length=None)
        category_by_slug = {category["slug"]: category for category in category_documents}
        category_by_name = {category["name"]: category for category in category_documents}

        prepared_products = []
        for product in normalized_products:
            category = category_by_slug.get(product.get("categoryId")) or category_by_name.get(
                product.get("categoryName")
            )
            if not category:
                raise ValueError(
                    f"Category not found for product '{product['name']}'. Seed categories first."
                )

            prepared_products.append(
                {
                    **product,
                    "categoryId": str(category["_id"]),
                    "categoryName": category["name"],
                }
            )

        await db.products.delete_many({})
        result = await db.products.insert_many(prepared_products)
        print(f"Inserted {len(result.inserted_ids)} products into the catalog.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_products())
