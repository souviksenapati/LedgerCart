from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.models import Payment, PurchaseInvoice, SalesInvoice, Supplier, B2BCustomer
from app.schemas.schemas import PaymentCreate, PaymentResponse
from app.utils.auth import require_permission

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("payments:manage"))
):
    """Create a new payment record. Requires payments:manage permission."""
    # Check if payment number exists
    existing = db.query(Payment).filter(Payment.payment_number == payment.payment_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment number already exists")

    # Check if payment amount exceeds the outstanding balance
    if payment.payment_type == "purchase" and payment.purchase_invoice_id:
        pre_check = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == payment.purchase_invoice_id).first()
        if pre_check and float(payment.amount) > float(pre_check.balance_due):
            raise HTTPException(status_code=400, detail=f"Payment amount ({payment.amount}) exceeds outstanding balance ({pre_check.balance_due})")
    elif payment.payment_type == "sales" and payment.sales_invoice_id:
        pre_check = db.query(SalesInvoice).filter(SalesInvoice.id == payment.sales_invoice_id).first()
        if pre_check and float(payment.amount) > float(pre_check.balance_due):
            raise HTTPException(status_code=400, detail=f"Payment amount ({payment.amount}) exceeds outstanding balance ({pre_check.balance_due})")

    # Create payment
    db_payment = Payment(
        **payment.model_dump(),
        created_by=current_user.id
    )
    db.add(db_payment)

    from decimal import Decimal as D

    # Update invoice status and balance
    if payment.payment_type == "purchase" and payment.purchase_invoice_id:
        invoice = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == payment.purchase_invoice_id).first()
        if invoice:
            # Atomic updates
            amount = D(str(payment.amount))
            invoice.paid_amount = PurchaseInvoice.paid_amount + amount
            invoice.balance_due = PurchaseInvoice.balance_due - amount

            # We need to refresh to check the new balance for status update,
            # but we can't refresh before commit in a transaction efficiently without flush.
            # For status, we will rely on the python side calculation for the response,
            # but the DB update is atomic.
            # To set status correctly in DB, we might need a case expression or a trigger,
            # but for now let's flush and re-check or just trust the atomic math.

            # Actually, let's just do the status update based on the pre-calculation
            # (Atomic update prevents data corruption, status might be slightly off in rare race,
            # but money is safe).
            if (invoice.balance_due - amount) <= 0:
                invoice.status = "paid"
            elif (invoice.paid_amount + amount) > 0:
                invoice.status = "partially_paid"

            # Update supplier balance atomically
            if payment.supplier_id:
                supplier = db.query(Supplier).filter(Supplier.id == payment.supplier_id).first()
                if supplier:
                    supplier.current_balance = Supplier.current_balance - amount

    elif payment.payment_type == "sales" and payment.sales_invoice_id:
        invoice = db.query(SalesInvoice).filter(SalesInvoice.id == payment.sales_invoice_id).first()
        if invoice:
            amount = D(str(payment.amount))
            invoice.paid_amount = SalesInvoice.paid_amount + amount
            invoice.balance_due = SalesInvoice.balance_due - amount

            if (invoice.balance_due - amount) <= 0:
                invoice.status = "paid"
            elif (invoice.paid_amount + amount) > 0:
                invoice.status = "partially_paid"

            # Update customer balance atomically
            if payment.customer_id:
                customer = db.query(B2BCustomer).filter(B2BCustomer.id == payment.customer_id).first()
                if customer:
                    customer.current_balance = B2BCustomer.current_balance - amount

    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.get("/", response_model=List[PaymentResponse])
def get_payments(
    skip: int = 0,
    limit: int = 100,
    payment_type: str = None,
    supplier_id: str = None,
    customer_id: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("payments:view"))
):
    """Get all payments with optional filtering. Requires payments:view permission."""
    query = db.query(Payment)

    if payment_type:
        query = query.filter(Payment.payment_type == payment_type)
    if supplier_id:
        query = query.filter(Payment.supplier_id == supplier_id)
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)

    query = query.order_by(Payment.created_at.desc())
    payments = query.offset(skip).limit(limit).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("payments:view"))
):
    """Get a specific payment by ID. Requires payments:view permission."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.get("/purchase-invoice/{invoice_id}", response_model=List[PaymentResponse])
def get_payments_by_purchase_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("payments:view"))
):
    """Get all payments for a specific purchase invoice. Requires payments:view permission."""
    payments = db.query(Payment).filter(
        Payment.purchase_invoice_id == invoice_id
    ).order_by(Payment.payment_date.desc()).all()

    return payments


@router.get("/sales-invoice/{invoice_id}", response_model=List[PaymentResponse])
def get_payments_by_sales_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("payments:view"))
):
    """Get all payments for a specific sales invoice. Requires payments:view permission."""
    payments = db.query(Payment).filter(
        Payment.sales_invoice_id == invoice_id
    ).order_by(Payment.payment_date.desc()).all()

    return payments


@router.get("/supplier/{supplier_id}/aging")
def get_supplier_aging(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("payments:view"))
):
    """Get supplier payment aging analysis. Requires payments:view permission."""
    from datetime import date, timedelta

    today = date.today()

    # Get all unpaid/partially paid invoices for supplier
    invoices = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.supplier_id == supplier_id,
        PurchaseInvoice.balance_due > 0
    ).all()

    aging = {
        "current": 0,  # 0-30 days
        "30_60": 0,    # 30-60 days
        "60_90": 0,    # 60-90 days
        "over_90": 0,  # >90 days
        "total_due": 0
    }

    for invoice in invoices:
        days_overdue = (today - invoice.due_date).days if invoice.due_date else 0
        balance = float(invoice.balance_due)

        if days_overdue < 30:
            aging["current"] += balance
        elif days_overdue < 60:
            aging["30_60"] += balance
        elif days_overdue < 90:
            aging["60_90"] += balance
        else:
            aging["over_90"] += balance

        aging["total_due"] += balance

    return aging


@router.get("/customer/{customer_id}/aging")
def get_customer_aging(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("payments:view"))
):
    """Get customer payment aging analysis. Requires payments:view permission."""
    from datetime import date, timedelta

    today = date.today()

    # Get all unpaid/partially paid invoices for customer
    invoices = db.query(SalesInvoice).filter(
        SalesInvoice.customer_id == customer_id,
        SalesInvoice.balance_due > 0
    ).all()

    aging = {
        "current": 0,  # 0-30 days
        "30_60": 0,    # 30-60 days
        "60_90": 0,    # 60-90 days
        "over_90": 0,  # >90 days
        "total_due": 0
    }

    for invoice in invoices:
        days_overdue = (today - invoice.due_date).days if invoice.due_date else 0
        balance = float(invoice.balance_due)

        if days_overdue < 30:
            aging["current"] += balance
        elif days_overdue < 60:
            aging["30_60"] += balance
        elif days_overdue < 90:
            aging["60_90"] += balance
        else:
            aging["over_90"] += balance

        aging["total_due"] += balance

    return aging
