from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.models import User, UserRole

security = HTTPBearer()


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta = None, audience: str = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    if audience:
        to_encode.update({"aud": audience})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        # We don't strictly verify audience here because backend routes are mostly shared.
        # Role-based access control (RBAC) handles the specific access in dependencies.
        return jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_platform_admin(user: User = Depends(get_current_user)) -> User:
    """
    Dependency: allows only PLATFORM_ADMIN role.
    Used exclusively by /api/console/* routes.
    """
    if user.role != UserRole.PLATFORM_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Platform administrator access required"
        )
    return user


def require_staff_or_admin(user: User = Depends(get_current_user)) -> User:
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Staff or admin access required")
    return user


def _get_user_permissions(user: User) -> list:
    """Parse the user's stored permission list. Falls back to role template."""
    import json
    from app.models.models import ROLE_PERMISSIONS
    try:
        perms = json.loads(user.permissions or "[]")
        if isinstance(perms, list) and len(perms) > 0:
            return perms
    except (json.JSONDecodeError, TypeError):
        pass
    # Fallback: use role template (for users created before RBAC migration)
    return ROLE_PERMISSIONS.get(user.role, [])


def require_permission(permission: str):
    """Factory: returns a FastAPI dependency that checks if the user has the given permission.
    
    Rules:
    - Wildcard '*' grants all permissions (ADMIN).
    - Uses PERMISSION_HIERARCHY to resolve implied permissions
      (e.g., having 'stock:manage' passes a 'stock:view' check if manage→view is in hierarchy).
    - Hierarchy is configurable — add new action levels without modifying this function.
    """
    def checker(user: User = Depends(get_current_user)) -> User:
        from app.models.models import PERMISSION_HIERARCHY
        user_perms = _get_user_permissions(user)
        # Wildcard check (ADMIN)
        if "*" in user_perms:
            return user
        # Direct match
        if permission in user_perms:
            return user
        # Hierarchy check: does any permission the user HAS imply the requested one?
        if ":" in permission:
            req_module, req_action = permission.rsplit(":", 1)
            for user_perm in user_perms:
                if ":" not in user_perm:
                    continue
                perm_module, perm_action = user_perm.rsplit(":", 1)
                if perm_module == req_module:
                    # Check if the user's action level implies the requested action
                    implied_actions = PERMISSION_HIERARCHY.get(perm_action, [])
                    if req_action in implied_actions:
                        return user
        raise HTTPException(
            status_code=403,
            detail=f"Permission '{permission}' required"
        )
    return checker
