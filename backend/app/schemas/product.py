from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


ProductStatus = Literal["active", "draft", "archived", "deleted"]
ProductVisibility = Literal["visible", "hidden"]
StockMovementType = Literal[
    "manual_adjustment",
    "restock",
    "damage",
    "return",
    "sale_correction",
    "order_placed",
]


class StockMovement(BaseModel):
    type: StockMovementType
    previousStock: int = Field(ge=0)
    newStock: int = Field(ge=0)
    quantityChange: int
    note: str | None = Field(default=None, max_length=240)
    actorId: str | None = None
    actorName: str | None = None
    orderId: str | None = None
    createdAt: datetime


class ProductImage(BaseModel):
    id: str | None = None
    url: str = Field(min_length=1)
    key: str = ""
    isPrimary: bool = False
    alt: str = ""


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    slug: str | None = None
    description: str = ""
    categoryId: str | None = None
    categoryName: str = ""
    categoryCode: str = ""
    designNumber: int = Field(default=0, ge=0)
    price: float = Field(ge=0)
    salePrice: float | None = Field(default=None, ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    images: list[ProductImage] = Field(default_factory=list)
    stock: int = Field(ge=0)
    lowStockLimit: int = Field(default=3, ge=0)
    stockMovements: list[StockMovement] = Field(default_factory=list)
    sku: str = ""
    supplierId: str | None = None
    supplierName: str = ""
    purchaseBatchId: str | None = None
    purchaseDate: datetime | None = None
    quantityPurchased: int = Field(default=0, ge=0)
    purchaseUnitCost: float = Field(default=0, ge=0)
    purchaseTotalCost: float = Field(default=0, ge=0)
    directProductExpense: float = Field(default=0, ge=0)
    allocatedBatchExpense: float = Field(default=0, ge=0)
    packagingCost: float = Field(default=0, ge=0)
    packagingProfileId: str = ""
    packagingProfileLabel: str = ""
    totalProductCost: float = Field(default=0, ge=0)
    suggestedSellingPrice: float = Field(default=0, ge=0)
    taxIncluded: bool = True
    allowBackorder: bool = False
    material: str = ""
    plating: str | None = Field(default=None, max_length=120)
    stoneType: str | None = Field(default=None, max_length=120)
    color: str = ""
    size: str | None = Field(default=None, max_length=80)
    variantName: str | None = Field(default=None, max_length=120)
    variantCode: str | None = Field(default=None, max_length=10)
    weight: str | None = Field(default=None, max_length=40)
    occasion: str | None = Field(default=None, max_length=120)
    careInstructions: str | None = Field(default=None, max_length=1000)
    tags: list[str] = Field(default_factory=list)
    status: ProductStatus = "draft"
    visibility: ProductVisibility = "hidden"
    isFeatured: bool = False
    isBestSeller: bool = False
    isNewArrival: bool = False

    @model_validator(mode="after")
    def validate_core_fields(self):
        if self.status != "draft":
            if len(self.description.strip()) < 10:
                raise ValueError("Description must be at least 10 characters for non-draft products.")
            if len(self.categoryName.strip()) < 2:
                raise ValueError("Category is required for non-draft products.")
            if len(self.sku.strip()) < 3:
                raise ValueError("SKU is required for non-draft products.")
            if len(self.material.strip()) < 2:
                raise ValueError("Material is required for non-draft products.")
            if len(self.color.strip()) < 2:
                raise ValueError("Color is required for non-draft products.")
        return self

    @model_validator(mode="after")
    def validate_pricing(self):
        if self.salePrice is not None and self.salePrice >= self.price:
            raise ValueError("Sale price must be less than regular price.")
        return self


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    slug: str | None = None
    description: str | None = None
    categoryId: str | None = None
    categoryName: str | None = None
    categoryCode: str | None = None
    designNumber: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, ge=0)
    salePrice: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    images: list[ProductImage] | None = None
    stock: int | None = Field(default=None, ge=0)
    lowStockLimit: int | None = Field(default=None, ge=0)
    sku: str | None = None
    supplierId: str | None = None
    supplierName: str | None = None
    purchaseBatchId: str | None = None
    purchaseDate: datetime | None = None
    quantityPurchased: int | None = Field(default=None, ge=0)
    purchaseUnitCost: float | None = Field(default=None, ge=0)
    purchaseTotalCost: float | None = Field(default=None, ge=0)
    directProductExpense: float | None = Field(default=None, ge=0)
    allocatedBatchExpense: float | None = Field(default=None, ge=0)
    packagingCost: float | None = Field(default=None, ge=0)
    packagingProfileId: str | None = Field(default=None, max_length=80)
    packagingProfileLabel: str | None = Field(default=None, max_length=160)
    totalProductCost: float | None = Field(default=None, ge=0)
    suggestedSellingPrice: float | None = Field(default=None, ge=0)
    taxIncluded: bool | None = None
    allowBackorder: bool | None = None
    material: str | None = None
    plating: str | None = Field(default=None, max_length=120)
    stoneType: str | None = Field(default=None, max_length=120)
    color: str | None = None
    size: str | None = Field(default=None, max_length=80)
    variantName: str | None = Field(default=None, max_length=120)
    variantCode: str | None = Field(default=None, max_length=10)
    weight: str | None = Field(default=None, max_length=40)
    occasion: str | None = Field(default=None, max_length=120)
    careInstructions: str | None = Field(default=None, max_length=1000)
    tags: list[str] | None = None
    status: ProductStatus | None = None
    visibility: ProductVisibility | None = None
    isFeatured: bool | None = None
    isBestSeller: bool | None = None
    isNewArrival: bool | None = None

    @model_validator(mode="after")
    def validate_pricing(self):
        if (
            self.price is not None
            and self.salePrice is not None
            and self.salePrice >= self.price
        ):
            raise ValueError("Sale price must be less than regular price.")
        return self


class StockUpdate(BaseModel):
    stock: int = Field(ge=0)
    movementType: StockMovementType = "manual_adjustment"
    note: str | None = Field(default=None, max_length=240)


class ProductFromImageCreate(BaseModel):
    imageUrl: str = Field(min_length=1)
    imageKey: str = ""
    imageAlt: str | None = None


class ProductBulkDeleteRequest(BaseModel):
    productIds: list[str] = Field(min_length=1)


class ProductDeleteResult(BaseModel):
    productId: str
    productName: str | None = None
    success: bool
    reason: str | None = None


class ProductOut(ProductBase):
    id: str
    createdBy: str | None = None
    updatedBy: str | None = None
    createdAt: datetime
    updatedAt: datetime
