from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, UserRole, Cart
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    UserUpdate, ChangePasswordRequest
)
from app.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from app.utils.rate_limit import (
    check_login_rate_limit,
    record_failed_login_attempt,
    clear_failed_login_attempts,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        role=UserRole.CUSTOMER
    )
    db.add(user)
    db.flush()

    cart = Cart(user_id=user.id)
    db.add(cart)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    principal = f"{req.portal}:{req.email}"
    check_login_rate_limit(client_ip, principal)

    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        record_failed_login_attempt(client_ip, principal)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        record_failed_login_attempt(client_ip, principal)
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Portal Verification
    if req.portal == 'admin':
        if user.role == UserRole.CUSTOMER:
            raise HTTPException(status_code=403, detail="Staff access only for admin portal")
        if user.role == UserRole.PLATFORM_ADMIN:
            raise HTTPException(status_code=403, detail="Use the Platform Console to log in")
    elif req.portal == 'store':
        if user.role != UserRole.CUSTOMER:
            record_failed_login_attempt(client_ip, principal)
            raise HTTPException(status_code=403, detail="Please use the staff portal for admin accounts")
    else:
        record_failed_login_attempt(client_ip, principal)
        raise HTTPException(status_code=400, detail="Invalid portal specified")

    # Build permissions for response
    import json
    from app.models.models import ROLE_PERMISSIONS
    user_perms = []
    try:
        stored = json.loads(user.permissions or "[]")
        if isinstance(stored, list) and len(stored) > 0:
            user_perms = stored
    except (json.JSONDecodeError, TypeError):
        pass
    if not user_perms:
        user_perms = ROLE_PERMISSIONS.get(user.role, [])

    token = create_access_token(
        {"sub": user.id, "role": user.role.value},
        audience=req.portal
    )
    clear_failed_login_attempts(client_ip, principal)
    user_resp = UserResponse.model_validate(user)
    user_resp.permissions = user_perms
    return TokenResponse(access_token=token, user=user_resp)


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    import json
    from app.models.models import ROLE_PERMISSIONS
    user_resp = UserResponse.model_validate(user)
    # Parse permissions from stored JSON — same logic as login
    user_perms = []
    try:
        stored = json.loads(user.permissions or "[]")
        if isinstance(stored, list) and len(stored) > 0:
            user_perms = stored
    except (json.JSONDecodeError, TypeError):
        pass
    if not user_perms:
        user_perms = ROLE_PERMISSIONS.get(user.role, [])
    user_resp.permissions = user_perms
    return user_resp


@router.put("/me", response_model=UserResponse)
def update_me(req: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
