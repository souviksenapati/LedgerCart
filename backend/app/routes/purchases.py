from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date
from app.database import get_db
from app.models.models import (
    PurchaseOrder, PurchaseOrderItem, 
    GoodsReceivedNote, GRNItem,
    PurchaseInvoice, PurchaseInvoiceItem,
    Product, Supplier, InventoryLog,
    PurchaseOrderStatus
)
from app.schemas.schemas import (
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse,
    GRNCreate, GRNUpdate, GRNResponse,
    PurchaseInvoiceCreate, PurchaseInvoiceUpdate, PurchaseInvoiceResponse
)
from app.utils.auth import require_permission

router = APIRouter(prefix="/api/purchases", tags=["Purchase Management"])


# ═══════════════════════════════════════════════════════
# PURCHASE ORDERS
# ═══════════════════════════════════════════════════════

@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order(
    po: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_orders:manage"))
):
    """Create a new purchase order"""
    # Check if PO number already exists
    existing = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po.po_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="PO number already exists")
    
    # Calculate totals
    subtotal = 0
    tax_amount = 0
    
    for item in po.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount
        item_tax = taxable * (item.tax_percentage / 100)
        line_total = taxable + item_tax
        
        subtotal += item_subtotal
        tax_amount += item_tax
    
    discount_amount = subtotal * (po.discount_percentage / 100)
    total = subtotal - discount_amount + po.freight_charges + po.other_charges + tax_amount
    
    
    # Create PO
    db_po = PurchaseOrder(
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        warehouse_id=po.warehouse_id,
        status=PurchaseOrderStatus.PENDING, # Explicitly set to pending
        po_date=po.po_date,
        expected_delivery_date=po.expected_delivery_date,
        subtotal=subtotal,
        discount_percentage=po.discount_percentage,
        discount_amount=discount_amount,
        freight_charges=po.freight_charges,
        other_charges=po.other_charges,
        tax_amount=tax_amount,
        total=total,
        notes=po.notes,
        terms_conditions=po.terms_conditions,
        created_by=current_user.id
    )
    db.add(db_po)
    db.flush()
    
    # Add line items
    for item in po.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount
        line_total = taxable + (taxable * item.tax_percentage / 100)
        
        db_item = PurchaseOrderItem(
            po_id=db_po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percentage=item.discount_percentage,
            tax_percentage=item.tax_percentage,
            line_total=line_total,
            notes=item.notes
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_po)
    
    # Load relationships
    db_po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.id == db_po.id).first()
    
    return db_po


@router.post("/purchase-orders/{po_id}/approve")
def approve_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_orders:approve"))
):
    """Approve a purchase order"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.status != PurchaseOrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending orders can be approved")
    
    po.status = PurchaseOrderStatus.APPROVED
    db.commit()
    return {"message": "Purchase Order approved", "id": po.id}


@router.get("/purchase-orders/export")
def export_purchase_orders(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_orders:export"))
):
    """Export Purchase Orders to CSV"""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    orders = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.supplier)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "PO Number", "Date", "Supplier", "Status", 
        "Total Amount", "Warehouse ID", "Created By"
    ])
    
    for po in orders:
        writer.writerow([
            po.po_number,
            po.po_date,
            po.supplier.name if po.supplier else "N/A",
            po.status,
            po.total,
            po.warehouse_id,
            po.created_by
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=purchase_orders.csv"}
    )


@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    supplier_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_orders:view"))
):
    """Get all purchase orders"""
    query = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items)
    )
    
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    
    query = query.order_by(PurchaseOrder.created_at.desc())
    orders = query.offset(skip).limit(limit).all()
    return orders


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_orders:view"))
):
    """Get a specific purchase order"""
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: str,
    po_update: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_orders:manage"))
):
    """Update a purchase order"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    for key, value in po_update.model_dump(exclude_unset=True).items():
        setattr(po, key, value)
    
    db.commit()
    db.refresh(po)
    return po


