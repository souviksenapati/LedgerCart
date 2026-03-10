"""
Seed script — populates the database with sample data for LedgerCart.
Run: python seed.py
"""
import sys
import os
import json
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta, timezone
from app.database import engine, SessionLocal, Base
from app.models.models import *
from app.utils.auth import hash_password

# Recreate all tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ─── ADMIN USER ──────────────────────────────────────────
admin = User(
    email="admin@ledgercart.com",
    password_hash=hash_password("admin123"),
    first_name="Admin",
    last_name="Admin",
    phone="9876543210",
    role=UserRole.ADMIN,
)
db.add(admin)

# ─── DEMO CUSTOMER ───────────────────────────────────────
customer = User(
    email="customer@demo.com",
    password_hash=hash_password("customer123"),
    first_name="Rahul",
    last_name="Sharma",
    phone="9876543211",
    role=UserRole.CUSTOMER,
)
db.add(customer)
db.flush()

customer_cart = Cart(user_id=customer.id)
db.add(customer_cart)

addr = Address(
    user_id=customer.id, label="Home", full_name="Rahul Sharma",
    phone="9876543211", address_line1="123 Main Road",
    city="Bhubaneswar", state="Odisha", pincode="751001", is_default=True
)
db.add(addr)

# ─── ROLE-BASED USERS ────────────────────────────────────
roles_to_seed = [
    (UserRole.STORE_MANAGER, "Store", "Manager", "storemanager@ledgercart.com", "storemanager123", "Management", 45000),
    (UserRole.SALESPERSON, "Sales", "Person", "salesperson@ledgercart.com", "salesperson123", "Sales", 20000),
    (UserRole.PURCHASE_MANAGER, "Purchase", "Manager", "purchasemanager@ledgercart.com", "purchasemanager123", "Procurement", 40000),
    (UserRole.STOCK_KEEPER, "Stock", "Keeper", "stockkeeper@ledgercart.com", "stockkeeper123", "Warehouse", 22000),
    (UserRole.ACCOUNTANT, "Account", "Ant", "accountant@ledgercart.com", "accountant123", "Accounts", 35000),
]

# ─── BASE STAFF USER ─────────────────────────────────────
staff_user = User(
    email="staff@ledgercart.com",
    password_hash=hash_password("staff123"),
    first_name="Priya",
    last_name="Patel",
    phone="9876543212",
    role=UserRole.STAFF,
    permissions=json.dumps(ROLE_PERMISSIONS.get(UserRole.STAFF, []))
)
db.add(staff_user)
db.flush()

staff_rec = Staff(
    user_id=staff_user.id,
    staff_role=StaffRole.SUPPORT,
    department="General",
    salary=20000,
    is_active=True
)
db.add(staff_rec)

for role, first, last, email, pwd, dept, salary in roles_to_seed:
    # Use template permissions from ROLE_PERMISSIONS
    perms = ROLE_PERMISSIONS.get(role, [])
    
    u = User(
        email=email,
        password_hash=hash_password(pwd),
        first_name=first,
        last_name=last,
        phone=f"987654{len(email):04}",
        role=role,
        permissions=json.dumps(perms) # Seed with default template permissions string
    )
    db.add(u)
    db.flush()
    
    # Add to staff table - Map to valid StaffRole enum members
    s_role = StaffRole.SUPPORT
    if role == UserRole.STORE_MANAGER: s_role = StaffRole.MANAGER
    elif role == UserRole.STOCK_KEEPER: s_role = StaffRole.WAREHOUSE

    s = Staff(
        user_id=u.id,
        staff_role=s_role, 
        department=dept,
        salary=salary,
        is_active=True
    )
    db.add(s)

