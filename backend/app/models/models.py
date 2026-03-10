import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text, DateTime, Date,
    ForeignKey, Enum as SAEnum, Numeric, Table
)
from sqlalchemy.orm import relationship
from app.database import Base


# ─── ENUMS ──────────────────────────────────────────────
import enum

class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    STORE_MANAGER = "STORE_MANAGER"
    SALESPERSON = "SALESPERSON"
    PURCHASE_MANAGER = "PURCHASE_MANAGER"
    STOCK_KEEPER = "STOCK_KEEPER"
    ACCOUNTANT = "ACCOUNTANT"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentMethod(str, enum.Enum):
    COD = "cod"
    UPI = "upi"
    CARD = "card"
    NETBANKING = "netbanking"

class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FLAT = "flat"

class StaffRole(str, enum.Enum):
    MANAGER = "manager"
    WAREHOUSE = "warehouse"
    DELIVERY = "delivery"
    SUPPORT = "support"
    SALES = "sales"
    ACCOUNTS = "accounts"

class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"

class GRNStatus(str, enum.Enum):
    DRAFT = "draft"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PurchaseInvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class SalesQuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

class SalesOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PARTIALLY_DELIVERED = "partially_delivered"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class DeliveryNoteStatus(str, enum.Enum):
    DRAFT = "draft"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class SalesInvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentType(str, enum.Enum):
    PURCHASE = "purchase"  # Payment to supplier
    SALES = "sales"  # Payment from customer

class PaymentTerms(str, enum.Enum):
    CASH = "cash"
    CREDIT_15 = "credit_15"
    CREDIT_30 = "credit_30"
    CREDIT_60 = "credit_60"
    CREDIT_90 = "credit_90"

class GSTType(str, enum.Enum):
    CGST_SGST = "cgst_sgst"  # For intra-state (CGST 9% + SGST 9%)
    IGST = "igst"  # For inter-state (IGST 18%)


def generate_uuid():
    return str(uuid.uuid4())


