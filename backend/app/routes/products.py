import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.database import get_db
from app.models.models import Product, ProductImage, Category
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
)
from app.utils.auth import require_permission

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    category: str = Query(None),
    brand: str = Query(None),
    search: str = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    sort: str = Query("newest"),
    featured: bool = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Product).options(joinedload(Product.images), joinedload(Product.category))
    q = q.filter(Product.is_active == True)

    if category:
        cat = db.query(Category).filter(Category.slug == category).first()
        if cat:
            q = q.filter(Product.category_id == cat.id)
    if brand:
        q = q.filter(Product.brand.ilike(f"%{brand}%"))
    if search:
        q = q.filter(or_(
            Product.name.ilike(f"%{search}%"),
            Product.description.ilike(f"%{search}%"),
            Product.tags.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%")
        ))
    if min_price is not None:
        q = q.filter(Product.price >= min_price)
    if max_price is not None:
        q = q.filter(Product.price <= max_price)
    if featured is not None:
        q = q.filter(Product.is_featured == featured)

    total = q.count()

    if sort == "price_asc":
        q = q.order_by(Product.price.asc())
    elif sort == "price_desc":
        q = q.order_by(Product.price.desc())
    elif sort == "name":
        q = q.order_by(Product.name.asc())
    else:
        q = q.order_by(Product.created_at.desc())

    products = q.offset((page - 1) * page_size).limit(page_size).all()
    return ProductListResponse(
        products=[ProductResponse.model_validate(p) for p in products],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0
    )


@router.get("/{slug}", response_model=ProductResponse)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        joinedload(Product.images), joinedload(Product.category)
    ).filter(Product.slug == slug).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return ProductResponse.model_validate(product)


@router.post("", response_model=ProductResponse)
def create_product(req: ProductCreate, admin=Depends(require_permission("catalog:manage")), db: Session = Depends(get_db)):
    # Normalize SKU
    req.sku = req.sku.upper()
    
    if db.query(Product).filter(Product.sku == req.sku).first():
        raise HTTPException(400, "SKU already exists")
    if db.query(Product).filter(Product.slug == req.slug).first():
        raise HTTPException(400, "Slug already exists")

    product = Product(**req.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, req: ProductUpdate, admin=Depends(require_permission("catalog:manage")), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    # Uniqueness checks
    if req.sku:
        req.sku = req.sku.upper()
        existing = db.query(Product).filter(Product.sku == req.sku, Product.id != product_id).first()
        if existing:
            raise HTTPException(400, "SKU already exists")
    
    if req.slug:
        existing = db.query(Product).filter(Product.slug == req.slug, Product.id != product_id).first()
        if existing:
            raise HTTPException(400, "Slug already exists")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}")
def delete_product(product_id: str, admin=Depends(require_permission("catalog:manage")), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    # Soft-delete: deactivate rather than hard-delete to preserve order history integrity
    product.is_active = False
    db.commit()
    return {"message": "Product deactivated"}


@router.post("/{product_id}/images")
def add_product_image(
    product_id: str, image_url: str, alt_text: str = "", is_primary: bool = False,
    admin=Depends(require_permission("catalog:manage")), db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    if is_primary:
        db.query(ProductImage).filter(
            ProductImage.product_id == product_id
        ).update({"is_primary": False})

    img = ProductImage(product_id=product_id, image_url=image_url, alt_text=alt_text, is_primary=is_primary)
    db.add(img)
    db.commit()
    return {"message": "Image added", "id": img.id}


@router.delete("/{product_id}/images/{image_id}")
def remove_product_image(product_id: str, image_id: str, admin=Depends(require_permission("catalog:manage")), db: Session = Depends(get_db)):
    img = db.query(ProductImage).filter(ProductImage.id == image_id, ProductImage.product_id == product_id).first()
    if not img:
        raise HTTPException(404, "Image not found")
    db.delete(img)
    db.commit()
    return {"message": "Image removed"}
