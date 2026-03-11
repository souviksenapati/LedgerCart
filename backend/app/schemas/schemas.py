from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime, date
import json


# ─── AUTH ────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str = ""
    phone: str = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    portal: str  # 'store' or 'admin'

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ─── USER ────────────────────────────────────────────────
class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: str
    role: str
    avatar_url: str
    created_at: datetime
    permissions: List[str] = []

    @field_validator('permissions', mode='before')
    @classmethod
    def parse_permissions(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v or "[]")
            except:
                return []
        return v

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ─── ADDRESS ────────────────────────────────────────────
class AddressCreate(BaseModel):
    label: str = "Home"
    full_name: str
    phone: str
    address_line1: str
    address_line2: str = ""
    city: str
    state: str
    pincode: str
    is_default: bool = False

class AddressResponse(AddressCreate):
    id: str
    user_id: str
    class Config:
        from_attributes = True


# ─── CATEGORY ───────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    image_url: str = ""
    parent_id: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    image_url: str
    parent_id: Optional[str]
    is_active: bool
    sort_order: int
    created_at: datetime
    product_count: Optional[int] = 0
    class Config:
        from_attributes = True


# ─── PRODUCT ────────────────────────────────────────────
class ProductImageResponse(BaseModel):
    id: str
    image_url: str
    alt_text: str
    sort_order: int
    is_primary: bool
    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    slug: str
    sku: str
    hsn_code: str = ""
    description: str = ""
    short_description: str = ""
    price: float
    compare_price: Optional[float] = None
    cost_price: Optional[float] = None
    category_id: Optional[str] = None
    brand: str = ""
    stock: int = 0
    low_stock_threshold: int = 5
    weight: Optional[float] = None
    unit: str = "piece"
    is_active: bool = True
    is_featured: bool = False
    tags: str = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    hsn_code: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    cost_price: Optional[float] = None
    category_id: Optional[str] = None
    brand: Optional[str] = None
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    weight: Optional[float] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    tags: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    slug: str
    sku: str
    hsn_code: str = ""
    description: str
    short_description: str
    price: float
    compare_price: Optional[float]
    cost_price: Optional[float]
    category_id: Optional[str]
    category: Optional[CategoryResponse] = None
    brand: str
    stock: int
    low_stock_threshold: int
    weight: Optional[float]
    unit: str
    is_active: bool
    is_featured: bool
    tags: str
    images: List[ProductImageResponse] = []
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── CART ────────────────────────────────────────────────
class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1

class CartItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    product: ProductResponse
    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    id: str
    items: List[CartItemResponse] = []
    class Config:
        from_attributes = True


# ─── ORDER ──────────────────────────────────────────────
class OrderCreate(BaseModel):
    address_id: Optional[str] = None
    shipping_name: str = ""
    shipping_phone: str = ""
    shipping_address1: str = ""
    shipping_address2: str = ""
    shipping_city: str = ""
    shipping_state: str = ""
    shipping_pincode: str = ""
    payment_method: str = "cod"
    coupon_code: Optional[str] = None
    notes: str = ""

class OrderItemProductInfo(BaseModel):
    """Lightweight product snapshot embedded in order items."""
    slug: str = ""
    images: List[ProductImageResponse] = []
    class Config:
        from_attributes = True

class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_sku: str
    price: float
    quantity: int
    total: float
    product: Optional[OrderItemProductInfo] = None
    class Config:
        from_attributes = True

class OrderUserInfo(BaseModel):
    """Minimal user details embedded in order responses."""
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: str
    order_number: str
    user_id: str
    user: Optional[OrderUserInfo] = None
    status: str
    payment_status: str
    payment_method: str
    subtotal: float
    discount_amount: float
    shipping_charge: float
    tax_amount: float
    total: float
    coupon_code: Optional[str]
    shipping_name: str
    shipping_phone: str
    shipping_address1: str
    shipping_address2: str
    shipping_city: str
    shipping_state: str
    shipping_pincode: str
    notes: str
    tracking_number: str
    cancellation_reason: Optional[str] = None
    delivered_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    payment_status: Optional[str] = None
    cancellation_reason: Optional[str] = None

class OrderCancelRequest(BaseModel):
    reason: str

class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    page: int
    page_size: int