# ─── PERMISSIONS & ROLE TEMPLATES ────────────────────────
# Master list of all 38 granular permissions
ALL_PERMISSIONS = [
    # Dashboard
    {"key": "dashboard:view", "label": "View Dashboard", "module": "Dashboard"},
    # Catalog
    {"key": "catalog:view", "label": "View Products & Categories", "module": "Catalog"},
    {"key": "catalog:manage", "label": "Manage Products & Categories", "module": "Catalog"},
    # E-commerce
    {"key": "ecom_orders:view", "label": "View E-commerce Orders", "module": "E-commerce"},
    {"key": "ecom_orders:manage", "label": "Manage E-commerce Orders", "module": "E-commerce"},
    {"key": "ecom_customers:view", "label": "View E-commerce Customers", "module": "E-commerce"},
    {"key": "ecom_customers:manage", "label": "Manage E-commerce Customers", "module": "E-commerce"},
    # Sales
    {"key": "sales_quotations:view", "label": "View Sales Quotations", "module": "Sales"},
    {"key": "sales_quotations:manage", "label": "Manage Sales Quotations", "module": "Sales"},
    {"key": "sales_quotations:approve", "label": "Approve Quotations", "module": "Sales"},
    {"key": "sales_quotations:export", "label": "Export Quotations", "module": "Sales"},
    {"key": "sales_orders:view", "label": "View Sales Orders", "module": "Sales"},
    {"key": "sales_orders:manage", "label": "Manage Sales Orders", "module": "Sales"},
    {"key": "sales_orders:approve", "label": "Approve Sales Orders", "module": "Sales"},
    {"key": "sales_orders:export", "label": "Export Sales Orders", "module": "Sales"},
    {"key": "sales_invoices:view", "label": "View Sales Invoices", "module": "Sales"},
    {"key": "sales_invoices:manage", "label": "Manage Sales Invoices", "module": "Sales"},
    {"key": "sales_invoices:void", "label": "Void Invoices", "module": "Sales"},
    {"key": "sales_invoices:export", "label": "Export Invoices", "module": "Sales"},
    {"key": "b2b_customers:view", "label": "View B2B Customers", "module": "Sales"},
    {"key": "b2b_customers:manage", "label": "Manage B2B Customers", "module": "Sales"},
    # Purchases
    {"key": "purchase_orders:view", "label": "View Purchase Orders", "module": "Purchases"},
    {"key": "purchase_orders:manage", "label": "Manage Purchase Orders", "module": "Purchases"},
    {"key": "purchase_orders:approve", "label": "Approve Purchase Orders", "module": "Purchases"},
    {"key": "purchase_orders:export", "label": "Export Purchase Orders", "module": "Purchases"},
    {"key": "grn:view", "label": "View Goods Receipt Notes", "module": "Purchases"},
    {"key": "grn:manage", "label": "Manage Goods Receipt Notes", "module": "Purchases"},
    {"key": "grn:export", "label": "Export GRNs", "module": "Purchases"},
    {"key": "purchase_invoices:view", "label": "View Purchase Invoices", "module": "Purchases"},
    {"key": "purchase_invoices:manage", "label": "Manage Purchase Invoices", "module": "Purchases"},
    {"key": "purchase_invoices:export", "label": "Export Purchase Invoices", "module": "Purchases"},
    {"key": "suppliers:view", "label": "View Suppliers", "module": "Purchases"},
    {"key": "suppliers:manage", "label": "Manage Suppliers", "module": "Purchases"},
    # Inventory
    {"key": "stock:view", "label": "View Stock Levels & Logs", "module": "Inventory"},
    {"key": "stock:manage", "label": "Manage Stock (Adjustments)", "module": "Inventory"},
    {"key": "stock:audit", "label": "Audit Stock Logs", "module": "Inventory"},
    {"key": "warehouses:view", "label": "View Warehouses", "module": "Inventory"},
    {"key": "warehouses:manage", "label": "Manage Warehouses", "module": "Inventory"},
    # Marketing
    {"key": "coupons:view", "label": "View Coupons", "module": "Marketing"},
    {"key": "coupons:manage", "label": "Manage Coupons", "module": "Marketing"},
    {"key": "banners:view", "label": "View Banners", "module": "Marketing"},
    {"key": "banners:manage", "label": "Manage Banners", "module": "Marketing"},
    {"key": "reviews:view", "label": "View Reviews", "module": "Marketing"},
    {"key": "reviews:manage", "label": "Moderate Reviews", "module": "Marketing"},
    # System
    {"key": "staff:view", "label": "View Staff", "module": "System"},
    {"key": "staff:manage", "label": "Manage Staff & Permissions", "module": "System"},
    {"key": "settings:view", "label": "View Settings", "module": "System"},
    {"key": "settings:manage", "label": "Manage Settings", "module": "System"},
    # Reports
    {"key": "reports:view", "label": "View Reports & Analytics", "module": "Reports"},
    {"key": "reports:export", "label": "Export Reports", "module": "Reports"},
    # Payments
    {"key": "payments:view", "label": "View Payments", "module": "Payments"},
    {"key": "payments:manage", "label": "Manage Payments", "module": "Payments"},
    {"key": "payments:export", "label": "Export Payments", "module": "Payments"},
]

# ─── PERMISSION HIERARCHY (Single authoritative definition) ────────────────
# Defines which action levels automatically imply other action levels.
# Key = the action the user HAS, Value = list of actions it IMPLIES.
# Used by both auth.py require_permission() and the frontend hasPermission().
PERMISSION_HIERARCHY = {
    "manage": ["view", "export"],   # manage implies view AND export
    "approve": ["view"],             # approve implies view
    "void": ["view"],                # void implies view
    "audit": ["view"],               # audit implies view
    "export": ["view"],              # export implies view — critical for report-only roles
}

