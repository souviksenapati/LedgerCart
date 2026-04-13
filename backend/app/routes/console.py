from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import json

from app.database import get_db
from app.models.models import User, UserRole, Plan, Tenant, ROLE_PERMISSIONS
from app.schemas.schemas import (
    PlanCreate, PlanUpdate, PlanResponse,
    TenantResponse, TenantUpdate,
    ConsoleLoginRequest, ConsoleLoginResponse,
    UserResponse,
)
from app.utils.auth import verify_password, create_access_token, require_platform_admin
from app.utils.rate_limit import (
    check_login_rate_limit,
    record_failed_login_attempt,
    clear_failed_login_attempts,
)

router = APIRouter(prefix="/api/console", tags=["Console"])


# ─── FEATURE REGISTRY ───────────────────────────────────────────────────────
# Master list of all platform features. Each client plan grants a subset of these.
# The key is what gets stored in Plan.features and Tenant.custom_features (JSON array).
FEATURE_REGISTRY = [
    # Group: CORE
    {"group": "CORE",       "key": "dashboard",        "label": "Dashboard & Analytics"},
    {"group": "CORE",       "key": "catalog",           "label": "Product Catalog"},
    {"group": "CORE",       "key": "inventory",         "label": "Inventory Management"},
    {"group": "CORE",       "key": "warehouses",        "label": "Multi-Warehouse"},
    {"group": "CORE",       "key": "settings",          "label": "System Settings"},
    # Group: PURCHASES
    {"group": "PURCHASES",  "key": "suppliers",         "label": "Supplier Management"},
    {"group": "PURCHASES",  "key": "purchase_orders",   "label": "Purchase Orders"},
    {"group": "PURCHASES",  "key": "grn",               "label": "Goods Receipt (GRN)"},
    {"group": "PURCHASES",  "key": "purchase_invoices", "label": "Purchase Invoices"},
    # Group: B2B SALES
    {"group": "B2B SALES",  "key": "b2b_customers",     "label": "B2B Customers"},
    {"group": "B2B SALES",  "key": "sales_quotations",  "label": "Sales Quotations"},
    {"group": "B2B SALES",  "key": "sales_orders",      "label": "Sales Orders"},
    {"group": "B2B SALES",  "key": "sales_invoices",    "label": "Sales Invoices"},
    {"group": "B2B SALES",  "key": "payments",          "label": "Payment Tracking"},
    # Group: E-COMMERCE
    {"group": "E-COMMERCE", "key": "ecom",              "label": "Online Store (Storefront)"},
    {"group": "E-COMMERCE", "key": "ecom_orders",       "label": "E-commerce Orders"},
    {"group": "E-COMMERCE", "key": "coupons",           "label": "Coupons & Discounts"},
    {"group": "E-COMMERCE", "key": "banners",           "label": "Store Banners"},
    {"group": "E-COMMERCE", "key": "reviews",           "label": "Customer Reviews"},
    # Group: ADVANCED
    {"group": "ADVANCED",   "key": "reports_basic",     "label": "Basic Reports"},
    {"group": "ADVANCED",   "key": "reports_advanced",  "label": "Advanced Analytics"},
    {"group": "ADVANCED",   "key": "staff_management",  "label": "Staff & Role Management"},
    # Group: ENTERPRISE
    {"group": "ENTERPRISE", "key": "custom_rbac",       "label": "Custom Role Builder"},
    {"group": "ENTERPRISE", "key": "api_access",        "label": "REST API Access"},
    {"group": "ENTERPRISE", "key": "white_label",       "label": "White Label / Custom Domain"},
]


