from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ...services.db_service import db_service

router = APIRouter(prefix="/deliveries", tags=["admin-deliveries"])


@router.get("/")
async def get_deliveries(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get all deliveries."""
    if db_service.is_available():
        try:
            filters = {}
            if status:
                filters["status"] = status
            
            items = db_service.admin_get_all("deliveries", order_by="created_at", desc=True, filters=filters if filters else None)
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                items = [
                    item for item in items
                    if search_lower in (item.get("delivery_id", "") or "").lower()
                    or search_lower in (item.get("customer_name", "") or "").lower()
                    or search_lower in (item.get("tracking_id", "") or "").lower()
                ]
            
            return items
        except Exception as e:
            print(f"Error fetching deliveries: {e}")
            return []
    return []


@router.get("/{delivery_id}")
async def get_delivery(delivery_id: str) -> Dict[str, Any]:
    """Get a specific delivery."""
    if db_service.is_available():
        try:
            item = db_service.admin_get_by_id("deliveries", delivery_id)
            if item:
                return item
        except Exception as e:
            print(f"Error fetching delivery: {e}")
    
    raise HTTPException(status_code=404, detail="Delivery not found")


@router.post("/")
async def create_delivery(delivery: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new delivery."""
    if db_service.is_available():
        try:
            created = db_service.admin_create("deliveries", delivery)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create delivery")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating delivery: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create delivery: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.put("/{delivery_id}")
async def update_delivery(delivery_id: str, delivery: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing delivery."""
    if db_service.is_available():
        try:
            delivery["updated_at"] = datetime.utcnow().isoformat()
            updated = db_service.admin_update("deliveries", delivery_id, delivery)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Delivery not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating delivery: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update delivery: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.delete("/{delivery_id}")
async def delete_delivery(delivery_id: str) -> Dict[str, Any]:
    """Delete a delivery."""
    if db_service.is_available():
        try:
            deleted = db_service.admin_delete("deliveries", delivery_id)
            if deleted:
                return {"status": "success", "message": "Delivery deleted"}
            raise HTTPException(status_code=404, detail="Delivery not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting delivery: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete delivery: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")