# Role templates — these are default permission sets that auto-populate when assigning a role.
# Admins can then customize per-user.
ROLE_PERMISSIONS = {
    UserRole.ADMIN: ["*"],  # Wildcard — all permissions
    UserRole.STORE_MANAGER: [
        "dashboard:view",
        "catalog:view", "catalog:manage",
        "ecom_orders:view", "ecom_orders:manage",
        "ecom_customers:view", "ecom_customers:manage",
        "sales_quotations:view", "sales_quotations:manage", "sales_quotations:approve", "sales_quotations:export",
        "sales_orders:view", "sales_orders:manage", "sales_orders:approve", "sales_orders:export",
        "sales_invoices:view", "sales_invoices:manage", "sales_invoices:void", "sales_invoices:export",
        "b2b_customers:view", "b2b_customers:manage",
        "purchase_orders:view", "purchase_orders:manage", "purchase_orders:approve", "purchase_orders:export",
        "grn:view", "grn:manage", "grn:export",
        "purchase_invoices:view", "purchase_invoices:manage", "purchase_invoices:export",
        "suppliers:view", "suppliers:manage",
        "stock:view", "stock:manage", "stock:audit",
        "warehouses:view", "warehouses:manage",
        "coupons:view", "coupons:manage",
        "banners:view", "banners:manage",
        "reviews:view", "reviews:manage",
        "staff:view",
        "reports:view", "reports:export",
        "payments:view", "payments:manage", "payments:export",
    ],
    UserRole.SALESPERSON: [
        "dashboard:view",
        "catalog:view",
        "sales_quotations:view", "sales_quotations:manage", "sales_quotations:export",
        "sales_orders:view", "sales_orders:manage", "sales_orders:export",
        "sales_invoices:view", "sales_invoices:manage", "sales_invoices:export",
        "b2b_customers:view", "b2b_customers:manage",
        "stock:view",
        "payments:view", "payments:manage",
    ],
    UserRole.PURCHASE_MANAGER: [
        "dashboard:view",
        "purchase_orders:view", "purchase_orders:manage", "purchase_orders:approve", "purchase_orders:export",
        "grn:view", "grn:manage", "grn:export",
        "purchase_invoices:view", "purchase_invoices:manage", "purchase_invoices:export",
        "suppliers:view", "suppliers:manage",
        "stock:view", "stock:audit",
        "warehouses:view",
        "payments:view", "payments:manage",
    ],
    UserRole.STOCK_KEEPER: [
        "dashboard:view",
        "catalog:view",
        "stock:view", "stock:manage",
        "warehouses:view", "warehouses:manage",
        "grn:view", "grn:manage",
    ],
    UserRole.ACCOUNTANT: [
        "dashboard:view",
        "sales_invoices:view", "sales_invoices:manage", "sales_invoices:export",
        "purchase_invoices:view", "purchase_invoices:manage", "purchase_invoices:export",
        "b2b_customers:view",
        "suppliers:view",
        "reports:view", "reports:export",
        "payments:view", "payments:manage", "payments:export",
    ],
    UserRole.STAFF: [
        "dashboard:view",
        "stock:view",
    ],
    UserRole.CUSTOMER: [],  # No admin permissions
}



# ─── USERS ──────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), default="")
    phone = Column(String(20), default="")
    role = Column(SAEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    permissions = Column(Text, default="[]")  # JSON array of permission strings
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    cart = relationship("Cart", back_populates="user", uselist=False, cascade="all, delete-orphan")


# ─── STAFF ──────────────────────────────────────────────
class Staff(Base):
    __tablename__ = "staff"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    staff_role = Column(SAEnum(StaffRole), nullable=False)
    department = Column(String(100), default="")
    salary = Column(Numeric(10, 2), default=0)
    joining_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    user = relationship("User")


# ─── ADDRESS ────────────────────────────────────────────
class Address(Base):
    __tablename__ = "addresses"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    label = Column(String(50), default="Home")
    full_name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    address_line1 = Column(String(500), nullable=False)
    address_line2 = Column(String(500), default="")
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, default=False)

    user = relationship("User", back_populates="addresses")


