"""Pydantic schemas for Authentication and RBAC."""
from __future__ import annotations

import re
from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Work email address")
    password: str = Field(..., min_length=4, description="User password")

    @field_validator("email")
    @classmethod
    def validate_work_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", clean):
            raise ValueError("Invalid email format.")
        return clean


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="Corporate work email")
    password: str = Field(..., min_length=4, description="Password (min 4 characters)")
    full_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field("General", max_length=50)
    role: str = Field("EMPLOYEE", description="Role: EMPLOYEE, SUPPORT_ENGINEER, or ADMIN")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper not in {"EMPLOYEE", "SUPPORT_ENGINEER", "ADMIN"}:
            raise ValueError("Role must be EMPLOYEE, SUPPORT_ENGINEER, or ADMIN.")
        return upper


class UserResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    department: str
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: UserResponse


class RoleVerificationResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    department: str
    role: str
    allowed_routes: list[str]

