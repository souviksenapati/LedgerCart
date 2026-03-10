from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.models import Cart, CartItem, Product
from app.schemas.schemas import CartItemAdd, CartResponse
from app.utils.auth import get_current_user
from app.models.models import User

router = APIRouter(prefix="/api/cart", tags=["Cart"])


def _get_or_create_cart(user: User, db: Session) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


@router.get("", response_model=CartResponse)
def get_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(user, db)
    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.images)
    ).filter(Cart.id == cart.id).first()
    return CartResponse.model_validate(cart)


@router.post("/items")
def add_to_cart(req: CartItemAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == req.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(404, "Product not found")
    if product.stock < req.quantity:
        raise HTTPException(400, "Insufficient stock")

    cart = _get_or_create_cart(user, db)
    item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == req.product_id).first()

    if item:
        new_qty = item.quantity + req.quantity
        if new_qty > product.stock:
            raise HTTPException(400, f"Only {product.stock} unit(s) available (you already have {item.quantity} in cart)")
        item.quantity = new_qty
    else:
        item = CartItem(cart_id=cart.id, product_id=req.product_id, quantity=req.quantity)
        db.add(item)

    db.commit()
    return {"message": "Item added to cart"}


@router.put("/items/{item_id}")
def update_cart_item(item_id: str, quantity: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(user, db)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(404, "Cart item not found")

    if quantity <= 0:
        db.delete(item)
    else:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product and quantity > product.stock:
            raise HTTPException(400, f"Only {product.stock} unit(s) available in stock")
        item.quantity = quantity
    db.commit()
    return {"message": "Cart updated"}


@router.delete("/items/{item_id}")
def remove_cart_item(item_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(user, db)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(404, "Cart item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item removed"}


@router.delete("")
def clear_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(user, db)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    return {"message": "Cart cleared"}
