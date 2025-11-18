"""
Store Billing API for Physical Store Operations
Professional POS System with Advanced Features
Handles invoice generation, discounts, stock management, holds, refunds, and more
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime
from uuid import uuid4
import json

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel

from ..services.db_service import db_service
from ..services.email_service import email_service
from ..services.sms_service import sms_service
from ..services.invoice_pdf import invoice_pdf_service

router = APIRouter(prefix="/store/billing", tags=["store-billing"])


# Pydantic Models
class BillItemCreate(BaseModel):
    product_id: str
    product_name: str
    product_sku: Optional[str] = None
    quantity: int
    unit_price: float
    color: Optional[str] = None
    size: Optional[str] = None
    discount_amount: float = 0
    discount_percentage: float = 0


class StoreBillCreate(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    items: List[BillItemCreate]
    discount_code: Optional[str] = None
    discount_amount: float = 0
    discount_percentage: float = 0
    discount_type: Optional[str] = None
    tax_percentage: float = 0
    payment_method: str = "cash"
    notes: Optional[str] = None
    send_email: bool = False
    send_sms: bool = False
    customer_id: Optional[str] = None  # Link to existing customer


class HoldTransaction(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    items: List[BillItemCreate]
    notes: Optional[str] = None


class RefundRequest(BaseModel):
    bill_id: str
    items_to_refund: List[Dict[str, Any]]  # List of items with quantities to refund
    reason: Optional[str] = None
    refund_amount: Optional[float] = None  # Override calculated amount


@router.get("/products")
async def get_store_products(
    category_id: Optional[str] = Query(None, alias="categoryId"),
    search: Optional[str] = Query(None),
    include_stock: bool = Query(True),
    barcode: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get products for store billing with detailed stock information. Supports barcode search."""
    if not db_service.is_available():
        return []
    
    try:
        filters = {}
        if category_id:
            filters["category_id"] = category_id
        
        products = db_service.admin_get_all("products", order_by="name", desc=False, filters=filters)
        
        # Barcode search (by SKU)
        if barcode:
            products = [p for p in products if p.get("sku", "").upper() == barcode.upper()]
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            products = [
                p for p in products
                if search_lower in p.get("name", "").lower()
                or search_lower in (p.get("sku", "") or "").lower()
                or search_lower in (p.get("description", "") or "").lower()
            ]
        
        # Enrich with category info and stock details
        categories = db_service.admin_get_all("categories")
        category_map = {c.get("id"): c for c in categories}
        
        result = []
        for product in products:
            # Parse color_stock
            color_stock = product.get("color_stock", [])
            if isinstance(color_stock, str):
                try:
                    color_stock = json.loads(color_stock)
                except:
                    color_stock = []
            
            # Calculate stock value
            price = product.get("price", 0)
            total_stock = product.get("total_stock", 0)
            stock_value = price * total_stock
            
            # Get category name
            cat_id = product.get("category_id")
            category_name = category_map.get(cat_id, {}).get("name", "Uncategorized") if cat_id else "Uncategorized"
            
            # Parse color_images
            color_images = product.get("color_images", [])
            if isinstance(color_images, str):
                try:
                    color_images = json.loads(color_images)
                except:
                    color_images = []
            if not isinstance(color_images, list):
                color_images = []
            
            product_data = {
                "id": product.get("id"),
                "name": product.get("name"),
                "sku": product.get("sku"),
                "price": price,
                "original_price": product.get("original_price"),
                "images": product.get("images", []),
                "colors": product.get("colors", []),
                "color_images": color_images,  # Include color_images for display
                "sizes": product.get("sizes", []),
                "category_id": cat_id,
                "category_name": category_name,
                "total_stock": total_stock,
                "stock_status": product.get("stock_status", "in_stock"),
                "color_stock": color_stock,
                "stock_value": stock_value,
                "description": product.get("description"),
            }
            
            result.append(product_data)
        
        return result
    except Exception as e:
        print(f"Error fetching store products: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.get("/categories")
async def get_store_categories() -> List[Dict[str, Any]]:
    """Get all categories for store billing."""
    if not db_service.is_available():
        return []
    
    try:
        categories = db_service.admin_get_all("categories", order_by="name", desc=False)
        return [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "description": c.get("description"),
            }
            for c in categories
        ]
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return []


