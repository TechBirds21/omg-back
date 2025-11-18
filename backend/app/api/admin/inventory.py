from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ...data import PRODUCTS
from ...services.db_service import db_service

router = APIRouter(prefix="/inventory", tags=["admin-inventory"])


@router.get("/")
async def get_inventory(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get all inventory items."""
    if db_service.is_available():
        try:
            filters = {}
            if status:
                filters["status"] = status
            
            items = db_service.admin_get_all("inventory", order_by="created_at", desc=True, filters=filters if filters else None)
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                items = [
                    item for item in items
                    if search_lower in (item.get("product_name", "") or "").lower()
                    or search_lower in (item.get("sku", "") or "").lower()
                ]
            
            return items
        except Exception as e:
            print(f"Error fetching inventory: {e}")
            return []
    return []


@router.get("/{inventory_id}")
async def get_inventory_item(inventory_id: str) -> Dict[str, Any]:
    """Get a specific inventory item."""
    if db_service.is_available():
        try:
            item = db_service.admin_get_by_id("inventory", inventory_id)
            if item:
                return item
        except Exception as e:
            print(f"Error fetching inventory item: {e}")
    
    raise HTTPException(status_code=404, detail="Inventory item not found")


@router.put("/{inventory_id}")
async def update_inventory_item(inventory_id: str, inventory: Dict[str, Any]) -> Dict[str, Any]:
    """Update an inventory item."""
    if db_service.is_available():
        try:
            inventory["updated_at"] = datetime.utcnow().isoformat()
            updated = db_service.admin_update("inventory", inventory_id, inventory)
            if updated:
                # Also update the product if it exists
                product_id = updated.get("product_id")
                if product_id:
                    product_update = {
                        "total_stock": inventory.get("current_stock", updated.get("current_stock", 0)),
                        "stock_status": inventory.get("status", updated.get("status", "in_stock"))
                    }
                    try:
                        db_service.admin_update("products", product_id, product_update)
                    except Exception as e:
                        print(f"Error updating product stock from inventory: {e}")
                
                return updated
            raise HTTPException(status_code=404, detail="Inventory item not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating inventory item: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update inventory: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")

