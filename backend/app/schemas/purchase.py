from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


PurchaseAllocationMethod = Literal["equal", "quantity", "value", "manual"]


class SupplierBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    contactPerson: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    whatsapp: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    isActive: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    contactPerson: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    whatsapp: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    isActive: bool | None = None


class SupplierOut(SupplierBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


class PurchaseItemBase(BaseModel):
    productId: str | None = None
    productName: str = Field(min_length=2, max_length=180)
    quantity: int = Field(ge=1)
    unitCost: float = Field(ge=0)
    categoryName: str | None = Field(default=None, max_length=120)
    sku: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=500)
    manualAllocatedSharedExpense: float = Field(default=0, ge=0)


class PurchaseItemCreate(PurchaseItemBase):
    pass


class PurchaseItemOut(PurchaseItemBase):
    totalPurchaseCost: float = Field(ge=0)
    allocatedSharedExpense: float = Field(ge=0)


class PurchaseBatchBase(BaseModel):
    supplierId: str = Field(min_length=1)
    purchaseDate: datetime
    invoiceNumber: str | None = Field(default=None, max_length=120)
    paymentMethod: str | None = Field(default=None, max_length=80)
    receiptImageUrl: str | None = None
    notes: str | None = Field(default=None, max_length=1000)
    transportExpense: float = Field(default=0, ge=0)
    supplierDeliveryExpense: float = Field(default=0, ge=0)
    customsExpense: float = Field(default=0, ge=0)
    otherSharedExpense: float = Field(default=0, ge=0)
    allocationMethod: PurchaseAllocationMethod = "value"
    items: list[PurchaseItemCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_items(self):
        if not self.items:
            raise ValueError("At least one purchase item is required.")
        return self


class PurchaseBatchCreate(PurchaseBatchBase):
    pass


class PurchaseBatchUpdate(BaseModel):
    supplierId: str | None = None
    purchaseDate: datetime | None = None
    invoiceNumber: str | None = Field(default=None, max_length=120)
    paymentMethod: str | None = Field(default=None, max_length=80)
    receiptImageUrl: str | None = None
    notes: str | None = Field(default=None, max_length=1000)
    transportExpense: float | None = Field(default=None, ge=0)
    supplierDeliveryExpense: float | None = Field(default=None, ge=0)
    customsExpense: float | None = Field(default=None, ge=0)
    otherSharedExpense: float | None = Field(default=None, ge=0)
    allocationMethod: PurchaseAllocationMethod | None = None
    items: list[PurchaseItemCreate] | None = None


class PurchaseBatchOut(BaseModel):
    id: str
    supplierId: str
    supplierName: str
    purchaseDate: datetime
    invoiceNumber: str | None = None
    paymentMethod: str | None = None
    receiptImageUrl: str | None = None
    notes: str | None = None
    transportExpense: float = Field(ge=0)
    supplierDeliveryExpense: float = Field(ge=0)
    customsExpense: float = Field(ge=0)
    otherSharedExpense: float = Field(ge=0)
    totalSharedExpense: float = Field(ge=0)
    allocationMethod: PurchaseAllocationMethod
    items: list[PurchaseItemOut]
    totalPurchaseValue: float = Field(ge=0)
    grandTotal: float = Field(ge=0)
    createdAt: datetime
    updatedAt: datetime
