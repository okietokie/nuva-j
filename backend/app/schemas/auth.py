from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserOut


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "customer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
