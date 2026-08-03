from datetime import datetime

from pydantic import BaseModel, Field


class OrderItem(BaseModel):
    productId: str
    name: str
    price: float = Field(ge=0)
    currency: str = Field(default="AED", min_length=3, max_length=3)
    quantity: int = Field(ge=1)
    image: str


class Address(BaseModel):
    fullName: str
    email: str
    line1: str
    city: str
    country: str
    postalCode: str


class OrderCreate(BaseModel):
    items: list[OrderItem]
    totalAmount: float = Field(ge=0)
    currency: str = Field(default="AED", min_length=3, max_length=3)
    address: Address
    paymentMethod: str
    paymentStatus: str = "pending"
    orderStatus: str = "placed"


class OrderStatusUpdate(BaseModel):
    orderStatus: str


class OrderOut(OrderCreate):
    id: str
    userId: str
    createdAt: datetime
    updatedAt: datetime
