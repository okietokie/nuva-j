from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.dependencies.auth import require_admin
from app.services.b2_service import upload_image_to_b2

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("/product-image", status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    file: UploadFile = File(...),
    _admin=Depends(require_admin),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed.")

    content = await file.read()
    url = await upload_image_to_b2(file.filename, content, file.content_type)
    return {"url": url}
