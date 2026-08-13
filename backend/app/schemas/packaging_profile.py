from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


PackagingProfileCurrency = Literal["AED", "INR", "USD"]


class PackagingProfileRule(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    operator: str = Field(default="equals", min_length=1, max_length=40)
    value: str = Field(default="", max_length=160)


class PackagingProfileBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=400)
    defaultCost: float = Field(default=0, ge=0)
    currency: PackagingProfileCurrency = "AED"
    active: bool = True
    sortOrder: int = Field(default=0, ge=0)
    recommendationRules: list[PackagingProfileRule] = Field(default_factory=list)


class PackagingProfileCreate(PackagingProfileBase):
    pass


class PackagingProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=400)
    defaultCost: float | None = Field(default=None, ge=0)
    currency: PackagingProfileCurrency | None = None
    active: bool | None = None
    sortOrder: int | None = Field(default=None, ge=0)
    recommendationRules: list[PackagingProfileRule] | None = None


class PackagingProfileOut(PackagingProfileBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
    createdBy: str | None = None
    updatedBy: str | None = None
