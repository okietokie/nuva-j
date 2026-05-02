from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo():
    global client, database
    client = AsyncIOMotorClient(settings.mongodb_url)
    database = client[settings.mongodb_db_name]


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise RuntimeError("MongoDB has not been initialized.")
    return database
