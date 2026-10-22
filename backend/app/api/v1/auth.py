"""Authentication and User RBAC endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.ticket import UserModel
from app.schemas.auth import LoginRequest, RegisterRequest, RoleVerificationResponse, TokenResponse, UserResponse
from app.services.auth_service import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth")


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> UserModel:
    """Dependency to extract authenticated user from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )
    user = db.scalar(select(UserModel).where(UserModel.email == payload["sub"]))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with work email and password."""
    user = db.scalar(select(UserModel).where(UserModel.email == payload.email.lower()))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this work email address.",
        )

    # If the user has no password set yet (seeded user), set it on first login to password123
    if not user.password_hash:
        user.password_hash = hash_password("password123")
        db.commit()
        db.refresh(user)

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. For demo accounts, use: password123",
        )

    token = create_access_token({"sub": user.email, "role": user.role, "name": user.full_name})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user.user_id,
            email=user.email,
            full_name=user.full_name,
            department=user.department,
            role=user.role,
        ),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Self-register an employee account using a work email."""
    existing = db.scalar(select(UserModel).where(UserModel.email == payload.email.lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this work email already exists.",
        )

    user = UserModel(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        department=payload.department,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email, "role": user.role, "name": user.full_name})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user.user_id,
            email=user.email,
            full_name=user.full_name,
            department=user.department,
            role=user.role,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserModel = Depends(get_current_user)):
    """Retrieve profile of the currently logged in user."""
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_system_users(role_filter: str | None = None, db: Session = Depends(get_db)):
    """List system users for assignment and administration."""
    query = select(UserModel).order_by(UserModel.full_name)
    if role_filter:
        query = query.where(UserModel.role == role_filter.upper())
    return list(db.scalars(query))


@router.get("/verify-role", response_model=RoleVerificationResponse)
def verify_user_role(current_user: UserModel = Depends(get_current_user)):
    """Fetch user's role from database and return authorized dashboard permission."""
    allowed = []
    if current_user.role == "EMPLOYEE":
        allowed = ["employee_portal"]
    elif current_user.role == "SUPPORT_ENGINEER":
        allowed = ["it_dashboard"]
    elif current_user.role == "ADMIN":
        allowed = ["admin_dashboard"]

    return RoleVerificationResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        department=current_user.department,
        role=current_user.role,
        allowed_routes=allowed,
    )

