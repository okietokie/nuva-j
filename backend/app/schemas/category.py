from datetime import datetime

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str | None = None
    description: str | None = Field(default=None, max_length=300)
    imageUrl: str | None = None
    isActive: bool = True
    sortOrder: int = Field(default=1, ge=0)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    slug: str | None = None
    description: str | None = Field(default=None, max_length=300)
    imageUrl: str | None = None
    isActive: bool | None = None
    sortOrder: int | None = Field(default=None, ge=0)


class CategoryOut(CategoryBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
