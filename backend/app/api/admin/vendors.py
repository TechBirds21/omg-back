from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ...services.db_service import db_service

router = APIRouter(prefix="/vendors", tags=["admin-vendors"])


@router.get("/")
async def get_vendors(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
) -> List[Dict[str, Any]]:
    """Get all vendors."""
    if db_service.is_available():
        try:
            filters = {}
            if is_active is not None:
                filters["is_active"] = is_active
            vendors = db_service.admin_get_all("vendors", order_by="created_at", desc=True, filters=filters)
            # Filter by search if provided
            if search:
                search_lower = search.lower()
                vendors = [v for v in vendors if search_lower in (v.get("name", "") or "").lower() or search_lower in (v.get("vendor_code", "") or "").lower()]
            return vendors
        except Exception as e:
            print(f"Error fetching vendors: {e}")
            return []
    return []


@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str) -> Dict[str, Any]:
    """Get a specific vendor."""
    if db_service.is_available():
        try:
            vendor = db_service.admin_get_by_id("vendors", vendor_id)
            if vendor:
                return vendor
        except Exception as e:
            print(f"Error fetching vendor: {e}")
    
    raise HTTPException(status_code=404, detail="Vendor not found")


@router.get("/by-code/{vendor_code}")
async def get_vendor_by_code(vendor_code: str) -> Dict[str, Any]:
    """Get vendor by vendor code."""
    if db_service.is_available():
        try:
            vendors = db_service.admin_get_all("vendors", filters={"vendor_code": vendor_code})
            if vendors:
                return vendors[0]
        except Exception as e:
            print(f"Error fetching vendor by code: {e}")
    
    raise HTTPException(status_code=404, detail="Vendor not found")


@router.post("/")
async def create_vendor(vendor: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new vendor."""
    if db_service.is_available():
        try:
            if "id" not in vendor:
                vendor["id"] = str(uuid4())
            created = db_service.admin_create("vendors", vendor)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create vendor")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating vendor: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create vendor: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.put("/{vendor_id}")
async def update_vendor(vendor_id: str, vendor: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing vendor."""
    if db_service.is_available():
        try:
            updated = db_service.admin_update("vendors", vendor_id, vendor)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Vendor not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating vendor: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update vendor: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: str) -> Dict[str, Any]:
    """Delete a vendor."""
    if db_service.is_available():
        try:
            deleted = db_service.admin_delete("vendors", vendor_id)
            if deleted:
                return {"status": "success", "message": "Vendor deleted"}
            raise HTTPException(status_code=404, detail="Vendor not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting vendor: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete vendor: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")