# ─── AUTH ────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=ConsoleLoginResponse)
def console_login(req: ConsoleLoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Console-only login. Accepts PLATFORM_ADMIN credentials only.
    Always returns the same error message regardless of whether the account
    exists or the role is wrong — prevents user enumeration.
    """
    GENERIC_ERROR = "Invalid credentials"
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    principal = f"console:{req.email}"
    check_login_rate_limit(client_ip, principal)

    user = db.query(User).filter(User.email == req.email).first()

    if not user or not verify_password(req.password, user.password_hash):
        record_failed_login_attempt(client_ip, principal)
        raise HTTPException(status_code=401, detail=GENERIC_ERROR)
    if not user.is_active:
        record_failed_login_attempt(client_ip, principal)
        raise HTTPException(status_code=403, detail=GENERIC_ERROR)
    if user.role != UserRole.PLATFORM_ADMIN:
        record_failed_login_attempt(client_ip, principal)
        raise HTTPException(status_code=403, detail=GENERIC_ERROR)

    token = create_access_token({"sub": user.id, "role": user.role.value})
    clear_failed_login_attempts(client_ip, principal)
    user_resp = UserResponse.model_validate(user)
    user_resp.permissions = ROLE_PERMISSIONS.get(user.role, [])
    return ConsoleLoginResponse(access_token=token, user=user_resp)


@router.get("/auth/me", response_model=UserResponse)
def console_me(user: User = Depends(require_platform_admin)):
    user_resp = UserResponse.model_validate(user)
    user_resp.permissions = ROLE_PERMISSIONS.get(user.role, [])
    return user_resp


# ─── DASHBOARD ───────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    tenant_count    = db.query(Tenant).count()
    active_count    = db.query(Tenant).filter(Tenant.subscription_status == "active").count()
    trial_count     = db.query(Tenant).filter(Tenant.subscription_status == "trial").count()
    suspended_count = db.query(Tenant).filter(Tenant.subscription_status == "suspended").count()

    # Plan distribution
    plan_dist_rows = (
        db.query(Plan.name, func.count(Tenant.id).label("count"))
        .outerjoin(Tenant, Tenant.plan_id == Plan.id)
        .group_by(Plan.id, Plan.name)
        .all()
    )

    # Per-plan MRR: active tenants only
    active_tenants = db.query(Tenant).filter(Tenant.subscription_status == "active").all()
    mrr = sum(float(t.plan.price_monthly or 0) for t in active_tenants if t.plan)

    plan_mrr: dict = {}
    for t in active_tenants:
        if t.plan:
            plan_mrr[t.plan.name] = plan_mrr.get(t.plan.name, 0) + float(t.plan.price_monthly or 0)

    plan_distribution = [
        {
            "plan_name": row[0],
            "tenant_count": int(row[1]),
            "mrr": plan_mrr.get(row[0], 0),
        }
        for row in plan_dist_rows
    ]

    # Recent tenants (last 10)
    recent_tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).limit(10).all()
    recent_list = []
    for t in recent_tenants:
        recent_list.append({
            "id": t.id,
            "name": t.name,
            "subdomain": t.subdomain,
            "plan_id": t.plan_id,
            "plan_name": t.plan.name if t.plan else None,
            "subscription_status": t.subscription_status,
            "notes": t.notes,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {
        "tenant_stats": {
            "total": tenant_count,
            "active": active_count,
            "trial": trial_count,
            "suspended": suspended_count,
        },
        "plan_distribution": plan_distribution,
        "recent_tenants": recent_list,
        "mrr": mrr,
    }


# ─── FEATURE KEYS ────────────────────────────────────────────────────────────

@router.get("/feature-keys")
def get_feature_keys(user: User = Depends(require_platform_admin)):
    """Returns the full feature registry grouped for the checkbox grid UI."""
    return {"features": FEATURE_REGISTRY}


# ─── PLANS ───────────────────────────────────────────────────────────────────

@router.get("/plans", response_model=List[PlanResponse])
def list_plans(
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    plans = db.query(Plan).order_by(Plan.sort_order, Plan.created_at).all()
    result = []
    for plan in plans:
        tenant_count = db.query(Tenant).filter(Tenant.plan_id == plan.id).count()
        pr = PlanResponse.model_validate(plan)
        pr.tenant_count = tenant_count
        result.append(pr)
    return result


@router.post("/plans", response_model=PlanResponse)
def create_plan(
    req: PlanCreate,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    if db.query(Plan).filter(Plan.slug == req.slug).first():
        raise HTTPException(status_code=400, detail=f"Plan slug '{req.slug}' already exists")

    plan = Plan(
        name=req.name,
        slug=req.slug,
        price_monthly=req.price_monthly,
        price_yearly=req.price_yearly,
        max_users=req.max_users,
        max_products=req.max_products,
        features=json.dumps(req.features),
        is_active=req.is_active,
        sort_order=req.sort_order,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    pr = PlanResponse.model_validate(plan)
    pr.tenant_count = 0
    return pr


@router.get("/plans/{plan_id}", response_model=PlanResponse)
def get_plan(
    plan_id: str,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    pr = PlanResponse.model_validate(plan)
    pr.tenant_count = db.query(Tenant).filter(Tenant.plan_id == plan.id).count()
    return pr


@router.put("/plans/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: str,
    req: PlanUpdate,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if req.name is not None:
        plan.name = req.name
    if req.price_monthly is not None:
        plan.price_monthly = req.price_monthly
    if req.price_yearly is not None:
        plan.price_yearly = req.price_yearly
    if req.max_users is not None:
        plan.max_users = req.max_users
    if req.max_products is not None:
        plan.max_products = req.max_products
    if req.features is not None:
        plan.features = json.dumps(req.features)
    if req.is_active is not None:
        plan.is_active = req.is_active
    if req.sort_order is not None:
        plan.sort_order = req.sort_order

    db.commit()
    db.refresh(plan)
    pr = PlanResponse.model_validate(plan)
    pr.tenant_count = db.query(Tenant).filter(Tenant.plan_id == plan.id).count()
    return pr


@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: str,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    tenant_count = db.query(Tenant).filter(Tenant.plan_id == plan_id).count()
    if tenant_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: {tenant_count} tenant(s) are on this plan. Reassign them first."
        )
    db.delete(plan)
    db.commit()
    return {"message": f"Plan '{plan.name}' deleted"}


# ─── TENANTS ─────────────────────────────────────────────────────────────────

@router.get("/tenants", response_model=List[TenantResponse])
def list_tenants(
    search:    Optional[str] = Query(None),
    plan_id:   Optional[str] = Query(None),
    status:    Optional[str] = Query(None),
    page:      int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Tenant)
    if search:
        q = q.filter(
            Tenant.name.ilike(f"%{search}%") | Tenant.subdomain.ilike(f"%{search}%")
        )
    if plan_id:
        q = q.filter(Tenant.plan_id == plan_id)
    if status:
        q = q.filter(Tenant.subscription_status == status)

    tenants = q.order_by(Tenant.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total = q.count()

    result = []
    for t in tenants:
        result.append(TenantResponse(
            id=t.id,
            name=t.name,
            subdomain=t.subdomain,
            plan_id=t.plan_id,
            plan_name=t.plan.name if t.plan else None,
            subscription_status=t.subscription_status,
            custom_features=t.custom_features,
            notes=t.notes,
            created_at=t.created_at,
        ))
    return result


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    req: TenantUpdate,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if req.plan_id is not None:
        if req.plan_id:
            plan = db.query(Plan).filter(Plan.id == req.plan_id).first()
            if not plan:
                raise HTTPException(status_code=400, detail="Plan not found")
        tenant.plan_id = req.plan_id or None

    if req.subscription_status is not None:
        allowed = {"trial", "active", "suspended", "cancelled"}
        if req.subscription_status not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(allowed))}")
        tenant.subscription_status = req.subscription_status

    if req.custom_features is not None:
        tenant.custom_features = json.dumps(req.custom_features)

    if req.notes is not None:
        tenant.notes = req.notes

    db.commit()
    db.refresh(tenant)
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        subdomain=tenant.subdomain,
        plan_id=tenant.plan_id,
        plan_name=tenant.plan.name if tenant.plan else None,
        subscription_status=tenant.subscription_status,
        custom_features=tenant.custom_features,
        notes=tenant.notes,
        created_at=tenant.created_at,
    )
