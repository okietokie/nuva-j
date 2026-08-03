from datetime import datetime

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=3)
    slug: str | None = None
    description: str | None = Field(default=None, max_length=300)
    imageUrl: str | None = None
    isActive: bool = True
    sortOrder: int = Field(default=1, ge=0)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    code: str | None = Field(default=None, min_length=2, max_length=3)
    slug: str | None = None
    description: str | None = Field(default=None, max_length=300)
    imageUrl: str | None = None
    isActive: bool | None = None
    sortOrder: int | None = Field(default=None, ge=0)


class CategoryOut(CategoryBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


class VariantCodeBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=4)
    type: str = Field(default="color", min_length=2, max_length=30)
    description: str | None = Field(default=None, max_length=300)
    isActive: bool = True
    sortOrder: int = Field(default=1, ge=0)


class VariantCodeCreate(VariantCodeBase):
    pass


class VariantCodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    code: str | None = Field(default=None, min_length=2, max_length=4)
    type: str | None = Field(default=None, min_length=2, max_length=30)
    description: str | None = Field(default=None, max_length=300)
    isActive: bool | None = None
    sortOrder: int | None = Field(default=None, ge=0)


class CategoryBulkDeleteRequest(BaseModel):
    ids: list[str] = Field(min_length=1)


class CategoryDeleteResult(BaseModel):
    id: str
    name: str | None = None
    success: bool
    reason: str | None = None
