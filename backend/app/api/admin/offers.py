from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from ...services.db_service import db_service

router = APIRouter(prefix="/offers", tags=["admin-offers"])


@router.get("/")
async def get_offers() -> List[Dict[str, Any]]:
    """Get all offers."""
    if db_service.is_available():
        try:
            offers = db_service.admin_get_all("offers", order_by="priority", desc=True)
            return offers
        except Exception as e:
            print(f"Error fetching offers: {e}")
            return []
    return []


@router.get("/{offer_id}")
async def get_offer(offer_id: str) -> Dict[str, Any]:
    """Get a single offer by ID."""
    if db_service.is_available():
        try:
            offer = db_service.admin_get_by_id("offers", offer_id)
            if offer:
                return offer
        except Exception as e:
            print(f"Error fetching offer: {e}")
    
    raise HTTPException(status_code=404, detail="Offer not found")


@router.post("/")
async def create_offer(offer: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new offer."""
    if db_service.is_available():
        try:
            if "id" not in offer:
                offer["id"] = str(uuid4())
            created = db_service.admin_create("offers", offer)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create offer")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating offer: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create offer: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.put("/{offer_id}")
async def update_offer(offer_id: str, offer: Dict[str, Any]) -> Dict[str, Any]:
    """Update an offer."""
    if db_service.is_available():
        try:
            updated = db_service.admin_update("offers", offer_id, offer)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Offer not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating offer: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update offer: {str(e)}")
    
    raise HTTPException(status_code=404, detail="Offer not found")


@router.delete("/{offer_id}")
async def delete_offer(offer_id: str) -> Dict[str, Any]:
    """Delete an offer."""
    if db_service.is_available():
        try:
            deleted = db_service.admin_delete("offers", offer_id)
            if deleted:
                return {"success": True, "message": "Offer deleted successfully"}
            raise HTTPException(status_code=404, detail="Offer not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting offer: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete offer: {str(e)}")
    
    raise HTTPException(status_code=404, detail="Offer not found")