# ─── CATEGORY ───────────────────────────────────────────
class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, unique=True)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text, default="")
    image_url = Column(String(500), default="")
    parent_id = Column(String, ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    parent = relationship("Category", remote_side=[id], backref="subcategories")
    products = relationship("Product", back_populates="category")


# ─── PRODUCT ────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(500), nullable=False)
    slug = Column(String(500), nullable=False, unique=True, index=True)
    sku = Column(String(100), unique=True, nullable=False)
    description = Column(Text, default="")
    short_description = Column(String(500), default="")
    price = Column(Numeric(10, 2), nullable=False)
    compare_price = Column(Numeric(10, 2), nullable=True)
    cost_price = Column(Numeric(10, 2), nullable=True)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    brand = Column(String(200), default="")
    stock = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    hsn_code = Column(String(20), default="")
    weight = Column(Float, nullable=True)
    unit = Column(String(50), default="piece")
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    tags = Column(String(1000), default="")
    meta_title = Column(String(300), default="")
    meta_description = Column(String(500), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")


# ─── PRODUCT IMAGE ──────────────────────────────────────
class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    alt_text = Column(String(300), default="")
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)

    product = relationship("Product", back_populates="images")


# ─── CART ────────────────────────────────────────────────
class Cart(Base):
    __tablename__ = "carts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    cart_id = Column(String, ForeignKey("carts.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")


# ─── ORDER ──────────────────────────────────────────────
class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_number = Column(String(50), unique=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.PENDING)
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(SAEnum(PaymentMethod), default=PaymentMethod.COD)
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0)
    shipping_charge = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), nullable=False)
    coupon_code = Column(String(100), nullable=True)
    shipping_name = Column(String(200), nullable=False)
    shipping_phone = Column(String(20), nullable=False)
    shipping_address1 = Column(String(500), nullable=False)
    shipping_address2 = Column(String(500), default="")
    shipping_city = Column(String(100), nullable=False)
    shipping_state = Column(String(100), nullable=False)
    shipping_pincode = Column(String(10), nullable=False)
    notes = Column(Text, default="")
    tracking_number = Column(String(200), default="")
    estimated_delivery = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    # ── Payment Gateway fields (Razorpay / Stripe) ──────────────────────────
    gateway_order_id = Column(String(200), nullable=True)        # Razorpay order_id / Stripe PaymentIntent ID
    gateway_transaction_id = Column(String(200), nullable=True)  # Razorpay payment_id / Stripe charge ID
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(500), nullable=False)
    product_sku = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    total = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


# ─── COUPON ─────────────────────────────────────────────
class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String(100), unique=True, nullable=False)
    discount_type = Column(SAEnum(DiscountType), nullable=False)
    discount_value = Column(Numeric(10, 2), nullable=False)
    min_order_amount = Column(Numeric(10, 2), default=0)
    max_discount = Column(Numeric(10, 2), nullable=True)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    # Store timezone-aware datetimes to match comparison with datetime.now(timezone.utc) in validation
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ─── REVIEW ─────────────────────────────────────────────
class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    title = Column(String(300), default="")
    comment = Column(Text, default="")
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


# ─── WISHLIST ───────────────────────────────────────────
class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="wishlist_items")
    product = relationship("Product")


# ─── BANNER / OFFER ─────────────────────────────────────
class Banner(Base):
    __tablename__ = "banners"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(300), nullable=False)
    subtitle = Column(String(500), default="")
    image_url = Column(String(500), default="")
    link_url = Column(String(500), default="")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ─── STORE SETTINGS ─────────────────────────────────────
class StoreSetting(Base):
    __tablename__ = "store_settings"

    id = Column(String, primary_key=True, default=generate_uuid)
    key = Column(String(200), unique=True, nullable=False)
    value = Column(Text, default="")
    description = Column(String(500), default="")


