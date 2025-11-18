from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from ...data import PRODUCTS, CATEGORIES
from ...services.db_service import db_service

router = APIRouter(prefix="/products", tags=["admin-products"])


@router.get("", summary="Get all products")
@router.get("/", summary="Get all products")
async def get_products_for_admin() -> List[Dict[str, Any]]:
    """Get all products for admin."""
    if db_service.is_available():
        try:
            products = db_service.admin_get_all("products", order_by="created_at", desc=True)
            return products
        except Exception as e:
            print(f"Error fetching products: {e}")
            return PRODUCTS
    return PRODUCTS


@router.get("/categories")
async def get_categories() -> List[Dict[str, Any]]:
    """Get all categories."""
    if db_service.is_available():
        try:
            categories = db_service.get_categories()
            return categories
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return CATEGORIES
    return CATEGORIES


@router.get("/vendors")
async def get_vendors() -> List[Dict[str, Any]]:
    """Get all vendors."""
    if db_service.is_available():
        try:
            vendors = db_service.admin_get_all("vendors", order_by="created_at", desc=True)
            return vendors
        except Exception as e:
            print(f"Error fetching vendors: {e}")
            return []
    return []


@router.post("/")
async def create_product(product: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new product."""
    if db_service.is_available():
        try:
            if "id" not in product:
                product["id"] = str(uuid4())
            created = db_service.admin_create("products", product)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create product")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating product: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")
    
    # Fallback to in-memory
    product_id = str(uuid4())
    new_product = {
        "id": product_id,
        **product
    }
    PRODUCTS.append(new_product)
    return new_product


@router.put("/{product_id}")
async def update_product(product_id: str, product: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing product."""
    if db_service.is_available():
        try:
            updated = db_service.admin_update("products", product_id, product)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Product not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating product: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")
    
    # Fallback to in-memory
    index = next((i for i, p in enumerate(PRODUCTS) if p.get("id") == product_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    existing = PRODUCTS[index]
    updated = {**existing, **product, "id": product_id}
    PRODUCTS[index] = updated
    return updated


@router.delete("/{product_id}")
async def delete_product(product_id: str) -> Dict[str, Any]:
    """Delete a product (soft delete by setting is_active=False)."""
    if db_service.is_available():
        try:
            updated = db_service.admin_update("products", product_id, {"is_active": False})
            if updated:
                return {"status": "success", "message": "Product deleted"}
            raise HTTPException(status_code=404, detail="Product not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting product: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")
    
    # Fallback to in-memory
    index = next((i for i, p in enumerate(PRODUCTS) if p.get("id") == product_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    PRODUCTS[index]["is_active"] = False
    return {"status": "success", "message": "Product deleted"}


@router.post("/{product_id}/hide")
async def hide_product(product_id: str) -> Dict[str, Any]:
    """Hide a product."""
    index = next((i for i, p in enumerate(PRODUCTS) if p.get("id") == product_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    PRODUCTS[index]["is_active"] = False
    return {"status": "success", "message": "Product hidden"}


@router.post("/{product_id}/restore")
async def restore_product(product_id: str) -> Dict[str, Any]:
    """Restore a hidden product."""
    index = next((i for i, p in enumerate(PRODUCTS) if p.get("id") == product_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    PRODUCTS[index]["is_active"] = True
    return {"status": "success", "message": "Product restored"}


@router.get("/{product_id}/can-delete")
async def can_delete_product(product_id: str) -> Dict[str, bool]:
    """Check if a product can be deleted (not used in orders)."""
    # For now, always return True (will check orders when DB is integrated)
    return {"can_delete": True}

