from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Query

from ...data import PRODUCTS
from ...services.db_service import db_service


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse date string in various formats."""
    if not date_str:
        return None
    
    # Try ISO format first
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        pass
    
    # Try common formats
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%d',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except:
            continue
    
    return None

router = APIRouter(prefix="/dashboard", tags=["admin-dashboard"])


@router.get("/analytics/orders")
async def get_orders_for_analytics(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
) -> List[Dict[str, Any]]:
    """Get all orders for analytics with optional year/month filtering."""
    if db_service.is_available():
        try:
            all_orders = db_service.admin_get_all("orders", order_by="created_at", desc=True)
            print(f"📊 Fetched {len(all_orders)} total orders from database")
            
            # Apply date filters with better date parsing
            if year is not None or month is not None:
                filtered_orders = []
                for order in all_orders:
                    created_at = order.get("created_at")
                    if not created_at:
                        continue
                    
                    # Handle both string and datetime objects
                    if isinstance(created_at, str):
                        order_date = parse_date(created_at)
                        if not order_date:
                            # Fallback to string matching if parsing fails
                            order_date_str = created_at
                            if year is not None and not order_date_str.startswith(str(year)):
                                continue
                            if month is not None and year is not None:
                                month_str = f"{year}-{month:02d}"
                                if not order_date_str.startswith(month_str):
                                    continue
                            filtered_orders.append(order)
                            continue
                    else:
                        # Assume it's already a datetime object
                        order_date = created_at
                    
                    # Apply year filter
                    if year is not None and order_date.year != year:
                        continue
                    
                    # Apply month filter
                    if month is not None and order_date.month != month:
                        continue
                    
                    filtered_orders.append(order)
                
                print(f"📊 Filtered to {len(filtered_orders)} orders (year={year}, month={month})")
                return filtered_orders
            
            print(f"📊 Returning all {len(all_orders)} orders (no filters)")
            return all_orders
        except Exception as e:
            print(f"❌ Error fetching orders for analytics: {e}")
            import traceback
            traceback.print_exc()
            return []
    print("⚠️ Database service not available")
    return []


@router.get("/customers")
async def get_customers() -> List[Dict[str, Any]]:
    """Get all customers."""
    if db_service.is_available():
        try:
            customers = db_service.admin_get_all("customers", order_by="created_at", desc=True)
            print(f"📊 Fetched {len(customers)} customers from database")
            return customers
        except Exception as e:
            print(f"❌ Error fetching customers: {e}")
            import traceback
            traceback.print_exc()
            return []
    print("⚠️ Database service not available")
    return []


@router.get("/inventory")
async def get_inventory() -> List[Dict[str, Any]]:
    """Get all inventory items."""
    if db_service.is_available():
        try:
            inventory = db_service.admin_get_all("inventory", order_by="created_at", desc=True)
            print(f"📊 Fetched {len(inventory)} inventory items from database")
            return inventory
        except Exception as e:
            print(f"❌ Error fetching inventory: {e}")
            import traceback
            traceback.print_exc()
            return []
    print("⚠️ Database service not available")
    return []


@router.get("/products")
async def get_products_for_admin() -> List[Dict[str, Any]]:
    """Get all products for admin (including inactive)."""
    if db_service.is_available():
        try:
            products = db_service.admin_get_all("products", order_by="created_at", desc=True)
            print(f"📊 Fetched {len(products)} products from database")
            return products
        except Exception as e:
            print(f"❌ Error fetching products: {e}")
            import traceback
            traceback.print_exc()
            return PRODUCTS
    print("⚠️ Database service not available, returning fixture products")
    return PRODUCTS


@router.get("/stats")
async def get_dashboard_stats(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
) -> Dict[str, Any]:
    """Get dashboard statistics."""
    orders = await get_orders_for_analytics(year=year, month=month)
    customers = await get_customers()
    inventory = await get_inventory()
    products = await get_products_for_admin()
    
    total_orders = len(orders)
    total_revenue = sum(float(o.get("amount", 0) or o.get("total", 0)) for o in orders)
    
    status_counts = {}
    for order in orders:
        status = order.get("status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "status_counts": status_counts,
        "customers_count": len(customers),
        "products_count": len(products),
        "inventory_count": len(inventory),
    }
