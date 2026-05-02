from datetime import datetime

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10)
    category: str
    price: float = Field(ge=0)
    stock: int = Field(ge=0)
    images: list[str] = []
    material: str
    color: str
    isFeatured: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    price: float | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    images: list[str] | None = None
    material: str | None = None
    color: str | None = None
    isFeatured: bool | None = None


class StockUpdate(BaseModel):
    stock: int = Field(ge=0)


class ProductOut(ProductBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
