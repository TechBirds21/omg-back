from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from .storefront import _orders
from ..data import SETTINGS
from ..services.db_service import db_service
from ..models.responses import sanitize_orders, sanitize_order

router = APIRouter(prefix="/customer", tags=["customer"])


@router.get("/orders/by-email")
async def get_orders_by_email(email: str = Query(...)) -> List[Dict[str, Any]]:
    """Get orders by customer email - uses database if available."""
    if db_service.is_available():
        orders = db_service.get_orders_by_email(email)
        return sanitize_orders(orders)
    
    # Fallback to in-memory
    filtered = [
        o for o in _orders
        if o.get("customer_email", "").lower() == email.lower()
    ]
    return sanitize_orders(filtered)


@router.get("/orders/by-customer")
async def get_orders_by_customer_details(
    email: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get orders by customer email and/or phone - uses database if available."""
    if db_service.is_available():
        orders = db_service.get_orders_by_customer(email=email, phone=phone)
        return sanitize_orders(orders)
    
    # Fallback to in-memory
    filtered = _orders.copy()
    
    if email:
        filtered = [
            o for o in filtered
            if o.get("customer_email", "").lower() == email.lower()
        ]
    
    if phone:
        filtered = [
            o for o in filtered
            if o.get("customer_phone", "").replace(" ", "").replace("-", "") == phone.replace(" ", "").replace("-", "")
        ]
    
    return sanitize_orders(filtered)


@router.get("/orders/{order_id}")
async def get_order_by_id(order_id: str) -> Dict[str, Any]:
    """Get a specific order by order_id - uses database if available."""
    if db_service.is_available():
        order = db_service.get_order_by_order_id(order_id)
        if order:
            return sanitize_order(order)
    
    # Fallback to in-memory
    order = next((o for o in _orders if o.get("order_id") == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return sanitize_order(order)


@router.post("/contact")
async def submit_contact_form(submission: Dict[str, Any]) -> Dict[str, Any]:
    """Submit a contact form - saves to database if available."""
    from datetime import datetime
    
    submission_data = {
        "name": submission.get("name") or submission.get("fullName", ""),
        "email": submission.get("email", ""),
        "phone": submission.get("phone"),
        "subject": submission.get("subject", ""),
        "message": submission.get("message", ""),
        "status": "new",
        "created_at": datetime.utcnow().isoformat(),
    }
    
    # Save to database if available
    if db_service.is_available():
        created = db_service.create_contact_submission(submission_data)
        if created:
            return {"status": "success", "message": "Contact form submitted successfully", "id": created.get("id")}
    
    # Fallback to in-memory storage
    from ..api.admin.contact_submissions import _contact_submissions
    from uuid import uuid4
    
    submission_id = str(uuid4())
    new_submission = {
        "id": submission_id,
        **submission_data,
    }
    _contact_submissions.append(new_submission)
    return {"status": "success", "message": "Contact form submitted successfully", "id": submission_id}


@router.get("/settings")
async def get_customer_settings() -> Dict[str, Any]:
    """Get customer-facing settings - uses database if available."""
    if db_service.is_available():
        db_settings = db_service.get_settings()
        if db_settings:
            return db_settings
    return SETTINGS


@router.get("/orders/by-order-id/{order_id}")
async def get_order_by_order_id(order_id: str) -> Dict[str, Any]:
    """Get order by order_id (merchant order ID) - uses database if available."""
    if db_service.is_available():
        order = db_service.get_order_by_order_id(order_id)
        if order:
            return order
    
    # Fallback to in-memory
    order = next((o for o in _orders if o.get("order_id") == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/orders/{order_id}/payment-status")
async def update_order_payment_status(
    order_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Update order payment status - updates database if available."""
    # TODO: Implement database update for payment status
    # For now, update in-memory
    order = next((o for o in _orders if o.get("order_id") == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order["payment_status"] = payload.get("payment_status", order.get("payment_status"))
    order["transaction_id"] = payload.get("transaction_id", order.get("transaction_id"))
    order["payment_gateway_response"] = payload.get("payment_gateway_response", order.get("payment_gateway_response"))
    
    from datetime import datetime
    order["updated_at"] = datetime.utcnow().isoformat()
    
    return order


@router.get("/orders/{order_id}/invoice")
async def get_invoice_data(order_id: str) -> Dict[str, Any]:
    """Get invoice data for an order - uses database if available."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Invoice service unavailable")
    
    order_data = db_service.get_complete_order_for_invoice(order_id)
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Build invoice items
    items = []
    
    # Try to get items from applied_offer (consolidated items from checkout)
    try:
        applied_offer = order_data.get("applied_offer")
        if applied_offer:
            if isinstance(applied_offer, str):
                import json
                applied_offer = json.loads(applied_offer)
            
            if isinstance(applied_offer, dict) and isinstance(applied_offer.get("items"), list):
                for it in applied_offer["items"]:
                    items.append({
                        "name": it.get("name", ""),
                        "quantity": int(it.get("quantity", 1)),
                        "price": float(it.get("price", 0)),
                        "total": float(it.get("price", 0)) * int(it.get("quantity", 1)),
                        "image": it.get("image"),
                        "colors": [it.get("color")] if it.get("color") else (it.get("colors") or []),
                        "sizes": [it.get("size")] if it.get("size") else (it.get("sizes") or []),
                        "sareeId": it.get("sareeId")
                    })
    except Exception as e:
        print(f"Error parsing applied_offer: {e}")
    
    # If no consolidated items, build from single product
    if not items:
        product = order_data.get("product") or {}
        selected_image = None
        
        # Try to get color-specific image
        product_colors = order_data.get("product_colors") or []
        if product_colors and isinstance(product.get("colors"), list) and isinstance(product.get("color_images"), list):
            color_index = None
            for i, c in enumerate(product["colors"]):
                if str(c).lower() == str(product_colors[0]).lower():
                    color_index = i
                    break
            if color_index is not None and color_index < len(product.get("color_images", [])):
                color_images = product["color_images"][color_index]
                if isinstance(color_images, list) and len(color_images) > 0:
                    selected_image = color_images[0]
        
        # Fallback to cover image
        if not selected_image and isinstance(product.get("images"), list):
            cover_index = product.get("cover_image_index", 0)
            if cover_index < len(product["images"]):
                selected_image = product["images"][cover_index]
        
        quantity = int(order_data.get("quantity", 1))
        amount = float(order_data.get("amount", 0))
        price_per_item = amount / quantity if quantity > 0 else amount
        
        items.append({
            "name": order_data.get("product_name", "Product"),
            "quantity": quantity,
            "price": price_per_item,
            "total": amount,
            "image": selected_image,
            "colors": product_colors or product.get("colors") or [],
            "sizes": order_data.get("product_sizes") or [],
            "sareeId": order_data.get("saree_id") or product.get("saree_id")
        })
    
    # If still no items, create basic item
    if not items:
        quantity = max(1, int(order_data.get("quantity", 1)))
        amount = float(order_data.get("amount", 0))
        price_per_item = amount / quantity
        
        items.append({
            "name": order_data.get("product_name", f"Order {order_id}"),
            "quantity": quantity,
            "price": price_per_item,
            "total": amount,
            "colors": order_data.get("product_colors") or [],
            "sizes": order_data.get("product_sizes") or [],
            "sareeId": order_data.get("saree_id")
        })
    
    # Calculate subtotal and total
    subtotal = sum(float(item.get("total", item.get("price", 0) * item.get("quantity", 1))) for item in items)
    total = subtotal
    
    # Build invoice data
    invoice_data = {
        "orderId": order_data.get("order_id", order_id),
        "customerName": order_data.get("customer_name", ""),
        "customerEmail": order_data.get("customer_email", ""),
        "customerPhone": order_data.get("customer_phone", ""),
        "shippingAddress": order_data.get("shipping_address", "Address on file"),
        "items": items,
        "subtotal": subtotal,
        "total": total,
        "paymentMethod": order_data.get("payment_method", "Online Payment"),
        "paymentStatus": order_data.get("payment_status"),
        "transactionId": order_data.get("transaction_id"),
        "orderDate": order_data.get("created_at", ""),
        "paymentGatewayResponse": order_data.get("payment_gateway_response"),
        "productImages": (order_data.get("product") or {}).get("images") or [],
        "coverImageIndex": (order_data.get("product") or {}).get("cover_image_index", 0)
    }
    
    return invoice_data