# ─── CATEGORIES ──────────────────────────────────────────
categories_data = [
    ("Hand Tools", "hand-tools", "Hammers, screwdrivers, pliers, wrenches and more", 1),
    ("Power Tools", "power-tools", "Drills, grinders, saws and electric tools", 2),
    ("Plumbing", "plumbing", "Pipes, fittings, taps and plumbing supplies", 3),
    ("Electrical", "electrical", "Wires, switches, MCBs and electrical fittings", 4),
    ("Paint & Supplies", "paint-supplies", "Paints, brushes, rollers and painting accessories", 5),
    ("Fasteners", "fasteners", "Nuts, bolts, screws, nails and anchors", 6),
    ("Safety & PPE", "safety-ppe", "Helmets, gloves, goggles and safety equipment", 7),
    ("Building Materials", "building-materials", "Cement, sand, bricks and construction supplies", 8),
    ("Garden & Outdoor", "garden-outdoor", "Garden tools, hoses, sprinklers and outdoor items", 9),
    ("Adhesives & Sealants", "adhesives-sealants", "Glues, silicones, tapes and sealants", 10),
]

cats = {}
for name, slug, desc, order in categories_data:
    cat = Category(name=name, slug=slug, description=desc, sort_order=order)
    db.add(cat)
    db.flush()
    cats[slug] = cat

