from app.db.mongodb import get_database
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.dependencies.auth import require_permission
from app.services.b2_service import list_product_images_from_b2, upload_image_to_b2_with_metadata

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("/product-image", status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    file: UploadFile = File(...),
    _admin=Depends(require_permission("products.update")),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed.")

    content = await file.read()
    upload = await upload_image_to_b2_with_metadata(file.filename, content, file.content_type)
    return upload


@router.get("/product-images/orphaned")
async def get_orphaned_product_images(_admin=Depends(require_permission("products.read"))):
    db = get_database()
    product_images = await db.products.find(
        {"images.key": {"$exists": True, "$ne": ""}},
        {"images": 1},
    ).to_list(length=None)

    used_keys = {
        image.get("key")
        for product in product_images
        for image in product.get("images", [])
        if image.get("key")
    }

    bucket_images = await list_product_images_from_b2()
    return [image for image in bucket_images if image["key"] not in used_keys]
