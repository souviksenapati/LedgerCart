import math
import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.models import (
    Order, OrderItem, Cart, CartItem, Product, ProductImage, Address, Coupon, User, UserRole,
    OrderStatus, PaymentStatus, PaymentMethod, DiscountType, InventoryLog
)
from app.schemas.schemas import (
    OrderCreate, OrderResponse, OrderStatusUpdate, OrderListResponse, OrderCancelRequest
)
from app.utils.auth import get_current_user, require_permission

router = APIRouter(prefix="/api/orders", tags=["Orders"])


def _gen_order_number():
    return "LC-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def _order_options():
    """Consistent joinedload options for all order queries."""
    return [
        joinedload(Order.user),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ]


@router.post("", response_model=OrderResponse)
def create_order(req: OrderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product)
    ).filter(Cart.user_id == user.id).first()

    if not cart or not cart.items:
        raise HTTPException(400, "Cart is empty")

    # Resolve shipping address
    if req.address_id:
        addr = db.query(Address).filter(Address.id == req.address_id, Address.user_id == user.id).first()
        if addr:
            req.shipping_name = addr.full_name
            req.shipping_phone = addr.phone
            req.shipping_address1 = addr.address_line1
            req.shipping_address2 = addr.address_line2
            req.shipping_city = addr.city
            req.shipping_state = addr.state
            req.shipping_pincode = addr.pincode

    if not req.shipping_name:
        raise HTTPException(400, "Shipping address is required")

    # Calculate totals
    subtotal = 0
    order_items = []
    for ci in cart.items:
        if ci.product.stock < ci.quantity:
            raise HTTPException(400, f"Insufficient stock for {ci.product.name}")
        item_total = float(ci.product.price) * ci.quantity
        subtotal += item_total
        order_items.append(OrderItem(
            product_id=ci.product.id,
            product_name=ci.product.name,
            product_sku=ci.product.sku,
            price=float(ci.product.price),
            quantity=ci.quantity,
            total=item_total
        ))

    # Apply coupon
    discount = 0
    if req.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == req.coupon_code, Coupon.is_active == True).first()
        if coupon:
            now = datetime.now(timezone.utc)
            if coupon.valid_from <= now <= coupon.valid_until:
                if subtotal >= float(coupon.min_order_amount):
                    if coupon.usage_limit is None or coupon.used_count < coupon.usage_limit:
                        if coupon.discount_type == DiscountType.PERCENTAGE:
                            discount = subtotal * (float(coupon.discount_value) / 100)
                            if coupon.max_discount:
                                discount = min(discount, float(coupon.max_discount))
                        else:
                            discount = float(coupon.discount_value)
                        coupon.used_count += 1

    shipping = 0 if subtotal >= 500 else 50
    taxable_amount = subtotal - discount  # GST on effective price after coupon discount
    tax = round(taxable_amount * 0.18, 2)
    total = round(subtotal - discount + shipping + tax, 2)

    payment_method_val = PaymentMethod(req.payment_method)

    order = Order(
        order_number=_gen_order_number(),
        user_id=user.id,
        status=OrderStatus.PENDING,
        payment_status=PaymentStatus.PENDING,  # Always PENDING; gateway verify endpoint sets PAID
        payment_method=payment_method_val,
        subtotal=subtotal,
        discount_amount=discount,
        shipping_charge=shipping,
        tax_amount=tax,
        total=total,
        coupon_code=req.coupon_code,
        shipping_name=req.shipping_name,
        shipping_phone=req.shipping_phone,
        shipping_address1=req.shipping_address1,
        shipping_address2=req.shipping_address2,
        shipping_city=req.shipping_city,
        shipping_state=req.shipping_state,
        shipping_pincode=req.shipping_pincode,
        notes=req.notes,
        items=order_items
    )
    db.add(order)

    # Deduct stock
    for ci in cart.items:
        ci.product.stock -= ci.quantity
        db.add(InventoryLog(
            product_id=ci.product.id,
            change=-ci.quantity,
            reason=f"Order {order.order_number}",
            performed_by=user.id
        ))

    # Clear cart
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

    db.commit()
    # Reload with full relationships for response
    order = db.query(Order).options(*_order_options()).filter(Order.id == order.id).first()
    return OrderResponse.model_validate(order)


@router.get("", response_model=OrderListResponse)
def my_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Order).options(*_order_options()).filter(Order.user_id == user.id)
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return OrderListResponse(orders=[OrderResponse.model_validate(o) for o in orders], total=total, page=page, page_size=page_size)


