from __future__ import annotations

from typing import Any, Dict, List
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ...data import TESTIMONIALS
from ...services.db_service import db_service

router = APIRouter(prefix="/testimonials", tags=["admin-testimonials"])


@router.get("/")
async def get_testimonials() -> List[Dict[str, Any]]:
    """Get all testimonials."""
    if db_service.is_available():
        try:
            testimonials = db_service.admin_get_all("testimonials", order_by="display_order", desc=False)
            # Also sort by created_at
            testimonials.sort(key=lambda x: (x.get("display_order", 0), x.get("created_at", "")), reverse=True)
            return testimonials
        except Exception as e:
            print(f"Error fetching testimonials: {e}")
            return TESTIMONIALS
    return TESTIMONIALS


@router.post("/")
async def create_testimonial(testimonial: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new testimonial."""
    if db_service.is_available():
        try:
            if "id" not in testimonial:
                testimonial["id"] = str(uuid4())
            created = db_service.admin_create("testimonials", testimonial)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create testimonial")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating testimonial: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create testimonial: {str(e)}")
    
    # Fallback
    testimonial_id = str(uuid4())
    new_testimonial = {
        "id": testimonial_id,
        **testimonial
    }
    TESTIMONIALS.append(new_testimonial)
    return new_testimonial


@router.put("/{testimonial_id}")
async def update_testimonial(testimonial_id: str, testimonial: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing testimonial."""
    if db_service.is_available():
        try:
            updated = db_service.admin_update("testimonials", testimonial_id, testimonial)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Testimonial not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating testimonial: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update testimonial: {str(e)}")
    
    # Fallback
    index = next((i for i, t in enumerate(TESTIMONIALS) if t.get("id") == testimonial_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    existing = TESTIMONIALS[index]
    updated = {**existing, **testimonial, "id": testimonial_id, "updated_at": datetime.utcnow().isoformat()}
    TESTIMONIALS[index] = updated
    return updated


@router.delete("/{testimonial_id}")
async def delete_testimonial(testimonial_id: str) -> Dict[str, Any]:
    """Delete a testimonial."""
    if db_service.is_available():
        try:
            deleted = db_service.admin_delete("testimonials", testimonial_id)
            if deleted:
                return {"status": "success", "message": "Testimonial deleted"}
            raise HTTPException(status_code=404, detail="Testimonial not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting testimonial: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete testimonial: {str(e)}")
    
    # Fallback
    index = next((i for i, t in enumerate(TESTIMONIALS) if t.get("id") == testimonial_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    TESTIMONIALS.pop(index)
    return {"status": "success", "message": "Testimonial deleted"}