# ─── INVENTORY LOG ──────────────────────────────────────
class InventoryLog(Base):
    __tablename__ = "inventory_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    change = Column(Integer, nullable=False)
    reason = Column(String(500), default="")
    performed_by = Column(String, nullable=True)
    transaction_type = Column(String(10), default="manual")  # 'inward', 'outward', 'manual'
    invoice_id = Column(String(100), default="")  # Groups multiple products under same invoice
    invoice_number = Column(String(100), default="")
    supplier_name = Column(String(200), default="")
    customer_name = Column(String(200), default="")  # For outward transactions
    invoice_date = Column(Date, nullable=True)
    invoice_image_url = Column(String(500), default="")  # Invoice document/image
    notes = Column(String(1000), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")


# ─── SUPPLIER ───────────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=generate_uuid)
    supplier_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(300), nullable=False)
    contact_person = Column(String(200), default="")
    email = Column(String(255), default="")
    phone = Column(String(20), nullable=False)
    alternate_phone = Column(String(20), default="")
    address_line1 = Column(String(500), default="")
    address_line2 = Column(String(500), default="")
    city = Column(String(100), default="")
    state = Column(String(100), default="")
    pincode = Column(String(10), default="")
    gst_number = Column(String(15), default="")
    pan_number = Column(String(10), default="")
    bank_name = Column(String(200), default="")
    bank_account_number = Column(String(50), default="")
    bank_ifsc = Column(String(20), default="")
    payment_terms = Column(SAEnum(PaymentTerms), default=PaymentTerms.CASH)
    credit_limit = Column(Numeric(12, 2), default=0)
    opening_balance = Column(Numeric(12, 2), default=0)
    current_balance = Column(Numeric(12, 2), default=0)
    rating = Column(Integer, default=5)  # 1-5 star rating
    notes = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    purchase_invoices = relationship("PurchaseInvoice", back_populates="supplier")


# ─── B2B CUSTOMER ───────────────────────────────────────
class B2BCustomer(Base):
    __tablename__ = "b2b_customers"

    id = Column(String, primary_key=True, default=generate_uuid)
    customer_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(300), nullable=False)
    contact_person = Column(String(200), default="")
    email = Column(String(255), default="")
    phone = Column(String(20), nullable=False)
    alternate_phone = Column(String(20), default="")
    address_line1 = Column(String(500), default="")
    address_line2 = Column(String(500), default="")
    city = Column(String(100), default="")
    state = Column(String(100), default="")
    pincode = Column(String(10), default="")
    gst_number = Column(String(15), default="")
    pan_number = Column(String(10), default="")
    customer_type = Column(String(50), default="wholesale")  # wholesale, retail, distributor
    price_tier = Column(String(50), default="standard")  # standard, vip, premium
    payment_terms = Column(SAEnum(PaymentTerms), default=PaymentTerms.CASH)
    credit_limit = Column(Numeric(12, 2), default=0)
    opening_balance = Column(Numeric(12, 2), default=0)
    current_balance = Column(Numeric(12, 2), default=0)
    notes = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    quotations = relationship("SalesQuotation", back_populates="customer")
    sales_orders = relationship("SalesOrder", back_populates="customer")
    sales_invoices = relationship("SalesInvoice", back_populates="customer")