@router.get("/all", response_model=OrderListResponse)
def all_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    search: str = Query(None),
    admin=Depends(require_permission("ecom_orders:view")),
    db: Session = Depends(get_db)
):
    q = db.query(Order).options(*_order_options())
    if status:
        q = q.filter(Order.status == status)
    if search:
        q = q.filter(
            Order.order_number.ilike(f"%{search}%") |
            Order.shipping_name.ilike(f"%{search}%") |
            Order.shipping_phone.ilike(f"%{search}%")
        )
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return OrderListResponse(orders=[OrderResponse.model_validate(o) for o in orders], total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).options(*_order_options()).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == UserRole.CUSTOMER and order.user_id != user.id:
        raise HTTPException(403, "Access denied")
    return OrderResponse.model_validate(order)


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str, req: OrderStatusUpdate,
    admin=Depends(require_permission("ecom_orders:manage")), db: Session = Depends(get_db)
):
    order = db.query(Order).options(*_order_options()).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    prev_status = order.status
    order.status = OrderStatus(req.status)

    if req.tracking_number:
        order.tracking_number = req.tracking_number

    if req.payment_status:
        order.payment_status = PaymentStatus(req.payment_status)

    if req.status == "delivered":
        order.delivered_at = datetime.now(timezone.utc)
        # Mark paid only for COD (online payments should already be paid)
        if order.payment_method == PaymentMethod.COD:
            order.payment_status = PaymentStatus.PAID

    # Restore stock if admin is cancelling an order that wasn't already cancelled
    if req.status == "cancelled" and prev_status != OrderStatus.CANCELLED:
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity
                db.add(InventoryLog(
                    product_id=product.id,
                    change=item.quantity,
                    reason=f"Admin cancelled order {order.order_number}",
                    performed_by=None
                ))
        # If order was already paid, mark for refund
        if order.payment_status == PaymentStatus.PAID:
            order.payment_status = PaymentStatus.REFUNDED

    # Restore stock and mark refund when order is returned
    if req.status == "returned" and prev_status != OrderStatus.RETURNED:
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity
                db.add(InventoryLog(
                    product_id=product.id,
                    change=item.quantity,
                    reason=f"Order {order.order_number} returned",
                    performed_by=None
                ))
        # Initiate refund for returned paid orders
        if order.payment_status == PaymentStatus.PAID:
            order.payment_status = PaymentStatus.REFUNDED

    db.commit()
    db.refresh(order)
    order = db.query(Order).options(*_order_options()).filter(Order.id == order_id).first()
    return OrderResponse.model_validate(order)


# ─── E-COMMERCE PAYMENT GATEWAY ─────────────────────────────────────────────
# Gateway-ready endpoints. Current: Mock (simulated).  No real gateway SDK needed yet.
#
# ┌─ TO INTEGRATE RAZORPAY ──────────────────────────────────────────────────┐
# │ 1.  pip install razorpay                                                   │
# │ 2.  Add to .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET │
# │ 3.  In initiate_payment: call razorpay_client.order.create(...)           │
# │ 4.  In verify_payment:   call razorpay_client.utility.verify_payment_signature(...) │
# │ 5.  In payment_webhook:  verify X-Razorpay-Signature header               │
# └──────────────────────────────────────────────────────────────────────────┘

