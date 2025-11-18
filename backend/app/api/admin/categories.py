from __future__ import annotations

from typing import Any, Dict, List
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ...data import CATEGORIES
from ...services.db_service import db_service

router = APIRouter(prefix="/categories", tags=["admin-categories"])


@router.get("", summary="Get all categories")
@router.get("/", summary="Get all categories")
async def get_categories() -> List[Dict[str, Any]]:
    """Get all categories."""
    if db_service.is_available():
        try:
            categories = db_service.admin_get_all("categories", order_by="sort_order", desc=False)
            # Also sort by created_at
            categories.sort(key=lambda x: (x.get("sort_order", 0), x.get("created_at", "")), reverse=True)
            return categories
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return CATEGORIES
    return CATEGORIES


@router.post("/")
async def create_category(category: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new category."""
    if db_service.is_available():
        try:
            # Ensure required fields
            if "id" not in category:
                category["id"] = str(uuid4())
            created = db_service.admin_create("categories", category)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create category")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating category: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create category: {str(e)}")
    
    # Fallback
    category_id = str(uuid4())
    new_category = {
        "id": category_id,
        **category
    }
    CATEGORIES.append(new_category)
    return new_category


@router.put("/{category_id}")
async def update_category(category_id: str, category: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing category."""
    if db_service.is_available():
        try:
            updated = db_service.admin_update("categories", category_id, category)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Category not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating category: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update category: {str(e)}")
    
    # Fallback
    index = next((i for i, c in enumerate(CATEGORIES) if c.get("id") == category_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    existing = CATEGORIES[index]
    updated = {**existing, **category, "id": category_id, "updated_at": datetime.utcnow().isoformat()}
    CATEGORIES[index] = updated
    return updated


@router.delete("/{category_id}")
async def delete_category(category_id: str) -> Dict[str, Any]:
    """Delete a category."""
    if db_service.is_available():
        try:
            deleted = db_service.admin_delete("categories", category_id)
            if deleted:
                return {"status": "success", "message": "Category deleted"}
            raise HTTPException(status_code=404, detail="Category not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting category: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete category: {str(e)}")
    
    # Fallback
    index = next((i for i, c in enumerate(CATEGORIES) if c.get("id") == category_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    CATEGORIES.pop(index)
    return {"status": "success", "message": "Category deleted"}