# ═══════════════════════════════════════════════════════
# GOODS RECEIVED NOTES (GRN)
# ═══════════════════════════════════════════════════════

@router.post("/grn", response_model=GRNResponse)
def create_grn(
    grn: GRNCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grn:manage"))
):
    """Create a new GRN and update inventory"""
    # Check if GRN number already exists
    existing = db.query(GoodsReceivedNote).filter(GoodsReceivedNote.grn_number == grn.grn_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="GRN number already exists")
    
    # Create GRN
    db_grn = GoodsReceivedNote(
        grn_number=grn.grn_number,
        po_id=grn.po_id,
        supplier_id=grn.supplier_id,
        warehouse_id=grn.warehouse_id,
        grn_date=grn.grn_date,
        supplier_invoice_number=grn.supplier_invoice_number,
        supplier_invoice_date=grn.supplier_invoice_date,
        vehicle_number=grn.vehicle_number,
        received_by=grn.received_by,
        notes=grn.notes,
        status="completed"
    )
    db.add(db_grn)
    db.flush()
    
    # Add line items and update inventory
    for item in grn.items:
        db_item = GRNItem(
            grn_id=db_grn.id,
            product_id=item.product_id,
            ordered_quantity=item.ordered_quantity,
            received_quantity=item.received_quantity,
            unit_price=item.unit_price,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
            notes=item.notes
        )
        db.add(db_item)
        
        # Update product stock
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock = Product.stock + item.received_quantity
            
            supplier = db.query(Supplier).filter(Supplier.id == grn.supplier_id).first()
            supplier_name = supplier.name if supplier else "Unknown Supplier"
            
            # Create inventory log
            log = InventoryLog(
                product_id=item.product_id,
                change=item.received_quantity,
                reason=f"GRN: {grn.grn_number}",
                performed_by=current_user.id,
                transaction_type="inward",
                invoice_number=grn.supplier_invoice_number,
                supplier_name=supplier_name,
                invoice_date=grn.grn_date,
                notes=f"Batch: {item.batch_number}"
            )
            db.add(log)
    
    # Update Purchase Order status — only mark RECEIVED when all items fully received
    if grn.po_id:
        po = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.items)).filter(PurchaseOrder.id == grn.po_id).first()
        if po:
            # Build a map of received quantities from this and previous GRNs
            from sqlalchemy import func
            received_map = {
                row.product_id: row.total_received
                for row in db.query(
                    GRNItem.product_id,
                    func.sum(GRNItem.received_quantity).label("total_received")
                ).join(GoodsReceivedNote, GRNItem.grn_id == GoodsReceivedNote.id)
                .filter(GoodsReceivedNote.po_id == grn.po_id)
                .group_by(GRNItem.product_id)
                .all()
            }
            fully_received = all(
                received_map.get(item.product_id, 0) >= item.quantity
                for item in po.items
            )
            po.status = PurchaseOrderStatus.RECEIVED if fully_received else PurchaseOrderStatus.PARTIALLY_RECEIVED
            
    db.commit()
    db.refresh(db_grn)
    
    # Load relationships
    db_grn = db.query(GoodsReceivedNote).options(
        joinedload(GoodsReceivedNote.supplier),
        joinedload(GoodsReceivedNote.items)
    ).filter(GoodsReceivedNote.id == db_grn.id).first()
    
    return db_grn