@router.post("/{order_id}/payment/initiate")
def initiate_payment(
    order_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1: Create a gateway payment session for this order.
    Frontend uses the returned session to open the payment modal.

    RAZORPAY REPLACEMENT — swap the mock block below with:
        import razorpay, os
        client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))
        rz_order = client.order.create({
            "amount": int(float(order.total) * 100),  # paise
            "currency": "INR",
            "receipt": order.order_number,
        })
        order.gateway_order_id = rz_order["id"]
        db.commit()
        return {
            "gateway": "razorpay",
            "gateway_order_id": rz_order["id"],
            "key_id": os.getenv("RAZORPAY_KEY_ID"),
            "amount": int(float(order.total) * 100),
            "amount_display": float(order.total),
            "currency": "INR",
            "order_number": order.order_number,
        }
    """
    import uuid as _uuid
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.payment_status == PaymentStatus.PAID:
        return {
            "gateway": "mock", "already_paid": True,
            "gateway_order_id": order.gateway_order_id or order.id,
            "amount": int(float(order.total) * 100),
            "amount_display": float(order.total),
            "currency": "INR", "order_number": order.order_number,
        }
    # ── MOCK BLOCK (replace with Razorpay above) ──
    mock_gw_id = f"mock_gw_{_uuid.uuid4().hex[:16]}"
    order.gateway_order_id = mock_gw_id
    db.commit()
    return {
        "gateway": "mock",
        "gateway_order_id": mock_gw_id,
        "amount": int(float(order.total) * 100),
        "amount_display": float(order.total),
        "currency": "INR",
        "order_number": order.order_number,
    }
    # ────────────────────────────────────────────────


@router.post("/{order_id}/payment/verify")
def verify_payment(
    order_id: str,
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 2: Verify gateway callback and mark order PAID.

    RAZORPAY REPLACEMENT — swap the mock block below with:
        import razorpay, os
        client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id":   data["gateway_order_id"],
                "razorpay_payment_id": data["transaction_id"],
                "razorpay_signature":  data["signature"],
            })
        except Exception:
            order.payment_status = PaymentStatus.FAILED
            db.commit()
            raise HTTPException(400, "Payment verification failed – invalid signature")
    """
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.payment_status == PaymentStatus.PAID:
        return {"status": "already_paid", "order_id": order.id}
    # ── MOCK BLOCK (replace with Razorpay above) ──
    transaction_id = data.get("transaction_id") or f"mock_txn_{order_id[:8]}"
    order.payment_status = PaymentStatus.PAID
    order.gateway_transaction_id = transaction_id
    db.commit()
    # ─────────────────────────────────────────────
    return {"status": "success", "order_id": order.id, "transaction_id": transaction_id}


@router.post("/gateway/webhook")
def payment_gateway_webhook(request_data: dict, db: Session = Depends(get_db)):
    """
    Async webhook from payment gateway. Handles late payment confirmations
    (bank delays, dropped connections, UPI late notifications).

    RAZORPAY REPLACEMENT:
        import hmac, hashlib, os
        from fastapi import Request
        payload = await request.body()      # raw bytes, NOT parsed JSON
        sig     = request.headers.get("X-Razorpay-Signature", "")
        expected= hmac.new(
            os.getenv("RAZORPAY_WEBHOOK_SECRET").encode(), payload, hashlib.sha256
        ).hexdigest()
        if sig != expected:
            raise HTTPException(400, "Invalid signature")
        event = request_data.get("event")
        if event == "payment.captured":
            payment   = request_data["payload"]["payment"]["entity"]
            rz_order_id = payment["order_id"]
            order = db.query(Order).filter(Order.gateway_order_id == rz_order_id).first()
            if order and order.payment_status != PaymentStatus.PAID:
                order.payment_status = PaymentStatus.PAID
                order.gateway_transaction_id = payment["id"]
                db.commit()
        elif event == "payment.failed":
            payment = request_data["payload"]["payment"]["entity"]
            order   = db.query(Order).filter(Order.gateway_order_id == payment["order_id"]).first()
            if order:
                order.payment_status = PaymentStatus.FAILED
                db.commit()
    """
    # ── MOCK BLOCK (replace with Razorpay handler above) ──
    event = request_data.get("event", "")
    if event == "payment.captured":
        gw_order_id = request_data.get("gateway_order_id")
        if gw_order_id:
            order = db.query(Order).filter(Order.gateway_order_id == gw_order_id).first()
            if order and order.payment_status != PaymentStatus.PAID:
                order.payment_status = PaymentStatus.PAID
                order.gateway_transaction_id = request_data.get("transaction_id")
                db.commit()
    return {"received": True}
    # ─────────────────────────────────────────────────────


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: str,
    req: OrderCancelRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).options(*_order_options()).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == UserRole.CUSTOMER and order.user_id != user.id:
        raise HTTPException(403, "Access denied")
    if order.status not in (OrderStatus.PENDING, OrderStatus.CONFIRMED):
        raise HTTPException(400, "Cannot cancel this order")

    order.status = OrderStatus.CANCELLED
    order.cancellation_reason = req.reason
    if order.payment_status == PaymentStatus.PAID:
        order.payment_status = PaymentStatus.REFUNDED
    # Restore stock
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
            db.add(InventoryLog(
                product_id=product.id,
                change=item.quantity,
                reason=f"Order {order.order_number} cancelled — {req.reason}",
                performed_by=user.id
            ))
    db.commit()
    return {"message": "Order cancelled"}
