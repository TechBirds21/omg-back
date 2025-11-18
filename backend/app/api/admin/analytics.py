from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query

from ...services.db_service import db_service

router = APIRouter(prefix="/analytics", tags=["admin-analytics"])


@router.get("/accounts-stats")
async def get_accounts_stats() -> Dict[str, Any]:
    """Get all-time account statistics."""
    if not db_service.is_available():
        return {
            "totalSareesSold": 0,
            "totalConfirmedOrders": 0,
            "totalConfirmedValue": 0,
            "totalOrders": 0,
            "totalProducts": 0,
            "averageOrderValue": 0
        }
    
    try:
        # Get all orders
        all_orders = db_service.admin_get_all("orders")
        total_orders = len(all_orders)
        
        # Confirmed orders for revenue
        confirmed_orders = [
            o for o in all_orders
            if o.get("payment_status", "").lower() == "paid"
        ]
        
        # Active orders for saree count
        active_orders = [
            o for o in all_orders
            if o.get("status", "").lower() not in ["cancelled", "failed"]
            and o.get("payment_status", "").lower() not in ["pending", "failed"]
        ]
        
        # Total products count
        all_products = db_service.admin_get_all("products")
        total_products = len(all_products)
        
        # Calculate stats
        total_confirmed_value = sum(float(o.get("total", 0) or o.get("amount", 0)) for o in confirmed_orders)
        
        total_sarees = 0
        for order in active_orders:
            try:
                if order.get("items") and isinstance(order["items"], list):
                    for item in order["items"]:
                        total_sarees += int(item.get("quantity") or 1)
                elif order.get("applied_offer"):
                    import json
                    parsed = json.loads(order["applied_offer"]) if isinstance(order["applied_offer"], str) else order["applied_offer"]
                    if parsed and isinstance(parsed, dict) and parsed.get("items"):
                        for item in parsed["items"]:
                            total_sarees += int(item.get("quantity") or 1)
                    else:
                        total_sarees += int(order.get("quantity") or 1)
                else:
                    total_sarees += int(order.get("quantity") or 1)
            except Exception:
                total_sarees += int(order.get("quantity") or 1)
        
        avg_order_value = total_confirmed_value / len(confirmed_orders) if confirmed_orders else 0
        
        return {
            "totalSareesSold": total_sarees,
            "totalConfirmedOrders": len(confirmed_orders),
            "totalConfirmedValue": total_confirmed_value,
            "totalOrders": total_orders,
            "totalProducts": total_products,
            "averageOrderValue": avg_order_value
        }
    except Exception as e:
        print(f"Error fetching accounts stats: {e}")
        import traceback
        traceback.print_exc()
        return {
            "totalSareesSold": 0,
            "totalConfirmedOrders": 0,
            "totalConfirmedValue": 0,
            "totalOrders": 0,
            "totalProducts": 0,
            "averageOrderValue": 0
        }


@router.get("/visits")
async def get_visits(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get visits data for analytics."""
    if not db_service.is_available():
        return []
    
    try:
        visits = db_service.admin_get_all("visits", order_by="created_at", desc=True)
        
        # Apply date filters
        if start_date:
            visits = [v for v in visits if v.get("created_at", "") >= start_date]
        if end_date:
            visits = [v for v in visits if v.get("created_at", "") <= end_date]
        
        return visits
    except Exception as e:
        print(f"Error fetching visits: {e}")
        return []


@router.get("/pincodes")
async def get_pincodes_data(pincodes: str = Query(...)) -> List[Dict[str, Any]]:
    """Get pincode data for analytics."""
    if not db_service.is_available():
        return []
    
    try:
        pincode_list = [p.strip() for p in pincodes.split(",") if p.strip()]
        all_areas = db_service.admin_get_all("delivery_areas")
        
        # Filter by pincodes
        filtered_areas = [
            area for area in all_areas
            if str(area.get("pincode", "")) in pincode_list
        ]
        
        # Return only pincode, country, state
        return [
            {
                "pincode": area.get("pincode"),
                "country": area.get("country"),
                "state": area.get("state")
            }
            for area in filtered_areas
        ]
    except Exception as e:
        print(f"Error fetching pincodes: {e}")
        return []
