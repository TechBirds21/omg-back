from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ...services.db_service import db_service

router = APIRouter(prefix="/contact-submissions", tags=["admin-contact-submissions"])


@router.get("/")
async def get_contact_submissions(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get all contact submissions."""
    if db_service.is_available():
        try:
            filters = {}
            if status:
                filters["status"] = status
            
            items = db_service.admin_get_all("contact_submissions", order_by="created_at", desc=True, filters=filters if filters else None)
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                items = [
                    item for item in items
                    if search_lower in (item.get("name", "") or "").lower()
                    or search_lower in (item.get("email", "") or "").lower()
                    or search_lower in (item.get("subject", "") or "").lower()
                ]
            
            return items
        except Exception as e:
            print(f"Error fetching contact submissions: {e}")
            return []
    return []


@router.get("/{submission_id}")
async def get_contact_submission(submission_id: str) -> Dict[str, Any]:
    """Get a specific contact submission."""
    if db_service.is_available():
        try:
            item = db_service.admin_get_by_id("contact_submissions", submission_id)
            if item:
                return item
        except Exception as e:
            print(f"Error fetching contact submission: {e}")
    
    raise HTTPException(status_code=404, detail="Contact submission not found")


@router.post("/")
async def create_contact_submission(submission: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new contact submission."""
    if db_service.is_available():
        try:
            created = db_service.admin_create("contact_submissions", submission)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create contact submission")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating contact submission: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create contact submission: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.put("/{submission_id}")
async def update_contact_submission(submission_id: str, submission: Dict[str, Any]) -> Dict[str, Any]:
    """Update a contact submission."""
    if db_service.is_available():
        try:
            updated = db_service.admin_update("contact_submissions", submission_id, submission)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Contact submission not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating contact submission: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update contact submission: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.delete("/{submission_id}")
async def delete_contact_submission(submission_id: str) -> Dict[str, Any]:
    """Delete a contact submission."""
    if db_service.is_available():
        try:
            deleted = db_service.admin_delete("contact_submissions", submission_id)
            if deleted:
                return {"status": "success", "message": "Contact submission deleted"}
            raise HTTPException(status_code=404, detail="Contact submission not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting contact submission: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete contact submission: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")