@router.get("/grn/export")
def export_grn(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grn:export"))
):
    """Export GRN to CSV"""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    grns = db.query(GoodsReceivedNote).options(joinedload(GoodsReceivedNote.supplier)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "GRN Number", "Date", "Supplier", "Invoice Number", 
        "Status", "Warehouse ID", "Created By"
    ])
    
    for grn in grns:
        writer.writerow([
            grn.grn_number,
            grn.received_date,
            grn.supplier.name if grn.supplier else "N/A",
            grn.supplier_invoice_number,
            grn.status,
            grn.warehouse_id,
            grn.created_by
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=grn_export.csv"}
    )


@router.get("/grn", response_model=List[GRNResponse])
def get_grns(
    skip: int = 0,
    limit: int = 100,
    supplier_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grn:view"))
):
    """Get all GRNs"""
    query = db.query(GoodsReceivedNote).options(
        joinedload(GoodsReceivedNote.supplier),
        joinedload(GoodsReceivedNote.items)
    )
    
    if supplier_id:
        query = query.filter(GoodsReceivedNote.supplier_id == supplier_id)
    
    query = query.order_by(GoodsReceivedNote.created_at.desc())
    grns = query.offset(skip).limit(limit).all()
    return grns


@router.get("/grn/{grn_id}", response_model=GRNResponse)
def get_grn(
    grn_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grn:view"))
):
    """Get a specific GRN"""
    grn = db.query(GoodsReceivedNote).options(
        joinedload(GoodsReceivedNote.supplier),
        joinedload(GoodsReceivedNote.items)
    ).filter(GoodsReceivedNote.id == grn_id).first()
    
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    return grn


# ═══════════════════════════════════════════════════════
# PURCHASE INVOICES
# ═══════════════════════════════════════════════════════

@router.post("/invoices", response_model=PurchaseInvoiceResponse)
def create_purchase_invoice(
    invoice: PurchaseInvoiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_invoices:manage"))
):
    """Create a new purchase invoice"""
    # Check if invoice number already exists
    existing = db.query(PurchaseInvoice).filter(PurchaseInvoice.invoice_number == invoice.invoice_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invoice number already exists")
    
    # Calculate totals
    subtotal = 0
    total_tax = 0
    
    for item in invoice.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount
        item_tax = taxable * (item.tax_percentage / 100)
        
        subtotal += item_subtotal
        total_tax += item_tax
    
    discount_amount = subtotal * (invoice.discount_percentage / 100)
    
    # Calculate GST based on type
    cgst_amount = 0
    sgst_amount = 0
    igst_amount = 0
    
    if invoice.gst_type == "cgst_sgst":
        cgst_amount = total_tax / 2
        sgst_amount = total_tax / 2
    else:
        igst_amount = total_tax
    
    total = subtotal - discount_amount + invoice.freight_charges + invoice.other_charges + total_tax
    balance_due = total
    
    # Calculate due date if not provided
    due_date = invoice.due_date
    if not due_date and invoice.payment_terms != "cash":
        from datetime import timedelta
        days_map = {
            "credit_15": 15,
            "credit_30": 30,
            "credit_60": 60,
            "credit_90": 90,
            # Also accept net_* variants sent by the frontend
            "net_15": 15,
            "net_30": 30,
            "net_60": 60,
            "net_90": 90
        }
        days = days_map.get(invoice.payment_terms, 0)
        due_date = invoice.invoice_date + timedelta(days=days)
    
    # Create invoice
    db_invoice = PurchaseInvoice(
        invoice_number=invoice.invoice_number,
        supplier_invoice_number=invoice.supplier_invoice_number,
        supplier_id=invoice.supplier_id,
        grn_id=invoice.grn_id,
        invoice_date=invoice.invoice_date,
        due_date=due_date,
        payment_terms=invoice.payment_terms,
        subtotal=subtotal,
        discount_percentage=invoice.discount_percentage,
        discount_amount=discount_amount,
        freight_charges=invoice.freight_charges,
        other_charges=invoice.other_charges,
        gst_type=invoice.gst_type,
        cgst_amount=cgst_amount,
        sgst_amount=sgst_amount,
        igst_amount=igst_amount,
        total_tax=total_tax,
        total=total,
        paid_amount=0,
        balance_due=balance_due,
        invoice_image_url=invoice.invoice_image_url,
        notes=invoice.notes,
        terms_conditions=invoice.terms_conditions,
        status="pending"
    )
    db.add(db_invoice)
    db.flush()
    
    # Add line items
    for item in invoice.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount_amount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount_amount
        item_tax = taxable * (item.tax_percentage / 100)
        line_total = taxable + item_tax
        
        db_item = PurchaseInvoiceItem(
            invoice_id=db_invoice.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percentage=item.discount_percentage,
            discount_amount=item_discount_amount,
            taxable_amount=taxable,
            tax_percentage=item.tax_percentage,
            tax_amount=item_tax,
            line_total=line_total
        )
        db.add(db_item)
    
    # Update supplier balance
    supplier = db.query(Supplier).filter(Supplier.id == invoice.supplier_id).first()
    if supplier:
        from decimal import Decimal as D
        supplier.current_balance += D(str(total))
    
    db.commit()
    db.refresh(db_invoice)
    
    # Load relationships
    db_invoice = db.query(PurchaseInvoice).options(
        joinedload(PurchaseInvoice.supplier),
        joinedload(PurchaseInvoice.items)
    ).filter(PurchaseInvoice.id == db_invoice.id).first()
    
    return db_invoice


@router.get("/invoices", response_model=List[PurchaseInvoiceResponse])
def get_purchase_invoices(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    supplier_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_invoices:view"))
):
    """Get all purchase invoices"""
    query = db.query(PurchaseInvoice).options(
        joinedload(PurchaseInvoice.supplier),
        joinedload(PurchaseInvoice.items)
    )
    
    if status:
        query = query.filter(PurchaseInvoice.status == status)
    if supplier_id:
        query = query.filter(PurchaseInvoice.supplier_id == supplier_id)
    
    query = query.order_by(PurchaseInvoice.created_at.desc())
    invoices = query.offset(skip).limit(limit).all()
    return invoices


@router.get("/invoices/{invoice_id}", response_model=PurchaseInvoiceResponse)
def get_purchase_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_invoices:view"))
):
    """Get a specific purchase invoice"""
    invoice = db.query(PurchaseInvoice).options(
        joinedload(PurchaseInvoice.supplier),
        joinedload(PurchaseInvoice.items)
    ).filter(PurchaseInvoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/invoices/{invoice_id}", response_model=PurchaseInvoiceResponse)
def update_purchase_invoice(
    invoice_id: str,
    invoice_update: PurchaseInvoiceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("purchase_invoices:manage"))
):
    """Update a purchase invoice (status, payment, notes)"""
    invoice = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = invoice_update.model_dump(exclude_unset=True)

    # Handle paid_amount specially — recalculate balance and auto-set status
    if "paid_amount" in update_data:
        from decimal import Decimal as D
        new_paid = D(str(update_data["paid_amount"]))
        prev_paid = D(str(invoice.paid_amount or 0))
        additional_payment = new_paid - prev_paid

        if additional_payment < 0:
            raise HTTPException(status_code=400, detail="Paid amount cannot be less than already paid amount")
        if new_paid > D(str(invoice.total)):
            raise HTTPException(status_code=400, detail="Paid amount cannot exceed invoice total")

        invoice.paid_amount = new_paid
        invoice.balance_due = D(str(invoice.total)) - new_paid

        # Auto-set status based on balance
        if invoice.balance_due <= 0:
            invoice.status = "paid"
        elif new_paid > 0:
            invoice.status = "partially_paid"
        else:
            invoice.status = "pending"

        # Reduce supplier outstanding balance by the additional payment made
        if additional_payment > 0:
            supplier = db.query(Supplier).filter(Supplier.id == invoice.supplier_id).first()
            if supplier:
                supplier.current_balance -= additional_payment

        # Remove paid_amount from update_data so we don't overwrite what we set
        del update_data["paid_amount"]

    # Apply remaining fields (status override, notes)
    for key, value in update_data.items():
        setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)

    # Load relationships for response
    invoice = db.query(PurchaseInvoice).options(
        joinedload(PurchaseInvoice.supplier),
        joinedload(PurchaseInvoice.items)
    ).filter(PurchaseInvoice.id == invoice_id).first()
    return invoice

