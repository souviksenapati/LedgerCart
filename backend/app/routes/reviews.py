from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.models import Review, Product, User, Order, OrderItem, OrderStatus, Order, OrderItem, OrderStatus
from app.schemas.schemas import ReviewCreate, ReviewResponse
from app.utils.auth import get_current_user, require_permission
from typing import List

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("/product/{product_id}", response_model=List[ReviewResponse])
def get_product_reviews(product_id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).options(joinedload(Review.user)).filter(
        Review.product_id == product_id, Review.is_approved == True
    ).order_by(Review.created_at.desc()).all()
    return [ReviewResponse.model_validate(r) for r in reviews]


@router.post("/product/{product_id}", response_model=ReviewResponse)
def add_review(product_id: str, req: ReviewCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    existing = db.query(Review).filter(Review.product_id == product_id, Review.user_id == user.id).first()
    if existing:
        raise HTTPException(400, "You already reviewed this product")

    if not 1 <= req.rating <= 5:
        raise HTTPException(400, "Rating must be 1-5")

    # Only verified buyers who received the product can review (Amazon/Flipkart standard)
    purchased = db.query(Order).join(OrderItem, OrderItem.order_id == Order.id).filter(
        Order.user_id == user.id,
        Order.status == OrderStatus.DELIVERED,
        OrderItem.product_id == product_id
    ).first()
    if not purchased:
        raise HTTPException(400, "You can only review products you have purchased and received")

    review = Review(product_id=product_id, user_id=user.id, **req.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return ReviewResponse.model_validate(review)


@router.get("/pending", response_model=List[ReviewResponse])
def get_pending_reviews(user=Depends(require_permission("reviews:view")), db: Session = Depends(get_db)):
    reviews = db.query(Review).options(joinedload(Review.user)).filter(
        Review.is_approved == False
    ).order_by(Review.created_at.desc()).all()
    return [ReviewResponse.model_validate(r) for r in reviews]


@router.put("/{review_id}/approve")
def approve_review(review_id: str, user=Depends(require_permission("reviews:manage")), db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "Review not found")
    review.is_approved = True
    db.commit()
    return {"message": "Review approved"}


@router.delete("/{review_id}")
def delete_review(review_id: str, user=Depends(require_permission("reviews:manage")), db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "Review not found")
    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}