# ─── WAREHOUSE ──────────────────────────────────────────
class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    address_line1 = Column(String(500), default="")
    address_line2 = Column(String(500), default="")
    city = Column(String(100), default="")
    state = Column(String(100), default="")
    pincode = Column(String(10), default="")
    manager_name = Column(String(200), default="")
    phone = Column(String(20), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ─── PURCHASE ORDER ─────────────────────────────────────
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    po_number = Column(String(50), unique=True, nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    status = Column(SAEnum(PurchaseOrderStatus), default=PurchaseOrderStatus.DRAFT)
    po_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    freight_charges = Column(Numeric(10, 2), default=0)
    other_charges = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text, default="")
    terms_conditions = Column(Text, default="")
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    supplier = relationship("Supplier", back_populates="purchase_orders")
    warehouse = relationship("Warehouse")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    grns = relationship("GoodsReceivedNote", back_populates="purchase_order")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    po_id = Column(String, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    tax_percentage = Column(Numeric(5, 2), default=18)  # Default GST 18%
    line_total = Column(Numeric(12, 2), nullable=False)
    notes = Column(String(500), default="")

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")


# ─── GOODS RECEIVED NOTE (GRN) ──────────────────────────
class GoodsReceivedNote(Base):
    __tablename__ = "goods_received_notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    grn_number = Column(String(50), unique=True, nullable=False)
    po_id = Column(String, ForeignKey("purchase_orders.id"), nullable=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    status = Column(SAEnum(GRNStatus), default=GRNStatus.DRAFT)
    grn_date = Column(Date, nullable=False)
    supplier_invoice_number = Column(String(100), default="")
    supplier_invoice_date = Column(Date, nullable=True)
    vehicle_number = Column(String(50), default="")
    received_by = Column(String(200), default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    purchase_order = relationship("PurchaseOrder", back_populates="grns")
    supplier = relationship("Supplier")
    warehouse = relationship("Warehouse")
    items = relationship("GRNItem", back_populates="grn", cascade="all, delete-orphan")


class GRNItem(Base):
    __tablename__ = "grn_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    grn_id = Column(String, ForeignKey("goods_received_notes.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    ordered_quantity = Column(Integer, default=0)
    received_quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    batch_number = Column(String(100), default="")
    expiry_date = Column(Date, nullable=True)
    notes = Column(String(500), default="")

    grn = relationship("GoodsReceivedNote", back_populates="items")
    product = relationship("Product")


# ─── PURCHASE INVOICE ───────────────────────────────────
class PurchaseInvoice(Base):
    __tablename__ = "purchase_invoices"

    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_number = Column(String(50), unique=True, nullable=False)
    supplier_invoice_number = Column(String(100), default="")
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    grn_id = Column(String, ForeignKey("goods_received_notes.id"), nullable=True)
    status = Column(SAEnum(PurchaseInvoiceStatus), default=PurchaseInvoiceStatus.PENDING)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    payment_terms = Column(SAEnum(PaymentTerms), default=PaymentTerms.CASH)
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    freight_charges = Column(Numeric(10, 2), default=0)
    other_charges = Column(Numeric(10, 2), default=0)
    gst_type = Column(SAEnum(GSTType), default=GSTType.CGST_SGST)
    cgst_amount = Column(Numeric(10, 2), default=0)
    sgst_amount = Column(Numeric(10, 2), default=0)
    igst_amount = Column(Numeric(10, 2), default=0)
    total_tax = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0)
    balance_due = Column(Numeric(12, 2), default=0)
    invoice_image_url = Column(String(500), default="")
    notes = Column(Text, default="")
    terms_conditions = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    supplier = relationship("Supplier", back_populates="purchase_invoices")
    grn = relationship("GoodsReceivedNote")
    items = relationship("PurchaseInvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="purchase_invoice")


class PurchaseInvoiceItem(Base):
    __tablename__ = "purchase_invoice_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_id = Column(String, ForeignKey("purchase_invoices.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    taxable_amount = Column(Numeric(12, 2), nullable=False)
    tax_percentage = Column(Numeric(5, 2), default=18)  # GST 18%
    tax_amount = Column(Numeric(10, 2), default=0)
    line_total = Column(Numeric(12, 2), nullable=False)

    invoice = relationship("PurchaseInvoice", back_populates="items")
    product = relationship("Product")


# ─── SALES QUOTATION ────────────────────────────────────
class SalesQuotation(Base):
    __tablename__ = "sales_quotations"

    id = Column(String, primary_key=True, default=generate_uuid)
    quotation_number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(String, ForeignKey("b2b_customers.id"), nullable=False)
    status = Column(SAEnum(SalesQuotationStatus), default=SalesQuotationStatus.DRAFT)
    quotation_date = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    freight_charges = Column(Numeric(10, 2), default=0)
    other_charges = Column(Numeric(10, 2), default=0)
    gst_type = Column(SAEnum(GSTType), default=GSTType.CGST_SGST)
    total_tax = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text, default="")
    terms_conditions = Column(Text, default="")
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    customer = relationship("B2BCustomer", back_populates="quotations")
    items = relationship("SalesQuotationItem", back_populates="quotation", cascade="all, delete-orphan")


class SalesQuotationItem(Base):
    __tablename__ = "sales_quotation_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    quotation_id = Column(String, ForeignKey("sales_quotations.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    tax_percentage = Column(Numeric(5, 2), default=18)  # GST 18%
    line_total = Column(Numeric(12, 2), nullable=False)
    notes = Column(String(500), default="")

    quotation = relationship("SalesQuotation", back_populates="items")
    product = relationship("Product")


# ─── SALES ORDER ────────────────────────────────────────
class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(String, ForeignKey("b2b_customers.id"), nullable=False)
    quotation_id = Column(String, ForeignKey("sales_quotations.id"), nullable=True)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    status = Column(SAEnum(SalesOrderStatus), default=SalesOrderStatus.DRAFT)
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    freight_charges = Column(Numeric(10, 2), default=0)
    other_charges = Column(Numeric(10, 2), default=0)
    payment_terms = Column(String(50), default="cash")
    gst_type = Column(SAEnum(GSTType), default=GSTType.CGST_SGST)
    total_tax = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text, default="")
    terms_conditions = Column(Text, default="")
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    customer = relationship("B2BCustomer", back_populates="sales_orders")
    quotation = relationship("SalesQuotation")
    warehouse = relationship("Warehouse")
    items = relationship("SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan")
    delivery_notes = relationship("DeliveryNote", back_populates="sales_order")


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("sales_orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    tax_percentage = Column(Numeric(5, 2), default=18)  # GST 18%
    line_total = Column(Numeric(12, 2), nullable=False)
    notes = Column(String(500), default="")

    sales_order = relationship("SalesOrder", back_populates="items")
    product = relationship("Product")


# ─── DELIVERY NOTE ──────────────────────────────────────
class DeliveryNote(Base):
    __tablename__ = "delivery_notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    delivery_note_number = Column(String(50), unique=True, nullable=False)
    sales_order_id = Column(String, ForeignKey("sales_orders.id"), nullable=True)
    customer_id = Column(String, ForeignKey("b2b_customers.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    status = Column(SAEnum(DeliveryNoteStatus), default=DeliveryNoteStatus.DRAFT)
    delivery_date = Column(Date, nullable=False)
    vehicle_number = Column(String(50), default="")
    driver_name = Column(String(200), default="")
    driver_phone = Column(String(20), default="")
    delivered_by = Column(String(200), default="")
    received_by = Column(String(200), default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sales_order = relationship("SalesOrder", back_populates="delivery_notes")
    customer = relationship("B2BCustomer")
    warehouse = relationship("Warehouse")
    items = relationship("DeliveryNoteItem", back_populates="delivery_note", cascade="all, delete-orphan")


class DeliveryNoteItem(Base):
    __tablename__ = "delivery_note_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    delivery_note_id = Column(String, ForeignKey("delivery_notes.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    ordered_quantity = Column(Integer, default=0)
    delivered_quantity = Column(Integer, nullable=False)
    batch_number = Column(String(100), default="")
    notes = Column(String(500), default="")

    delivery_note = relationship("DeliveryNote", back_populates="items")
    product = relationship("Product")


# ─── SALES INVOICE ──────────────────────────────────────
class SalesInvoice(Base):
    __tablename__ = "sales_invoices"

    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(String, ForeignKey("b2b_customers.id"), nullable=False)
    sales_order_id = Column(String, ForeignKey("sales_orders.id"), nullable=True)
    delivery_note_id = Column(String, ForeignKey("delivery_notes.id"), nullable=True)
    status = Column(SAEnum(SalesInvoiceStatus), default=SalesInvoiceStatus.DRAFT)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    payment_terms = Column(SAEnum(PaymentTerms), default=PaymentTerms.CASH)
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    freight_charges = Column(Numeric(10, 2), default=0)
    other_charges = Column(Numeric(10, 2), default=0)
    gst_type = Column(SAEnum(GSTType), default=GSTType.CGST_SGST)
    cgst_amount = Column(Numeric(10, 2), default=0)
    sgst_amount = Column(Numeric(10, 2), default=0)
    igst_amount = Column(Numeric(10, 2), default=0)
    total_tax = Column(Numeric(12, 2), default=0)
    round_off = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0)
    balance_due = Column(Numeric(12, 2), default=0)
    
    # Template specific fields
    eway_bill_no = Column(String(50), default="")
    delivery_note_no = Column(String(50), default="")
    buyer_order_no = Column(String(50), default="")
    consignee_name = Column(String(300), default="")
    consignee_address = Column(String(500), default="")
    consignee_state = Column(String(100), default="")
    consignee_gstin = Column(String(15), default="")
    irn = Column(String(500), default="")
    ack_no = Column(String(100), default="")
    ack_date = Column(Date, nullable=True)
    
    qr_code_data = Column(String(500), default="")  # For UPI payment QR
    notes = Column(Text, default="")
    terms_conditions = Column(Text, default="")
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    customer = relationship("B2BCustomer", back_populates="sales_invoices")
    sales_order = relationship("SalesOrder")
    delivery_note = relationship("DeliveryNote")
    items = relationship("SalesInvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="sales_invoice")


class SalesInvoiceItem(Base):
    __tablename__ = "sales_invoice_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_id = Column(String, ForeignKey("sales_invoices.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    taxable_amount = Column(Numeric(12, 2), nullable=False)
    tax_percentage = Column(Numeric(5, 2), default=18)  # GST 18%
    cgst_amount = Column(Numeric(10, 2), default=0)
    sgst_amount = Column(Numeric(10, 2), default=0)
    igst_amount = Column(Numeric(10, 2), default=0)
    line_total = Column(Numeric(12, 2), nullable=False)

    invoice = relationship("SalesInvoice", back_populates="items")
    product = relationship("Product")


# ─── PAYMENT ────────────────────────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    payment_number = Column(String(50), unique=True, nullable=False)
    payment_type = Column(SAEnum(PaymentType), nullable=False)
    payment_date = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(SAEnum(PaymentMethod), nullable=False)
    reference_number = Column(String(100), default="")  # Cheque/UPI/Transaction reference
    bank_name = Column(String(200), default="")
    # For purchase payments (to suppliers)
    purchase_invoice_id = Column(String, ForeignKey("purchase_invoices.id"), nullable=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    # For sales receipts (from customers)
    sales_invoice_id = Column(String, ForeignKey("sales_invoices.id"), nullable=True)
    customer_id = Column(String, ForeignKey("b2b_customers.id"), nullable=True)
    notes = Column(Text, default="")
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    purchase_invoice = relationship("PurchaseInvoice", back_populates="payments")
    sales_invoice = relationship("SalesInvoice", back_populates="payments")
    supplier = relationship("Supplier")
    customer = relationship("B2BCustomer")


# ─── BATCH TRACKING ─────────────────────────────────────
class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_number = Column(String(100), unique=True, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    manufacturing_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    quantity = Column(Integer, default=0)
    available_quantity = Column(Integer, default=0)
    cost_price = Column(Numeric(10, 2), default=0)
    grn_id = Column(String, ForeignKey("goods_received_notes.id"), nullable=True)
    notes = Column(String(500), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")
    warehouse = relationship("Warehouse")
    grn = relationship("GoodsReceivedNote")


# ─── SERIAL NUMBER TRACKING ─────────────────────────────
class SerialNumber(Base):
    __tablename__ = "serial_numbers"

    id = Column(String, primary_key=True, default=generate_uuid)
    serial_number = Column(String(200), unique=True, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=True)
    status = Column(String(50), default="in_stock")  # in_stock, sold, returned, damaged
    grn_id = Column(String, ForeignKey("goods_received_notes.id"), nullable=True)
    sales_invoice_id = Column(String, ForeignKey("sales_invoices.id"), nullable=True)
    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True)
    notes = Column(String(500), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")
    warehouse = relationship("Warehouse")
    batch = relationship("Batch")
    grn = relationship("GoodsReceivedNote")
    sales_invoice = relationship("SalesInvoice")
