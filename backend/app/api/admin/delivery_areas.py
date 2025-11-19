from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from ...data import PINCODE_DETAILS
from ...services.db_service import db_service

router = APIRouter(prefix="/delivery-areas", tags=["admin-delivery-areas"])


@router.get("/")
async def get_delivery_areas(
    pincode: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get all delivery areas."""
    if db_service.is_available():
        try:
            # Build filters
            filters = {}
            if pincode:
                filters["pincode"] = int(pincode) if pincode.isdigit() else pincode
            if city:
                filters["city"] = city
            if state:
                filters["state"] = state
            
            areas = db_service.admin_get_all("delivery_areas", filters=filters if filters else None)
            
            # Apply text filters (ilike) if needed
            if city and not filters.get("city"):
                areas = [a for a in areas if city.lower() in a.get("city", "").lower()]
            if state and not filters.get("state"):
                areas = [a for a in areas if state.lower() in a.get("state", "").lower()]
            
            return areas if areas else PINCODE_DETAILS
        except Exception as e:
            print(f"Error fetching delivery areas: {e}")
            return PINCODE_DETAILS
    return PINCODE_DETAILS


@router.get("/{pincode}")
async def get_delivery_area(pincode: str) -> Dict[str, Any]:
    """Get delivery area by pincode."""
    if db_service.is_available():
        try:
            pincode_int = int(pincode) if pincode.isdigit() else pincode
            area = db_service.admin_get_by_id("delivery_areas", str(pincode_int), id_column="pincode")
            if area:
                return area
        except Exception as e:
            print(f"Error fetching delivery area: {e}")
    
    # Fallback
    area = next((d for d in PINCODE_DETAILS if str(d.get("pincode")) == str(pincode)), None)
    if not area:
        raise HTTPException(status_code=404, detail="Delivery area not found")
    return area


@router.post("/")
async def create_delivery_area(area: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new delivery area."""
    if db_service.is_available():
        try:
            created = db_service.admin_create("delivery_areas", area)
            if created:
                return created
        except Exception as e:
            print(f"Error creating delivery area: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create delivery area: {str(e)}")
    
    # Fallback
    new_area = {
        "pincode": area.get("pincode"),
        "area": area.get("area"),
        "city": area.get("city"),
        "state": area.get("state"),
        "country": area.get("country", "India"),
    }
    PINCODE_DETAILS.append(new_area)
    return new_area


@router.put("/{pincode}")
async def update_delivery_area(pincode: str, area: Dict[str, Any]) -> Dict[str, Any]:
    """Update a delivery area."""
    if db_service.is_available():
        try:
            pincode_int = int(pincode) if pincode.isdigit() else pincode
            updated = db_service.admin_update("delivery_areas", str(pincode_int), area, id_column="pincode")
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Delivery area not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating delivery area: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update delivery area: {str(e)}")
    
    # Fallback
    index = next((i for i, d in enumerate(PINCODE_DETAILS) if str(d.get("pincode")) == str(pincode)), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Delivery area not found")
    
    existing = PINCODE_DETAILS[index]
    updated = {**existing, **area, "pincode": pincode}
    PINCODE_DETAILS[index] = updated
    return updated


@router.delete("/{pincode}")
async def delete_delivery_area(pincode: str) -> Dict[str, Any]:
    """Delete a delivery area."""
    if db_service.is_available():
        try:
            pincode_int = int(pincode) if pincode.isdigit() else pincode
            deleted = db_service.admin_delete("delivery_areas", str(pincode_int), id_column="pincode")
            if deleted:
                return {"status": "success", "message": "Delivery area deleted"}
            raise HTTPException(status_code=404, detail="Delivery area not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting delivery area: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete delivery area: {str(e)}")
    
    # Fallback
    index = next((i for i, d in enumerate(PINCODE_DETAILS) if str(d.get("pincode")) == str(pincode)), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Delivery area not found")
    
    PINCODE_DETAILS.pop(index)
    return {"status": "success", "message": "Delivery area deleted"}

