from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import UserRegisterRequest, UserLoginRequest, UserUpdateRequest, ChangePasswordRequest, UserResponse, TokenResponse
from app.services.auth import (
    get_user_by_email, get_user_by_id, create_user, verify_password,
    create_access_token, decode_access_token, update_user_profile, change_user_password
)

from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# HTTPBearer security scheme to extract token from Authorization header
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to retrieve the currently logged in user from JWT."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)) -> Optional[dict]:
    """Dependency to optionally retrieve current logged in user from JWT if present."""
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    user_id = payload["sub"]
    return await get_user_by_id(user_id)

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(req: UserRegisterRequest):
    """
    Registers a new user, hashes their password, stores them in MongoDB, 
    and returns a JWT token with user details.
    """
    # 1. Validate password match
    if req.password != req.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # 2. Check email uniqueness
    existing_user = await get_user_by_email(req.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    try:
        # 3. Create user
        user = await create_user(req.fullName, req.email, req.password)
        
        # 4. Generate access token (contains user id)
        token = create_access_token({"sub": str(user["_id"]), "email": user["email"]})
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(**user)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login_user(req: UserLoginRequest):
    """
    Authenticates user credentials and returns a JWT token on success.
    """
    user = await get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    try:
        # Generate token
        token = create_access_token({"sub": str(user["_id"]), "email": user["email"]})
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(**user)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user details for the active session.
    """
    return UserResponse(**user)

@router.put("/me", response_model=UserResponse)
async def update_me(req: UserUpdateRequest, current_user: dict = Depends(get_current_user)):
    """
    Updates the profile information (fullName, email) for the active user.
    """
    if req.email and req.email.strip().lower() != current_user["email"].lower():
        existing = await get_user_by_email(req.email.strip())
        if existing and str(existing["_id"]) != str(current_user["_id"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already taken by another account"
            )
            
    updated_user = await update_user_profile(
        user_id=str(current_user["_id"]),
        full_name=req.fullName,
        email=req.email
    )
    return UserResponse(**updated_user)

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """
    Validates current password and updates to new password.
    """
    if not verify_password(req.currentPassword, current_user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
        
    await change_user_password(str(current_user["_id"]), req.newPassword)
    return {"message": "Password changed successfully"}

