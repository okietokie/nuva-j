from datetime import datetime
import logging
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_b2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.b2_endpoint_url,
        aws_access_key_id=settings.b2_access_key_id,
        aws_secret_access_key=settings.b2_secret_access_key,
        region_name=settings.b2_region,
    )


async def upload_image_to_b2(file_name: str, content: bytes, content_type: str) -> str:
    client = get_b2_client()
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_name = f"products/{timestamp}-{uuid4().hex}-{file_name}"

    client.put_object(
        Bucket=settings.b2_bucket_name,
        Key=unique_name,
        Body=content,
        ContentType=content_type,
    )

    base_url = settings.cloudflare_cdn_base_url.rstrip("/")
    return f"{base_url}/{unique_name}"


def build_b2_public_url(key: str) -> str:
    base_url = settings.cloudflare_cdn_base_url.rstrip("/")
    return f"{base_url}/{key}"


async def upload_image_to_b2_with_metadata(file_name: str, content: bytes, content_type: str) -> dict:
    client = get_b2_client()
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    key = f"products/{timestamp}-{uuid4().hex}-{file_name}"

    client.put_object(
        Bucket=settings.b2_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )

    return {"url": build_b2_public_url(key), "key": key}


async def list_product_images_from_b2(prefix: str | None = None) -> list[dict]:
    client = get_b2_client()
    try:
        request = {"Bucket": settings.b2_bucket_name}
        if prefix:
            request["Prefix"] = prefix
        response = client.list_objects_v2(**request)
    except (ClientError, BotoCoreError) as error:
        logger.warning("Unable to list product images from Backblaze B2: %s", error)
        return []
    contents = response.get("Contents", [])

    return [
        {
            "key": item["Key"],
            "url": build_b2_public_url(item["Key"]),
            "lastModified": item["LastModified"].isoformat() if item.get("LastModified") else None,
        }
        for item in contents
        if item.get("Key") and not item["Key"].endswith("/")
    ]


async def delete_image_from_b2(key: str) -> None:
    client = get_b2_client()
    try:
        client.delete_object(Bucket=settings.b2_bucket_name, Key=key)
    except (ClientError, BotoCoreError) as error:
        logger.warning("Unable to delete product image from Backblaze B2: %s", error)
        raise
