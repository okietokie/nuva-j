from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.db.mongodb import get_database
from app.dependencies.auth import require_permission
from app.services.b2_service import (
    delete_image_from_b2,
    list_product_images_from_b2,
    upload_image_to_b2_with_metadata,
)

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


@router.delete("/product-images/orphaned")
async def delete_orphaned_product_image(
    payload: dict,
    _admin=Depends(require_permission("products.delete")),
):
    key = (payload.get("key") or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Image key is required.")

    db = get_database()
    await db.products.delete_many(
        {
            "images.key": key,
            "status": "draft",
            "visibility": "hidden",
            "name": "Untitled Product",
            "categoryId": "",
            "categoryName": "",
            "price": 0,
            "stock": 0,
            "sku": "",
        }
    )

    product = await db.products.find_one({"images.key": key}, {"_id": 1})
    if product:
        raise HTTPException(status_code=409, detail="Image is already linked to a saved product.")

    bucket_images = await list_product_images_from_b2(prefix=key)
    if not any(image.get("key") == key for image in bucket_images):
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        await delete_image_from_b2(key)
    except Exception as error:
        raise HTTPException(status_code=502, detail="Unable to delete image from storage.") from error

    return {"message": "Orphaned image deleted successfully."}
