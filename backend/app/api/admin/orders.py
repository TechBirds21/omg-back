from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Body

from ...services.db_service import db_service

router = APIRouter(prefix="/orders", tags=["admin-orders"])


@router.get("/")
async def get_orders_for_admin(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, alias="statusFilter"),
    vendor_id: Optional[str] = Query(None, alias="vendorFilter"),
    payment_status: Optional[str] = Query(None, alias="paymentStatusFilter"),
    search: Optional[str] = Query(None, alias="searchTerm"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get orders with filtering and pagination."""
    if db_service.is_available():
        try:
            # Build filters
            filters = {}
            if status and status != "all":
                filters["status"] = status
            if vendor_id and vendor_id != "all":
                filters["vendor_id"] = vendor_id
            if payment_status and payment_status != "all":
                filters["payment_status"] = payment_status
            
            # Get all orders with filters
            all_orders = db_service.admin_get_all("orders", order_by="created_at", desc=True, filters=filters if filters else None)
            
            # Apply date filters
            if year:
                all_orders = [o for o in all_orders if o.get("created_at", "").startswith(str(year))]
            if month is not None and year is not None:
                month_str = f"{year}-{month:02d}"
                all_orders = [o for o in all_orders if o.get("created_at", "").startswith(month_str)]
            if start_date:
                all_orders = [o for o in all_orders if o.get("created_at", "") >= start_date]
            if end_date:
                all_orders = [o for o in all_orders if o.get("created_at", "") <= end_date]
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                all_orders = [
                    o for o in all_orders
                    if search_lower in (o.get("order_id", "") or "").lower()
                    or search_lower in (o.get("customer_name", "") or "").lower()
                    or search_lower in (o.get("product_name", "") or "").lower()
                ]
            
            total = len(all_orders)
            
            # Apply pagination
            start = (page - 1) * size
            orders = all_orders[start:start + size]
            
            return {
                "orders": orders,
                "total": total,
                "page": page,
                "size": size,
                "pages": (total + size - 1) // size,
            }
        except Exception as e:
            print(f"Error fetching orders: {e}")
            import traceback
            traceback.print_exc()
    
    # Fallback to empty
    return {
        "orders": [],
        "total": 0,
        "page": page,
        "size": size,
        "pages": 0,
    }


@router.get("/summary")
async def get_orders_summary_stats(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get summary statistics for orders."""
    if db_service.is_available():
        try:
            # Build filters
            filters = {}
            if status and status != "all":
                filters["status"] = status
            if vendor_id and vendor_id != "all":
                filters["vendor_id"] = vendor_id
            if payment_status and payment_status != "all":
                filters["payment_status"] = payment_status
            
            # Get all orders with filters
            all_orders = db_service.admin_get_all("orders", filters=filters if filters else None)
            
            # Apply date filters
            if year:
                all_orders = [o for o in all_orders if o.get("created_at", "").startswith(str(year))]
            if month is not None and year is not None:
                month_str = f"{year}-{month:02d}"
                all_orders = [o for o in all_orders if o.get("created_at", "").startswith(month_str)]
            
            total_orders = len(all_orders)
            total_revenue = sum(float(o.get("amount", 0) or o.get("total", 0)) for o in all_orders)
            
            status_counts = {}
            for order in all_orders:
                s = order.get("status", "pending")
                status_counts[s] = status_counts.get(s, 0) + 1
            
            return {
                "total_orders": total_orders,
                "total_revenue": total_revenue,
                "status_counts": status_counts,
            }
        except Exception as e:
            print(f"Error fetching order stats: {e}")
    
    # Fallback
    return {
        "total_orders": 0,
        "total_revenue": 0,
        "status_counts": {},
    }


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: Dict[str, Any] = Body(...),
) -> Dict[str, Any]:
    """Update order status."""
    if db_service.is_available():
        try:
            update_data = {}
            if "status" in payload:
                update_data["status"] = payload["status"]
            if "payment_status" in payload:
                update_data["payment_status"] = payload["payment_status"]
            if "notes" in payload:
                update_data["notes"] = payload.get("notes")
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            updated = db_service.admin_update("orders", order_id, update_data, id_column="order_id")
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Order not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating order status: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.post("/bulk-status")
async def update_orders_status_bulk(
    payload: Dict[str, Any] = Body(...),
) -> Dict[str, Any]:
    """Update status for multiple orders."""
    if db_service.is_available():
        try:
            order_ids = payload.get("order_ids", [])
            status = payload.get("status")
            payment_status = payload.get("payment_status")
            
            update_data = {"updated_at": datetime.utcnow().isoformat()}
            if status:
                update_data["status"] = status
            if payment_status:
                update_data["payment_status"] = payment_status
            
            updated = 0
            for order_id in order_ids:
                result = db_service.admin_update("orders", order_id, update_data, id_column="order_id")
                if result:
                    updated += 1
            
            return {"status": "success", "updated": updated}
        except Exception as e:
            print(f"Error bulk updating orders: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update orders: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.patch("/{order_id}/payment-status")
async def update_order_payment_status(
    order_id: str,
    payload: Dict[str, Any] = Body(...),
) -> Dict[str, Any]:
    """Update order payment status."""
    if db_service.is_available():
        try:
            update_data = {
                "payment_status": payload.get("payment_status"),
                "updated_at": datetime.utcnow().isoformat()
            }
            updated = db_service.admin_update("orders", order_id, update_data, id_column="order_id")
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Order not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating order payment status: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.delete("/{order_id}")
async def delete_order(order_id: str) -> Dict[str, Any]:
    """Delete an order by order_id."""
    if db_service.is_available():
        try:
            # First, try to delete related records (vendor_orders, deliveries)
            # Note: These might have foreign key constraints
            try:
                # Get order by order_id to find the actual id
                orders = db_service.admin_get_all("orders", filters={"order_id": order_id})
                if not orders:
                    raise HTTPException(status_code=404, detail="Order not found")
                
                order = orders[0]
                order_uuid = order.get("id")
                
                # Delete related records if they exist
                try:
                    vendor_orders = db_service.admin_get_all("vendor_orders", filters={"order_id": order_uuid})
                    for vo in vendor_orders:
                        db_service.admin_delete("vendor_orders", vo.get("id"))
                except:
                    pass
                
                try:
                    deliveries = db_service.admin_get_all("deliveries", filters={"order_id": order_uuid})
                    for d in deliveries:
                        db_service.admin_delete("deliveries", d.get("id"))
                except:
                    pass
                
                # Delete the order
                result = db_service.admin_delete("orders", order_uuid)
                if result:
                    return {"status": "success", "message": "Order deleted successfully"}
                raise HTTPException(status_code=404, detail="Order not found")
            except HTTPException:
                raise
            except Exception as e:
                print(f"Error deleting order: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to delete order: {str(e)}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error in delete_order: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete order: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")
