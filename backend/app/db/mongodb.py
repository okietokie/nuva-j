import logging

import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.core.admin import ensure_default_staff_roles
from app.core.sku import ensure_default_sku_reference_data, ensure_sku_indexes
from app.services.packaging_profile_service import ensure_default_packaging_profiles

logger = logging.getLogger(__name__)
client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo():
    global client, database
    client = AsyncIOMotorClient(
        settings.mongodb_url,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=10000,
    )
    try:
        await client.admin.command("ping")
        database = client[settings.mongodb_db_name]
        await ensure_sku_indexes(database)
        await ensure_default_sku_reference_data(database)
        await ensure_default_staff_roles(database)
        await ensure_default_packaging_profiles(database)
    except Exception as error:
        logger.warning("MongoDB unavailable during startup. Running without database: %s", error)
        client.close()
        client = None
        database = None


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise RuntimeError("MongoDB has not been initialized.")
    return database