# ─── COUPON ─────────────────────────────────────────────
class CouponCreate(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: float = 0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    is_active: bool = True
    valid_from: datetime
    valid_until: datetime

class CouponResponse(BaseModel):
    id: str
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: float
    max_discount: Optional[float]
    usage_limit: Optional[int]
    used_count: int
    is_active: bool
    valid_from: datetime
    valid_until: datetime
    created_at: datetime
    class Config:
        from_attributes = True

class CouponValidate(BaseModel):
    code: str
    order_total: float


# ─── REVIEW ─────────────────────────────────────────────
class ReviewCreate(BaseModel):
    rating: int
    title: str = ""
    comment: str = ""

class ReviewResponse(BaseModel):
    id: str
    product_id: str
    user_id: str
    rating: int
    title: str
    comment: str
    is_approved: bool
    created_at: datetime
    user: Optional[UserResponse] = None
    class Config:
        from_attributes = True


# ─── WISHLIST ───────────────────────────────────────────
class WishlistResponse(BaseModel):
    id: str
    product_id: str
    product: ProductResponse
    created_at: datetime
    class Config:
        from_attributes = True


# ─── BANNER ─────────────────────────────────────────────
class BannerCreate(BaseModel):
    title: str
    subtitle: str = ""
    image_url: str = ""
    link_url: str = ""
    is_active: bool = True
    sort_order: int = 0
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None

class BannerResponse(BaseModel):
    id: str
    title: str
    subtitle: str
    image_url: str
    link_url: str
    is_active: bool
    sort_order: int
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True


# ─── STAFF ──────────────────────────────────────────────
class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str = ""
    phone: str = ""
    role: str = "STAFF"            # UserRole value (e.g. SALESPERSON, STOCK_KEEPER)
    permissions: List[str] = []     # Custom permission list; empty = use role template
    department: str = ""
    salary: float = 0

class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    department: Optional[str] = None
    salary: Optional[float] = None
    is_active: Optional[bool] = None

class StaffResponse(BaseModel):
    id: str
    user_id: str
    staff_role: str
    department: str
    salary: float
    joining_date: datetime
    is_active: bool
    user: UserResponse
    permissions: List[str] = []
    class Config:
        from_attributes = True

class PermissionTemplateResponse(BaseModel):
    all_permissions: List[dict]
    role_templates: dict


# ─── STORE SETTINGS ─────────────────────────────────────
class StoreSettingUpdate(BaseModel):
    key: str
    value: str

class StoreSettingResponse(BaseModel):
    id: str
    key: str
    value: str
    description: str
    class Config:
        from_attributes = True


# ─── INVENTORY ──────────────────────────────────────────
class InventoryUpdate(BaseModel):
    stock_change: int
    reason: str = ""

class InventoryTransactionCreate(BaseModel):
    products: List[dict]  # [{'product_id': 'xxx', 'quantity': 10}, ...]
    transaction_type: str  # 'inward' or 'outward'
    invoice_number: str = ""
    supplier_name: str = ""  # For inward
    customer_name: str = ""  # For outward
    invoice_date: Optional[date] = None
    invoice_image_url: str = ""  # Uploaded invoice document
    notes: str = ""

class InventoryLogResponse(BaseModel):
    id: str
    product_id: str
    product: Optional[dict] = None  # Will include product name, sku
    change: int
    reason: str
    performed_by: Optional[str]
    transaction_type: str = "manual"
    invoice_id: str = ""
    invoice_number: str = ""
    supplier_name: str = ""
    customer_name: str = ""
    invoice_date: Optional[str] = None
    invoice_image_url: str = ""
    notes: str = ""
    created_at: datetime
    
    @staticmethod
    def from_orm_with_product(log):
        data = {
            "id": log.id,
            "product_id": log.product_id,
            "change": log.change,
            "reason": log.reason,
            "performed_by": log.performed_by,
            "transaction_type": log.transaction_type,
            "invoice_id": log.invoice_id or "",
            "invoice_number": log.invoice_number or "",
            "supplier_name": log.supplier_name or "",
            "customer_name": log.customer_name or "",
            "invoice_date": str(log.invoice_date) if log.invoice_date else None,
            "invoice_image_url": log.invoice_image_url or "",
            "notes": log.notes or "",
            "created_at": log.created_at,
            "product": {
                "id": log.product.id,
                "name": log.product.name,
                "sku": log.product.sku,
                "stock": log.product.stock
            } if log.product else None
        }
        return InventoryLogResponse(**data)
    
    class Config:
        from_attributes = True


# ─── DASHBOARD ──────────────────────────────────────────
class DashboardStats(BaseModel):
    total_revenue: float
    total_orders: int
    total_customers: int
    total_products: int
    pending_orders: int
    low_stock_products: int
    low_stock_list: List[dict] = []
    recent_orders: List[OrderResponse] = []
    top_products: list = []
    revenue_by_day: list = []


# ─── SUPPLIER ────────────────────────────────────────────
class SupplierCreate(BaseModel):
    supplier_code: str
    name: str
    contact_person: str = ""
    email: str = ""
    phone: str
    alternate_phone: str = ""
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    gst_number: str = ""
    pan_number: str = ""
    bank_name: str = ""
    bank_account_number: str = ""
    bank_ifsc: str = ""
    payment_terms: str = "cash"
    credit_limit: float = 0
    opening_balance: float = 0
    rating: int = 5
    notes: str = ""
    is_active: bool = True

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    current_balance: Optional[float] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(BaseModel):
    id: str
    supplier_code: str
    name: str
    contact_person: str
    email: str
    phone: str
    alternate_phone: str
    address_line1: str
    address_line2: str
    city: str
    state: str
    pincode: str
    gst_number: str
    pan_number: str
    bank_name: str
    bank_account_number: str
    bank_ifsc: str
    payment_terms: str
    credit_limit: float
    opening_balance: float
    current_balance: float
    rating: int
    notes: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─── B2B CUSTOMER ────────────────────────────────────────
class B2BCustomerCreate(BaseModel):
    customer_code: str
    name: str
    contact_person: str = ""
    email: str = ""
    phone: str
    alternate_phone: str = ""
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    gst_number: str = ""
    pan_number: str = ""
    customer_type: str = "wholesale"
    price_tier: str = "standard"
    payment_terms: str = "cash"
    credit_limit: float = 0
    opening_balance: float = 0
    notes: str = ""
    is_active: bool = True

class B2BCustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    customer_type: Optional[str] = None
    price_tier: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    current_balance: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class B2BCustomerResponse(BaseModel):
    id: str
    customer_code: str
    name: str
    contact_person: str
    email: str
    phone: str
    alternate_phone: str
    address_line1: str
    address_line2: str
    city: str
    state: str
    pincode: str
    gst_number: str
    pan_number: str
    customer_type: str
    price_tier: str
    payment_terms: str
    credit_limit: float
    opening_balance: float
    current_balance: float
    notes: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─── WAREHOUSE ───────────────────────────────────────────
class WarehouseCreate(BaseModel):
    code: str
    name: str
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    manager_name: str = ""
    phone: str = ""
    is_active: bool = True

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    manager_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class WarehouseResponse(BaseModel):
    id: str
    code: str
    name: str
    address_line1: str
    address_line2: str
    city: str
    state: str
    pincode: str
    manager_name: str
    phone: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ─── PURCHASE ORDER ──────────────────────────────────────
class PurchaseOrderItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float = 0
    tax_percentage: float = 18
    notes: str = ""

class PurchaseOrderItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float
    tax_percentage: float
    line_total: float
    notes: str
    product: Optional[ProductResponse] = None
    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    po_number: str
    supplier_id: str
    warehouse_id: Optional[str] = None
    po_date: date
    expected_delivery_date: Optional[date] = None
    discount_percentage: float = 0
    freight_charges: float = 0
    other_charges: float = 0
    notes: str = ""
    terms_conditions: str = ""
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    discount_percentage: Optional[float] = None
    freight_charges: Optional[float] = None
    other_charges: Optional[float] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class PurchaseOrderResponse(BaseModel):
    id: str
    po_number: str
    supplier_id: str
    warehouse_id: Optional[str]
    status: str
    po_date: date
    expected_delivery_date: Optional[date]
    subtotal: float
    discount_percentage: float
    discount_amount: float
    freight_charges: float
    other_charges: float
    tax_amount: float
    total: float
    notes: str
    terms_conditions: str
    created_at: datetime
    updated_at: datetime
    supplier: Optional[SupplierResponse] = None
    items: List[PurchaseOrderItemResponse] = []
    class Config:
        from_attributes = True


# ─── GOODS RECEIVED NOTE ─────────────────────────────────
class GRNItemCreate(BaseModel):
    product_id: str
    ordered_quantity: int = 0
    received_quantity: int
    unit_price: float
    batch_number: str = ""
    expiry_date: Optional[date] = None
    notes: str = ""

class GRNItemResponse(BaseModel):
    id: str
    product_id: str
    ordered_quantity: int
    received_quantity: int
    unit_price: float
    batch_number: str
    expiry_date: Optional[date]
    notes: str
    product: Optional[ProductResponse] = None
    class Config:
        from_attributes = True

class GRNCreate(BaseModel):
    grn_number: str
    po_id: Optional[str] = None
    supplier_id: str
    warehouse_id: Optional[str] = None
    grn_date: date
    supplier_invoice_number: str = ""
    supplier_invoice_date: Optional[date] = None
    vehicle_number: str = ""
    received_by: str = ""
    notes: str = ""
    items: List[GRNItemCreate]

class GRNUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class GRNResponse(BaseModel):
    id: str
    grn_number: str
    po_id: Optional[str]
    supplier_id: str
    warehouse_id: Optional[str]
    status: str
    grn_date: date
    supplier_invoice_number: str
    supplier_invoice_date: Optional[date]
    vehicle_number: str
    received_by: str
    notes: str
    created_at: datetime
    supplier: Optional[SupplierResponse] = None
    items: List[GRNItemResponse] = []
    class Config:
        from_attributes = True


# ─── PURCHASE INVOICE ────────────────────────────────────
class PurchaseInvoiceItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float = 0
    tax_percentage: float = 18

class PurchaseInvoiceItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float
    discount_amount: float
    taxable_amount: float
    tax_percentage: float
    tax_amount: float
    line_total: float
    class Config:
        from_attributes = True

class PurchaseInvoiceCreate(BaseModel):
    invoice_number: str
    supplier_invoice_number: str = ""
    supplier_id: str
    grn_id: Optional[str] = None
    invoice_date: date
    due_date: Optional[date] = None
    payment_terms: str = "cash"
    discount_percentage: float = 0
    freight_charges: float = 0
    other_charges: float = 0
    gst_type: str = "cgst_sgst"
    invoice_image_url: str = ""
    notes: str = ""
    terms_conditions: str = ""
    items: List[PurchaseInvoiceItemCreate]

class PurchaseInvoiceUpdate(BaseModel):
    status: Optional[str] = None
    paid_amount: Optional[float] = None
    notes: Optional[str] = None

class PurchaseInvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    supplier_invoice_number: str
    supplier_id: str
    grn_id: Optional[str]
    status: str
    invoice_date: date
    due_date: Optional[date]
    payment_terms: str
    subtotal: float
    discount_percentage: float
    discount_amount: float
    freight_charges: float
    other_charges: float
    gst_type: str
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_tax: float
    total: float
    paid_amount: float
    balance_due: float
    invoice_image_url: str
    notes: str
    terms_conditions: str
    created_at: datetime
    updated_at: datetime
    supplier: Optional[SupplierResponse] = None
    items: List[PurchaseInvoiceItemResponse] = []
    class Config:
        from_attributes = True


# ─── SALES QUOTATION ─────────────────────────────────────
class SalesQuotationItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float = 0
    tax_percentage: float = 18
    notes: str = ""

class SalesQuotationItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float
    tax_percentage: float
    line_total: float
    notes: str
    product: Optional[ProductResponse] = None
    class Config:
        from_attributes = True

class SalesQuotationCreate(BaseModel):
    quotation_number: str
    customer_id: str
    quotation_date: date
    valid_until: Optional[date] = None
    discount_percentage: float = 0
    freight_charges: float = 0
    other_charges: float = 0
    gst_type: str = "cgst_sgst"
    notes: str = ""
    terms_conditions: str = ""
    items: List[SalesQuotationItemCreate]

class SalesQuotationUpdate(BaseModel):
    status: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None

class SalesQuotationResponse(BaseModel):
    id: str
    quotation_number: str
    customer_id: str
    status: str
    quotation_date: date
    valid_until: Optional[date]
    subtotal: float
    discount_percentage: float
    discount_amount: float
    freight_charges: float
    other_charges: float
    gst_type: str
    total_tax: float
    total: float
    notes: str
    terms_conditions: str
    created_at: datetime
    updated_at: datetime
    customer: Optional[B2BCustomerResponse] = None
    items: List[SalesQuotationItemResponse] = []
    class Config:
        from_attributes = True


# ─── SALES ORDER ─────────────────────────────────────────
class SalesOrderItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float = 0
    tax_percentage: float = 18
    notes: str = ""

class SalesOrderItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float
    tax_percentage: float
    line_total: float
    notes: str
    product: Optional[ProductResponse] = None
    class Config:
        from_attributes = True

class SalesOrderCreate(BaseModel):
    order_number: str
    customer_id: str
    quotation_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    order_date: date
    expected_delivery_date: Optional[date] = None
    discount_percentage: float = 0
    freight_charges: float = 0
    other_charges: float = 0
    payment_terms: str = "cash"
    gst_type: str = "cgst_sgst"
    notes: str = ""
    terms_conditions: str = ""
    items: List[SalesOrderItemCreate]

class SalesOrderUpdate(BaseModel):
    status: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None

class SalesOrderResponse(BaseModel):
    id: str
    order_number: str
    customer_id: str
    quotation_id: Optional[str]
    warehouse_id: Optional[str]
    status: str
    order_date: date
    expected_delivery_date: Optional[date]
    subtotal: float
    discount_percentage: float
    discount_amount: float
    freight_charges: float
    other_charges: float
    payment_terms: str
    gst_type: str
    total_tax: float
    total: float
    notes: str
    terms_conditions: str
    created_at: datetime
    updated_at: datetime
    customer: Optional[B2BCustomerResponse] = None
    items: List[SalesOrderItemResponse] = []
    class Config:
        from_attributes = True


# ─── SALES INVOICE ───────────────────────────────────────
class SalesInvoiceItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float = 0
    tax_percentage: float = 18

class SalesInvoiceItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    discount_percentage: float
    discount_amount: float
    taxable_amount: float
    tax_percentage: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    line_total: float
    product: Optional[ProductResponse] = None
    class Config:
        from_attributes = True

class SalesInvoiceCreate(BaseModel):
    invoice_number: str
    customer_id: str
    sales_order_id: Optional[str] = None
    delivery_note_id: Optional[str] = None
    invoice_date: date
    due_date: Optional[date] = None
    payment_terms: str = "cash"
    discount_percentage: float = 0
    freight_charges: float = 0
    other_charges: float = 0
    gst_type: str = "cgst_sgst"
    notes: str = ""
    terms_conditions: str = ""
    
    eway_bill_no: str = ""
    delivery_note_no: str = ""
    buyer_order_no: str = ""
    consignee_name: str = ""
    consignee_address: str = ""
    consignee_state: str = ""
    consignee_gstin: str = ""
    irn: str = ""
    ack_no: str = ""
    ack_date: Optional[date] = None
    
    items: List[SalesInvoiceItemCreate]

class SalesInvoiceUpdate(BaseModel):
    status: Optional[str] = None
    paid_amount: Optional[float] = None
    notes: Optional[str] = None

class SalesInvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    customer_id: str
    sales_order_id: Optional[str]
    delivery_note_id: Optional[str]
    status: str
    invoice_date: date
    due_date: Optional[date]
    payment_terms: str
    subtotal: float
    discount_percentage: float
    discount_amount: float
    freight_charges: float
    other_charges: float
    gst_type: str
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_tax: float
    round_off: float
    total: float
    paid_amount: float
    balance_due: float
    qr_code_data: str
    
    eway_bill_no: str
    delivery_note_no: str
    buyer_order_no: str
    consignee_name: str
    consignee_address: str
    consignee_state: str
    consignee_gstin: str
    irn: str
    ack_no: str
    ack_date: Optional[date]
    
    notes: str
    terms_conditions: str
    created_at: datetime
    updated_at: datetime
    customer: Optional[B2BCustomerResponse] = None
    items: List[SalesInvoiceItemResponse] = []
    class Config:
        from_attributes = True


# ─── PAYMENT ─────────────────────────────────────────────
class PaymentCreate(BaseModel):
    payment_number: str
    payment_type: str  # 'purchase' or 'sales'
    payment_date: date
    amount: float
    payment_method: str
    reference_number: str = ""
    bank_name: str = ""
    purchase_invoice_id: Optional[str] = None
    supplier_id: Optional[str] = None
    sales_invoice_id: Optional[str] = None
    customer_id: Optional[str] = None
    notes: str = ""

class PaymentResponse(BaseModel):
    id: str
    payment_number: str
    payment_type: str
    payment_date: date
    amount: float
    payment_method: str
    reference_number: str
    bank_name: str
    purchase_invoice_id: Optional[str]
    supplier_id: Optional[str]
    sales_invoice_id: Optional[str]
    customer_id: Optional[str]
    notes: str
    created_at: datetime
    class Config:
        from_attributes = True