@router.get("/inventory-summary")
async def get_inventory_summary() -> Dict[str, Any]:
    """Get inventory summary with stock values and counts."""
    if not db_service.is_available():
        return {
            "total_products": 0,
            "total_stock": 0,
            "total_stock_value": 0,
            "low_stock_count": 0,
            "out_of_stock_count": 0,
            "category_breakdown": [],
        }
    
    try:
        products = db_service.admin_get_all("products")
        categories = db_service.admin_get_all("categories")
        category_map = {c.get("id"): c.get("name", "Uncategorized") for c in categories}
        
        total_products = len(products)
        total_stock = 0
        total_stock_value = 0
        low_stock_count = 0
        out_of_stock_count = 0
        category_breakdown = {}
        
        for product in products:
            stock = product.get("total_stock", 0)
            price = product.get("price", 0)
            stock_value = stock * price
            
            total_stock += stock
            total_stock_value += stock_value
            
            status = product.get("stock_status", "in_stock")
            if status == "low_stock":
                low_stock_count += 1
            elif status == "out_of_stock":
                out_of_stock_count += 1
            
            category_id = product.get("category_id")
            category_name = category_map.get(category_id, "Uncategorized") if category_id else "Uncategorized"
            
            if category_name not in category_breakdown:
                category_breakdown[category_name] = {
                    "category_name": category_name,
                    "product_count": 0,
                    "total_stock": 0,
                    "stock_value": 0,
                }
            
            category_breakdown[category_name]["product_count"] += 1
            category_breakdown[category_name]["total_stock"] += stock
            category_breakdown[category_name]["stock_value"] += stock_value
        
        return {
            "total_products": total_products,
            "total_stock": total_stock,
            "total_stock_value": total_stock_value,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "category_breakdown": list(category_breakdown.values()),
        }
    except Exception as e:
        print(f"Error fetching inventory summary: {e}")
        import traceback
        traceback.print_exc()
        return {
            "total_products": 0,
            "total_stock": 0,
            "total_stock_value": 0,
            "low_stock_count": 0,
            "out_of_stock_count": 0,
            "category_breakdown": [],
        }