# ─── PRODUCTS ────────────────────────────────────────────
products_data = [
    # Hand Tools
    ("Claw Hammer 16oz", "claw-hammer-16oz", "SH-HT-001", "Premium steel claw hammer with rubber grip handle. Perfect for driving and removing nails.", "Steel claw hammer with rubber grip", 349, 499, 180, "hand-tools", "Stanley", 50, "hammer,hand-tool", True),
    ("Screwdriver Set 8-Piece", "screwdriver-set-8pc", "SH-HT-002", "Professional 8-piece screwdriver set with magnetic tips. Includes flat and Phillips heads.", "8-piece screwdriver set", 599, 799, 320, "hand-tools", "Taparia", 35, "screwdriver,set", True),
    ("Combination Plier 8inch", "combination-plier-8in", "SH-HT-003", "Heavy-duty combination plier with insulated handle for electrical work.", "8-inch combination plier", 275, 350, 140, "hand-tools", "Taparia", 45, "plier,hand-tool", False),
    ("Adjustable Wrench 10inch", "adjustable-wrench-10in", "SH-HT-004", "Chrome vanadium adjustable wrench with wide jaw opening.", "10-inch adjustable wrench", 425, 550, 220, "hand-tools", "Stanley", 30, "wrench,adjustable", False),
    ("Measuring Tape 5M", "measuring-tape-5m", "SH-HT-005", "5-meter retractable measuring tape with belt clip and lock.", "5M measuring tape", 199, 299, 85, "hand-tools", "Bosch", 60, "tape,measuring", False),

    # Power Tools
    ("Bosch Impact Drill 13mm", "bosch-impact-drill-13mm", "SH-PT-001", "650W impact drill with variable speed control, forward/reverse function. Includes drill bits set.", "Bosch 650W impact drill", 3499, 4999, 2200, "power-tools", "Bosch", 15, "drill,power-tool,bosch", True),
    ("Angle Grinder 4inch 850W", "angle-grinder-4in-850w", "SH-PT-002", "850W angle grinder with side handle and disc guard. Suitable for cutting and grinding.", "4-inch 850W angle grinder", 2799, 3499, 1800, "power-tools", "Bosch", 20, "grinder,power-tool", True),
    ("Circular Saw 7inch", "circular-saw-7in", "SH-PT-003", "1400W circular saw for wood and metal cutting with laser guide.", "7-inch circular saw", 4999, 6499, 3200, "power-tools", "Makita", 8, "saw,circular,power-tool", False),
    ("Hot Air Gun 2000W", "hot-air-gun-2000w", "SH-PT-004", "2000W hot air gun with temperature control for paint stripping and shrink wrapping.", "2000W hot air gun", 1899, 2499, 1100, "power-tools", "Stanley", 12, "heat-gun,power-tool", False),

    # Plumbing
    ("CPVC Pipe 1inch 3M", "cpvc-pipe-1in-3m", "SH-PL-001", "CPVC pipe suitable for hot and cold water supply. 1-inch diameter, 3-meter length.", "CPVC pipe 1-inch 3M", 289, None, 160, "plumbing", "Ashirvad", 100, "pipe,cpvc,plumbing", False),
    ("Ball Valve 1/2inch Brass", "ball-valve-half-inch", "SH-PL-002", "Heavy-duty brass ball valve for water line control.", "Brass ball valve 1/2 inch", 185, 249, 95, "plumbing", "Zoloto", 80, "valve,brass,plumbing", False),
    ("Bathroom Mixer Tap", "bathroom-mixer-tap", "SH-PL-003", "Chrome-plated single-lever basin mixer tap with aerator.", "Chrome basin mixer tap", 1999, 2999, 1200, "plumbing", "Jaquar", 25, "tap,mixer,bathroom", True),

    # Electrical
    ("MCB 32A Single Pole", "mcb-32a-sp", "SH-EL-001", "32-Amp single pole miniature circuit breaker for electrical protection.", "32A single pole MCB", 189, 249, 95, "electrical", "Havells", 100, "mcb,electrical,protection", False),
    ("LED Bulb 12W Cool White", "led-bulb-12w", "SH-EL-002", "12W LED bulb with B22 base, 1200 lumens, 6500K cool white.", "12W LED bulb", 129, 199, 55, "electrical", "Philips", 200, "led,bulb,lighting", False),
    ("Wire 1.5 sqmm 90M", "wire-1.5sqmm-90m", "SH-EL-003", "1.5 sq mm copper wire with FR PVC insulation. 90M coil.", "1.5 sqmm FR wire 90M", 1899, 2299, 1200, "electrical", "Havells", 40, "wire,copper,electrical", True),
    ("Modular Switch Board 8M", "modular-switch-8m", "SH-EL-004", "8-module switch board with frame and cover plate.", "8-module switch board", 399, 549, 210, "electrical", "Anchor", 50, "switch,board,electrical", False),

    # Paint
    ("Emulsion Paint 10L White", "emulsion-paint-10l-white", "SH-PA-001", "Premium interior emulsion paint, smooth finish, washable. 10-liter bucket.", "10L white emulsion paint", 2499, 3199, 1500, "paint-supplies", "Asian Paints", 30, "paint,emulsion,interior", True),
    ("Paint Roller 9inch", "paint-roller-9in", "SH-PA-002", "9-inch paint roller with handle and extra sleeve.", "9-inch paint roller", 249, 349, 120, "paint-supplies", "Generic", 40, "roller,paint,tool", False),

    # Fasteners
    ("Wood Screw Box 200pcs", "wood-screw-box-200", "SH-FA-001", "Assorted wood screws box - 200 pieces in various sizes.", "200pc wood screw assortment", 399, 549, 200, "fasteners", "GKW", 60, "screw,wood,fastener", False),
    ("Wall Anchor Kit 100pcs", "wall-anchor-kit-100", "SH-FA-002", "Plastic wall anchors with screws - 100 pieces kit.", "100pc wall anchor kit", 299, 399, 150, "fasteners", "Fischer", 50, "anchor,wall,fastener", False),

    # Safety
    ("Safety Helmet Yellow", "safety-helmet-yellow", "SH-SF-001", "ISI-marked industrial safety helmet with adjustable strap.", "Yellow safety helmet", 299, 449, 150, "safety-ppe", "Karam", 40, "helmet,safety,ppe", False),
    ("Leather Work Gloves", "leather-work-gloves", "SH-SF-002", "Premium leather work gloves with reinforced palm.", "Leather work gloves", 349, 499, 180, "safety-ppe", "Udyogi", 50, "gloves,safety,leather", False),

    # Building Materials
    ("White Cement 5Kg", "white-cement-5kg", "SH-BM-001", "Premium grade white cement for tile joints and finishing work.", "5Kg white cement", 199, 249, 110, "building-materials", "Birla White", 100, "cement,white,building", False),

    # Garden
    ("Garden Hose 15M", "garden-hose-15m", "SH-GD-001", "Heavy-duty PVC garden hose with brass connectors. 15-meter length.", "15M garden hose", 799, 999, 450, "garden-outdoor", "Generic", 30, "hose,garden,watering", False),
    ("Pruning Shears", "pruning-shears", "SH-GD-002", "Stainless steel bypass pruning shears with ergonomic grip.", "Pruning shears", 449, 599, 230, "garden-outdoor", "Falcon", 35, "shears,pruning,garden", False),

    # Adhesives
    ("Araldite Epoxy 36g", "araldite-epoxy-36g", "SH-AD-001", "Two-component epoxy adhesive for strong bonding on multiple surfaces.", "Araldite 36g epoxy", 149, 199, 75, "adhesives-sealants", "Araldite", 80, "epoxy,adhesive,araldite", False),
    ("Silicone Sealant White 280ml", "silicone-sealant-white", "SH-AD-002", "White silicone sealant for bathroom and kitchen. Waterproof.", "280ml white silicone sealant", 249, 349, 130, "adhesives-sealants", "Dow", 50, "silicone,sealant,waterproof", False),
]

