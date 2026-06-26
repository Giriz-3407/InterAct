from pydantic import BaseModel, Field, BeforeValidator
from datetime import datetime
from typing import Annotated

# Custom type for parsing MongoDB ObjectId into string
PyObjectId = Annotated[str, BeforeValidator(str)]

class UserRegisterRequest(BaseModel):
    fullName: str = Field(..., min_length=1, max_length=100)
    email: str = Field(...)
    password: str = Field(..., min_length=6)
    confirmPassword: str = Field(..., min_length=6)

class UserLoginRequest(BaseModel):
    email: str = Field(...)
    password: str

class UserResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    fullName: str
    email: str
    createdAt: datetime

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
