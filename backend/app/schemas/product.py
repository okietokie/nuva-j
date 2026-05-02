from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


ProductStatus = Literal["active", "draft", "archived", "deleted"]
ProductVisibility = Literal["visible", "hidden"]


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
    price: float = Field(ge=0)
    salePrice: float | None = Field(default=None, ge=0)
    currency: str = Field(default="AED", min_length=3, max_length=3)
    images: list[ProductImage] = Field(default_factory=list)
    stock: int = Field(ge=0)
    lowStockLimit: int = Field(default=3, ge=0)
    sku: str = ""
    taxIncluded: bool = True
    allowBackorder: bool = False
    material: str = ""
    plating: str | None = Field(default=None, max_length=120)
    stoneType: str | None = Field(default=None, max_length=120)
    color: str = ""
    size: str | None = Field(default=None, max_length=80)
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
    price: float | None = Field(default=None, ge=0)
    salePrice: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    images: list[ProductImage] | None = None
    stock: int | None = Field(default=None, ge=0)
    lowStockLimit: int | None = Field(default=None, ge=0)
    sku: str | None = None
    taxIncluded: bool | None = None
    allowBackorder: bool | None = None
    material: str | None = None
    plating: str | None = Field(default=None, max_length=120)
    stoneType: str | None = Field(default=None, max_length=120)
    color: str | None = None
    size: str | None = Field(default=None, max_length=80)
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


class ProductFromImageCreate(BaseModel):
    imageUrl: str = Field(min_length=1)
    imageKey: str = ""
    imageAlt: str | None = None


class ProductOut(ProductBase):
    id: str
    createdBy: str | None = None
    updatedBy: str | None = None
    createdAt: datetime
    updatedAt: datetime