for (name, slug, sku, desc, short, price, compare, cost, cat_slug, brand, stock, tags, featured) in products_data:
    p = Product(
        name=name, slug=slug, sku=sku, description=desc, short_description=short,
        price=price, compare_price=compare, cost_price=cost,
        category_id=cats[cat_slug].id, brand=brand, stock=stock, tags=tags,
        is_featured=featured, unit="piece"
    )
    db.add(p)
    db.flush()
    # Add placeholder image
    img = ProductImage(product_id=p.id, image_url=f"https://placehold.co/600x600/EEE/333?text={slug}", is_primary=True, alt_text=name)
    db.add(img)


# ─── COUPONS ─────────────────────────────────────────────
now = datetime.now(timezone.utc)
coupons = [
    Coupon(code="WELCOME10", discount_type=DiscountType.PERCENTAGE, discount_value=10, min_order_amount=500, max_discount=200, usage_limit=100, valid_from=now, valid_until=now + timedelta(days=365)),
    Coupon(code="FLAT100", discount_type=DiscountType.FLAT, discount_value=100, min_order_amount=1000, valid_from=now, valid_until=now + timedelta(days=180)),
    Coupon(code="TOOLS20", discount_type=DiscountType.PERCENTAGE, discount_value=20, min_order_amount=2000, max_discount=500, valid_from=now, valid_until=now + timedelta(days=90)),
]
db.add_all(coupons)


# ─── BANNERS ─────────────────────────────────────────────
banners = [
    Banner(title="Mega Tool Sale!", subtitle="Up to 50% off on power tools this month", image_url="https://placehold.co/1200x400/2563EB/FFF?text=Mega+Tool+Sale", link_url="/shop?category=power-tools", sort_order=1),
    Banner(title="Free Delivery", subtitle="On orders above ₹500", image_url="https://placehold.co/1200x400/059669/FFF?text=Free+Delivery", link_url="/shop", sort_order=2),
    Banner(title="New Arrivals", subtitle="Check out our latest collection of hand tools", image_url="https://placehold.co/1200x400/DC2626/FFF?text=New+Arrivals", link_url="/shop?category=hand-tools", sort_order=3),
]
db.add_all(banners)


# ─── STORE SETTINGS ──────────────────────────────────────
store_settings = [
    StoreSetting(key="store_name", value="LedgerCart", description="Store name"),
    StoreSetting(key="store_phone", value="+91 98765 43210", description="Store phone"),
    StoreSetting(key="store_email", value="info@ledgercart.com", description="Store email"),
    StoreSetting(key="store_address", value="Main Road, Bhubaneswar, Odisha 751001", description="Store address"),
    StoreSetting(key="gst_number", value="21XXXXX1234X1Z5", description="GST Number"),
    StoreSetting(key="gst_rate", value="18", description="GST Rate %"),
    StoreSetting(key="shipping_charge", value="50", description="Default shipping charge"),
    StoreSetting(key="free_shipping_threshold", value="500", description="Free shipping above this amount"),
    StoreSetting(key="currency", value="INR", description="Currency"),
]
db.add_all(store_settings)

db.commit()
db.close()

print("✅ Database seeded successfully!")
print("   Admin: admin@ledgercart.com / admin123")
print("   Customer: customer@demo.com / customer123")
print("   Staff: staff@ledgercart.com / staff123")
