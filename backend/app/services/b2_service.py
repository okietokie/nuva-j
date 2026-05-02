from datetime import datetime
from uuid import uuid4

import boto3

from app.core.config import settings


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