@router.get("/orders-summary")
async def get_orders_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get summary of store and online orders."""
    if not db_service.is_available():
        return {
            "store_orders_count": 0,
            "store_revenue": 0,
            "online_orders_count": 0,
            "online_revenue": 0,
            "total_orders": 0,
            "total_revenue": 0,
        }
    
    try:
        # Get store bills
        store_bills = db_service.admin_get_all("store_bills", order_by="created_at", desc=True)
        
        # Apply date filters
        if start_date:
            store_bills = [b for b in store_bills if b.get("created_at", "") >= start_date]
        if end_date:
            store_bills = [b for b in store_bills if b.get("created_at", "") <= end_date]
        
        store_orders_count = len(store_bills)
        store_revenue = sum(float(b.get("final_amount", 0)) for b in store_bills)
        
        # Get online orders
        online_orders = db_service.admin_get_all("orders", order_by="created_at", desc=True)
        
        # Apply date filters
        if start_date:
            online_orders = [o for o in online_orders if o.get("created_at", "") >= start_date]
        if end_date:
            online_orders = [o for o in online_orders if o.get("created_at", "") <= end_date]
        
        # Filter paid orders only
        paid_orders = [o for o in online_orders if o.get("payment_status", "").lower() == "paid"]
        online_orders_count = len(paid_orders)
        online_revenue = sum(float(o.get("amount", 0)) for o in paid_orders)
        
        return {
            "store_orders_count": store_orders_count,
            "store_revenue": store_revenue,
            "online_orders_count": online_orders_count,
            "online_revenue": online_revenue,
            "total_orders": store_orders_count + online_orders_count,
            "total_revenue": store_revenue + online_revenue,
        }
    except Exception as e:
        print(f"Error fetching orders summary: {e}")
        import traceback
        traceback.print_exc()
        return {
            "store_orders_count": 0,
            "store_revenue": 0,
            "online_orders_count": 0,
            "online_revenue": 0,
            "total_orders": 0,
            "total_revenue": 0,
        }


@router.get("/customers/search")
async def search_customers(
    query: str = Query(..., min_length=1),
) -> List[Dict[str, Any]]:
    """Search customers by name, phone, or email."""
    if not db_service.is_available():
        return []
    
    try:
        all_customers = db_service.admin_get_all("customers")
        query_lower = query.lower()
        
        results = [
            c for c in all_customers
            if query_lower in (c.get("name", "") or "").lower()
            or query_lower in (c.get("phone", "") or "").lower()
            or query_lower in (c.get("email", "") or "").lower()
        ]
        
        # Also search in store bills for customers
        store_bills = db_service.admin_get_all("store_bills")
        bill_customers = {}
        for bill in store_bills:
            phone = bill.get("customer_phone")
            name = bill.get("customer_name")
            if phone and query_lower in (phone or "").lower():
                if phone not in bill_customers:
                    bill_customers[phone] = {
                        "id": f"bill_customer_{phone}",
                        "name": name,
                        "phone": phone,
                        "email": bill.get("customer_email"),
                        "total_spent": 0,
                        "order_count": 0,
                    }
                bill_customers[phone]["total_spent"] += float(bill.get("final_amount", 0))
                bill_customers[phone]["order_count"] += 1
        
        # Merge results
        existing_phones = {c.get("phone") for c in results if c.get("phone")}
        for phone, customer in bill_customers.items():
            if phone not in existing_phones:
                results.append(customer)
        
        return results[:20]  # Limit to 20 results
    except Exception as e:
        print(f"Error searching customers: {e}")
        return []


@router.get("/customers/{customer_id}/history")
async def get_customer_history(customer_id: str) -> Dict[str, Any]:
    """Get customer purchase history (store bills + online orders)."""
    if not db_service.is_available():
        return {"store_bills": [], "online_orders": [], "total_spent": 0, "total_orders": 0}
    
    try:
        # Get customer info
        customer = db_service.admin_get_by_id("customers", customer_id)
        customer_phone = customer.get("phone") if customer else None
        
        # Get store bills
        store_bills = db_service.admin_get_all("store_bills")
        if customer_phone:
            store_bills = [b for b in store_bills if b.get("customer_phone") == customer_phone]
        
        # Get online orders
        online_orders = db_service.admin_get_all("orders")
        if customer_phone:
            online_orders = [o for o in online_orders if o.get("customer_phone") == customer_phone]
        
        total_spent = (
            sum(float(b.get("final_amount", 0)) for b in store_bills) +
            sum(float(o.get("amount", 0)) for o in online_orders if o.get("payment_status", "").lower() == "paid")
        )
        
        return {
            "customer": customer,
            "store_bills": store_bills,
            "online_orders": online_orders,
            "total_spent": total_spent,
            "total_orders": len(store_bills) + len(online_orders),
        }
    except Exception as e:
        print(f"Error fetching customer history: {e}")
        return {"store_bills": [], "online_orders": [], "total_spent": 0, "total_orders": 0}


@router.post("/hold")
async def hold_transaction(hold_data: HoldTransaction) -> Dict[str, Any]:
    """Hold a transaction for later completion."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Create a hold record (using store_bills table with status='held')
        hold_id = str(uuid4())
        hold_record = {
            "id": hold_id,
            "bill_number": f"HOLD-{datetime.now().strftime('%Y%m%d')}-{hold_id[:8]}",
            "customer_name": hold_data.customer_name,
            "customer_phone": hold_data.customer_phone,
            "status": "held",
            "payment_status": "pending",
            "items": json.dumps([item.dict() for item in hold_data.items]),
            "notes": hold_data.notes,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        # Store in a holds table or use store_bills with status='held'
        # For now, we'll use a simple approach - store in store_bills with special status
        created = db_service.admin_create("store_bills", hold_record)
        
        return {
            "status": "success",
            "hold_id": hold_id,
            "hold_number": hold_record["bill_number"],
            "message": "Transaction held successfully"
        }
    except Exception as e:
        print(f"Error holding transaction: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to hold transaction: {str(e)}")


@router.get("/holds")
async def get_held_transactions() -> List[Dict[str, Any]]:
    """Get all held transactions."""
    if not db_service.is_available():
        return []
    
    try:
        holds = db_service.admin_get_all("store_bills", filters={"status": "held"})
        return holds
    except Exception as e:
        print(f"Error fetching holds: {e}")
        return []


@router.post("/refund")
async def process_refund(refund_data: RefundRequest) -> Dict[str, Any]:
    """Process a refund for a store bill."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Get original bill
        bill = db_service.admin_get_by_id("store_bills", refund_data.bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Calculate refund amount
        refund_amount = refund_data.refund_amount
        if refund_amount is None:
            # Calculate from items
            bill_items = db_service.admin_get_all("store_bill_items", filters={"bill_id": refund_data.bill_id})
            refund_amount = sum(float(item.get("line_total", 0)) for item in bill_items)
        
        # Create refund record
        refund_record = {
            "bill_id": refund_data.bill_id,
            "refund_amount": refund_amount,
            "reason": refund_data.reason,
            "status": "processed",
            "created_at": datetime.utcnow().isoformat(),
        }
        
        # Update bill status
        db_service.admin_update("store_bills", refund_data.bill_id, {
            "status": "refunded",
            "updated_at": datetime.utcnow().isoformat()
        })
        
        # Restore inventory for refunded items
        for item_data in refund_data.items_to_refund:
            product_id = item_data.get("product_id")
            quantity = item_data.get("quantity", 0)
            color = item_data.get("color")
            
            if product_id:
                product = db_service.admin_get_by_id("products", product_id)
                if product:
                    if color:
                        # Restore color stock
                        color_stock = product.get("color_stock", [])
                        if isinstance(color_stock, str):
                            try:
                                color_stock = json.loads(color_stock)
                            except:
                                color_stock = []
                        
                        for color_entry in color_stock:
                            if color_entry.get("color", "").lower() == color.lower():
                                color_entry["stock"] = color_entry.get("stock", 0) + quantity
                                break
                        
                        new_total = sum(c.get("stock", 0) for c in color_stock)
                        db_service.admin_update("products", product_id, {
                            "total_stock": new_total,
                            "color_stock": color_stock,
                            "stock_status": "out_of_stock" if new_total == 0 else ("low_stock" if new_total <= 5 else "in_stock"),
                            "updated_at": datetime.utcnow().isoformat()
                        })
                    else:
                        # Restore total stock
                        current_stock = product.get("total_stock", 0)
                        new_stock = current_stock + quantity
                        db_service.admin_update("products", product_id, {
                            "total_stock": new_stock,
                            "stock_status": "out_of_stock" if new_stock == 0 else ("low_stock" if new_stock <= 5 else "in_stock"),
                            "updated_at": datetime.utcnow().isoformat()
                        })
        
        return {
            "status": "success",
            "refund_amount": refund_amount,
            "message": "Refund processed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing refund: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process refund: {str(e)}")


@router.post("/create")
async def create_store_bill(bill_data: StoreBillCreate) -> Dict[str, Any]:
    """Create a new store bill/invoice."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Calculate totals - ensure discount_amount is not None
        subtotal = sum(
            (item.unit_price * item.quantity) - (item.discount_amount or 0)
            for item in bill_data.items
        )
        
        # Apply discount if provided
        discount_amount = bill_data.discount_amount or 0
        if bill_data.discount_code:
            # Validate and get discount
            discounts = db_service.admin_get_all(
                "store_discounts",
                filters={"discount_code": bill_data.discount_code, "is_active": True}
            )
            if discounts:
                discount = discounts[0]
                # Check if discount is valid
                now = datetime.utcnow().isoformat()
                if discount.get("start_date") and discount.get("start_date") > now:
                    raise HTTPException(status_code=400, detail="Discount not yet active")
                if discount.get("end_date") and discount.get("end_date") < now:
                    raise HTTPException(status_code=400, detail="Discount has expired")
                if discount.get("max_uses") and discount.get("current_uses", 0) >= discount.get("max_uses", 0):
                    raise HTTPException(status_code=400, detail="Discount usage limit reached")
                
                # Calculate discount
                if discount.get("discount_type") == "percentage":
                    discount_amount = subtotal * (discount.get("discount_value", 0) / 100)
                    if discount.get("maximum_discount_amount"):
                        discount_amount = min(discount_amount, discount.get("maximum_discount_amount"))
                    bill_data.discount_percentage = discount.get("discount_value", 0)
                else:
                    discount_amount = discount.get("discount_value", 0)
                    bill_data.discount_amount = discount_amount
                
                bill_data.discount_type = "store_special"
        
        # Calculate tax - ensure tax_percentage is not None
        tax_percentage = bill_data.tax_percentage or 0
        tax_amount = subtotal * (tax_percentage / 100)
        
        # Calculate total
        total_amount = subtotal - discount_amount + tax_amount
        final_amount = total_amount
        
        # Generate bill number with date and sequential number
        today = datetime.now().strftime('%Y%m%d')
        try:
            today_bills = db_service.admin_get_all("store_bills")
            today_bills = [b for b in today_bills if b.get("created_at", "").startswith(today[:10])]
            bill_seq = len(today_bills) + 1
        except:
            bill_seq = 1
        
        bill_number = f"BILL-{today}-{str(bill_seq).zfill(4)}"
        
        # Create or update customer
        customer_id = bill_data.customer_id
        if bill_data.customer_phone and not customer_id:
            # Try to find existing customer
            customers = db_service.admin_get_all("customers", filters={"phone": bill_data.customer_phone})
            if customers:
                customer_id = customers[0].get("id")
            else:
                # Create new customer
                new_customer = {
                    "name": bill_data.customer_name,
                    "email": bill_data.customer_email,
                    "phone": bill_data.customer_phone,
                    "address": bill_data.customer_address,
                    "created_at": datetime.utcnow().isoformat(),
                }
                created_customer = db_service.admin_create("customers", new_customer)
                if created_customer:
                    customer_id = created_customer.get("id")
        
        # Create bill - match exact schema from Supabase
        # Payment method must be one of: cash, card, upi, other
        payment_method = (bill_data.payment_method or "cash").lower()
        if payment_method not in ["cash", "card", "upi", "other"]:
            payment_method = "cash"  # Default to cash if invalid
        
        # Discount type must be one of: percentage, fixed, store_special
        discount_type_value = None
        if bill_data.discount_type:
            discount_type_lower = bill_data.discount_type.lower()
            if discount_type_lower in ["percentage", "fixed", "store_special"]:
                discount_type_value = discount_type_lower
            elif discount_type_lower == "percent":
                discount_type_value = "percentage"
            elif discount_type_lower == "amount":
                discount_type_value = "fixed"
        
        bill_data_dict = {
            "bill_number": bill_number,
            "customer_name": bill_data.customer_name,
            "subtotal": float(subtotal),
            "discount_amount": float(discount_amount),
            "discount_percentage": float(bill_data.discount_percentage or 0),
            "tax_amount": float(tax_amount),
            "tax_percentage": float(tax_percentage),
            "total_amount": float(total_amount),
            "final_amount": float(final_amount),
            "payment_method": payment_method,  # Must be: cash, card, upi, other
            "payment_status": "paid",  # Must be: paid, pending, refunded
            "status": "completed",  # Must be: completed, cancelled, refunded
        }
        
        # Add optional fields only if they have values (to avoid None issues)
        if bill_data.customer_email:
            bill_data_dict["customer_email"] = bill_data.customer_email
        if bill_data.customer_phone:
            bill_data_dict["customer_phone"] = bill_data.customer_phone
        if bill_data.customer_address:
            bill_data_dict["customer_address"] = bill_data.customer_address
        if customer_id:
            bill_data_dict["customer_id"] = customer_id
        if discount_type_value:
            bill_data_dict["discount_type"] = discount_type_value
        if bill_data.discount_code:
            bill_data_dict["discount_code"] = bill_data.discount_code
        if bill_data.notes:
            bill_data_dict["notes"] = bill_data.notes
        
        # Note: created_at and updated_at are handled by database defaults
        
        print(f"[Store Billing] Creating bill with data: {bill_data_dict}")
        print(f"[Store Billing] Database service: {db_service.get_service_name()}")
        print(f"[Store Billing] Database available: {db_service.is_available()}")
        
        try:
            bill = db_service.admin_create("store_bills", bill_data_dict)
            if not bill:
                error_detail = (
                    "Failed to create bill - database returned None. "
                    "This usually means the 'store_bills' table doesn't exist. "
                    "Please run: python backend/scripts/create_store_billing_tables.py "
                    "or execute the SQL script: backend/db/create_store_billing_tables.sql"
                )
                print(f"[Store Billing] {error_detail}")
                raise HTTPException(status_code=500, detail=error_detail)
            print(f"[Store Billing] Bill created successfully: {bill.get('id')}")
        except HTTPException:
            raise
        except Exception as create_error:
            error_msg = f"Failed to create bill: {str(create_error)}"
            print(f"[Store Billing] Error in admin_create: {create_error}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Create bill items and update stock
        for item in bill_data.items:
            item_discount = item.discount_amount or 0
            item_data = {
                "bill_id": bill["id"],
                "product_id": item.product_id,
                "product_name": item.product_name,
                "product_sku": item.product_sku or None,
                "quantity": int(item.quantity),
                "unit_price": float(item.unit_price),
                "discount_amount": float(item_discount),
                "discount_percentage": float(item.discount_percentage or 0),
                "line_total": float((item.unit_price * item.quantity) - item_discount),
                "color": item.color or None,
                "size": item.size or None,
                "created_at": datetime.utcnow().isoformat(),
            }
            print(f"[Store Billing] Creating bill item: {item_data}")
            try:
                created_item = db_service.admin_create("store_bill_items", item_data)
                if not created_item:
                    print(f"[Store Billing] Warning: Failed to create bill item for product {item.product_id}")
            except Exception as item_error:
                print(f"[Store Billing] Error creating bill item: {item_error}")
                import traceback
                traceback.print_exc()
                # Continue with other items even if one fails
            
            # Update inventory - decrement store stock (color-wise if color specified)
            if item.product_id:
                product = db_service.admin_get_by_id("products", item.product_id)
                if product:
                    # Handle color-wise stock decrement
                    if item.color:
                        color_stock = product.get("color_stock", [])
                        if isinstance(color_stock, str):
                            try:
                                color_stock = json.loads(color_stock)
                            except:
                                color_stock = []
                        
                        # Find and decrement the specific color
                        color_found = False
                        for color_entry in color_stock:
                            if color_entry.get("color", "").lower() == item.color.lower():
                                current_color_stock = color_entry.get("stock", 0)
                                color_entry["stock"] = max(0, current_color_stock - item.quantity)
                                color_found = True
                                break
                        
                        # If color not found, try to decrement from any available color
                        if not color_found and color_stock:
                            remaining = item.quantity
                            for color_entry in color_stock:
                                if remaining <= 0:
                                    break
                                available = color_entry.get("stock", 0)
                                if available > 0:
                                    decrement = min(remaining, available)
                                    color_entry["stock"] = max(0, available - decrement)
                                    remaining -= decrement
                        
                        # Recalculate total stock from color_stock
                        new_total_stock = sum(c.get("stock", 0) for c in color_stock) if color_stock else 0
                        if not color_stock:
                            # Fallback to total_stock decrement
                            current_stock = product.get("total_stock", 0)
                            new_total_stock = max(0, current_stock - item.quantity)
                        
                        # Update product with color_stock
                        update_data = {
                            "total_stock": new_total_stock,
                            "stock_status": "out_of_stock" if new_total_stock == 0 else ("low_stock" if new_total_stock <= 5 else "in_stock"),
                            "updated_at": datetime.utcnow().isoformat()
                        }
                        if color_stock:
                            update_data["color_stock"] = color_stock
                        
                        db_service.admin_update("products", item.product_id, update_data)
                    else:
                        # No color specified, decrement total stock
                        current_stock = product.get("total_stock", 0)
                        new_stock = max(0, current_stock - item.quantity)
                        db_service.admin_update("products", item.product_id, {
                            "total_stock": new_stock,
                            "stock_status": "out_of_stock" if new_stock == 0 else ("low_stock" if new_stock <= 5 else "in_stock"),
                            "updated_at": datetime.utcnow().isoformat()
                        })
        
        # Update discount usage if applied
        if bill_data.discount_code and discounts:
            discount = discounts[0]
            current_uses = discount.get("current_uses", 0)
            db_service.admin_update("store_discounts", discount["id"], {
                "current_uses": current_uses + 1,
                "updated_at": datetime.utcnow().isoformat()
            })
        
        # Generate PDF invoice
        invoice_pdf_path = None
        if invoice_pdf_service.is_available():
            items_data = [
                {
                    "product_name": item.product_name,
                    "product_sku": item.product_sku,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "color": item.color,
                    "size": item.size,
                    "discount_amount": item.discount_amount,
                    "line_total": (item.unit_price * item.quantity) - item.discount_amount
                }
                for item in bill_data.items
            ]
            invoice_pdf_path = invoice_pdf_service.generate_invoice_pdf(bill, items_data)
            if invoice_pdf_path:
                db_service.admin_update("store_bills", bill["id"], {
                    "invoice_pdf_url": invoice_pdf_path,
                    "updated_at": datetime.utcnow().isoformat()
                })
        
        # Send email if requested
        if bill_data.send_email and bill_data.customer_email:
            email_sent = email_service.send_invoice_email(
                to_email=bill_data.customer_email,
                customer_name=bill_data.customer_name,
                bill_number=bill_number,
                total_amount=total_amount,
                invoice_pdf_path=invoice_pdf_path
            )
            if email_sent:
                db_service.admin_update("store_bills", bill["id"], {
                    "invoice_sent_email": True,
                    "updated_at": datetime.utcnow().isoformat()
                })
        
        # Send SMS if requested
        if bill_data.send_sms and bill_data.customer_phone:
            invoice_url = f"https://store.omaguva.com/invoice/{bill['id']}" if invoice_pdf_path else None
            sms_sent = sms_service.send_invoice_sms(
                to_phone=bill_data.customer_phone,
                customer_name=bill_data.customer_name,
                bill_number=bill_number,
                total_amount=total_amount,
                invoice_url=invoice_url
            )
            if sms_sent:
                db_service.admin_update("store_bills", bill["id"], {
                    "invoice_sent_sms": True,
                    "updated_at": datetime.utcnow().isoformat()
                })
        
        return {
            "status": "success",
            "bill": bill,
            "invoice_pdf": invoice_pdf_path,
            "message": "Store bill created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating store bill: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create bill: {str(e)}")


@router.get("")
async def get_store_bills(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    search: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get all store bills with pagination and filters."""
    if not db_service.is_available():
        return {"bills": [], "total": 0, "page": page, "size": size, "pages": 0}
    
    try:
        bills = db_service.admin_get_all("store_bills", order_by="created_at", desc=True)
        
        # Apply filters
        if search:
            search_lower = search.lower()
            bills = [
                b for b in bills
                if search_lower in (b.get("bill_number", "") or "").lower()
                or search_lower in (b.get("customer_name", "") or "").lower()
                or search_lower in (b.get("customer_phone", "") or "").lower()
            ]
        
        if startDate:
            bills = [b for b in bills if b.get("created_at", "") >= startDate]
        if endDate:
            bills = [b for b in bills if b.get("created_at", "") <= endDate]
        
        total = len(bills)
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_bills = bills[start_idx:end_idx]
        
        # Get bill items for each bill
        for bill in paginated_bills:
            items = db_service.admin_get_all("store_bill_items", filters={"bill_id": bill["id"]})
            bill["items"] = items
        
        return {
            "bills": paginated_bills,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size,
        }
    except Exception as e:
        print(f"Error fetching store bills: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch bills: {str(e)}")


@router.get("/{bill_id}")
async def get_store_bill(bill_id: str) -> Dict[str, Any]:
    """Get a specific store bill by ID."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        bill = db_service.admin_get_by_id("store_bills", bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Get bill items
        items = db_service.admin_get_all(
            "store_bill_items",
            filters={"bill_id": bill_id}
        )
        bill["items"] = items
        
        return bill
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching store bill: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch bill: {str(e)}")


@router.get("/{bill_id}/invoice/download")
async def download_invoice_pdf(bill_id: str):
    """Download invoice PDF for a store bill. Generates PDF if not exists."""
    from fastapi.responses import FileResponse
    from fastapi.responses import StreamingResponse
    import os
    import io
    
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        bill = db_service.admin_get_by_id("store_bills", bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        invoice_pdf_path = bill.get("invoice_pdf_url")
        
        # If PDF doesn't exist, generate it
        if not invoice_pdf_path or not os.path.exists(invoice_pdf_path):
            # Get bill items
            bill_items = db_service.admin_get_all("store_bill_items", filters={"bill_id": bill_id})
            
            # Prepare items data for PDF
            items_data = []
            for item in bill_items:
                items_data.append({
                    "product_name": item.get("product_name", ""),
                    "product_sku": item.get("product_sku"),
                    "quantity": item.get("quantity", 0),
                    "unit_price": item.get("unit_price", 0),
                    "color": item.get("color"),
                    "size": item.get("size"),
                    "discount_amount": item.get("discount_amount", 0),
                    "line_total": item.get("line_total", 0)
                })
            
            # Generate PDF
            if invoice_pdf_service.is_available():
                invoice_pdf_path = invoice_pdf_service.generate_invoice_pdf(bill, items_data)
                if invoice_pdf_path:
                    # Update bill with PDF path
                    db_service.admin_update("store_bills", bill_id, {
                        "invoice_pdf_url": invoice_pdf_path,
                        "updated_at": datetime.utcnow().isoformat()
                    })
        
        # Check if file exists
        if invoice_pdf_path and os.path.exists(invoice_pdf_path):
            return FileResponse(
                invoice_pdf_path,
                media_type="application/pdf",
                filename=f"Invoice_{bill.get('bill_number', bill_id)}.pdf"
            )
        else:
            raise HTTPException(status_code=404, detail="Invoice PDF could not be generated")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading invoice: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to download invoice: {str(e)}")


@router.get("/test-connection")
async def test_store_billing_connection() -> Dict[str, Any]:
    """Test connection to store_bills table."""
    if not db_service.is_available():
        return {"status": "error", "message": "Database not available"}
    
    try:
        # Try to query the table
        bills = db_service.admin_get_all("store_bills")
        return {
            "status": "success",
            "message": "Connection successful",
            "table_exists": True,
            "sample_count": len(bills),
            "database_service": db_service.get_service_name()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "table_exists": False,
            "database_service": db_service.get_service_name()
        }

@router.get("/discounts/validate")
async def validate_discount_code(
    code: str = Query(...),
    amount: float = Query(0, ge=0)
) -> Dict[str, Any]:
    """Validate a store discount code."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        discounts = db_service.admin_get_all(
            "store_discounts",
            filters={"discount_code": code, "is_active": True}
        )
        
        if not discounts:
            return {"valid": False, "message": "Invalid discount code"}
        
        discount = discounts[0]
        now = datetime.utcnow().isoformat()
        
        if discount.get("start_date") and discount.get("start_date") > now:
            return {"valid": False, "message": "Discount not yet active"}
        if discount.get("end_date") and discount.get("end_date") < now:
            return {"valid": False, "message": "Discount has expired"}
        if discount.get("max_uses") and discount.get("current_uses", 0) >= discount.get("max_uses", 0):
            return {"valid": False, "message": "Discount usage limit reached"}
        if discount.get("minimum_amount") and amount < discount.get("minimum_amount", 0):
            return {"valid": False, "message": f"Minimum purchase amount of ₹{discount.get('minimum_amount')} required"}
        
        # Calculate discount amount
        if discount.get("discount_type") == "percentage":
            discount_amount = amount * (discount.get("discount_value", 0) / 100)
            if discount.get("maximum_discount_amount"):
                discount_amount = min(discount_amount, discount.get("maximum_discount_amount"))
        else:
            discount_amount = discount.get("discount_value", 0)
        
        return {
            "valid": True,
            "discount": discount,
            "discount_amount": discount_amount,
            "message": "Discount applied successfully"
        }
    except Exception as e:
        print(f"Error validating discount: {e}")
        return {"valid": False, "message": "Error validating discount code"}
