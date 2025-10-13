"""
User schemas for API requests and responses
"""
from typing import Optional
from pydantic import BaseModel
from app.models.user import UserRole

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[str] = None

class UserInDB(UserBase):
    id: int
    is_active: str
    
    class Config:
        orm_mode = True

class User(UserInDB):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
