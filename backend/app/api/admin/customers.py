from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ...services.db_service import db_service

router = APIRouter(prefix="/customers", tags=["admin-customers"])


@router.get("/")
async def get_customers() -> List[Dict[str, Any]]:
    """Get all customers."""
    if db_service.is_available():
        try:
            customers = db_service.admin_get_all("customers", order_by="created_at", desc=True)
            return customers
        except Exception as e:
            print(f"Error fetching customers: {e}")
            return []
    return []


@router.get("/{customer_id}")
async def get_customer(customer_id: str) -> Dict[str, Any]:
    """Get a specific customer."""
    if db_service.is_available():
        try:
            customer = db_service.admin_get_by_id("customers", customer_id)
            if customer:
                return customer
        except Exception as e:
            print(f"Error fetching customer: {e}")
    
    raise HTTPException(status_code=404, detail="Customer not found")


@router.get("/{customer_id}/orders")
async def get_customer_orders(customer_id: str) -> List[Dict[str, Any]]:
    """Get orders for a specific customer."""
    if db_service.is_available():
        try:
            orders = db_service.admin_get_all("orders", order_by="created_at", desc=True, filters={"customer_id": customer_id})
            return orders
        except Exception as e:
            print(f"Error fetching customer orders: {e}")
            return []
    return []


@router.post("/")
async def create_customer(customer: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new customer."""
    if db_service.is_available():
        try:
            created = db_service.admin_create("customers", customer)
            if created:
                return created
            raise HTTPException(status_code=500, detail="Failed to create customer")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating customer: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.put("/{customer_id}")
async def update_customer(customer_id: str, customer: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing customer."""
    if db_service.is_available():
        try:
            customer["updated_at"] = datetime.utcnow().isoformat()
            updated = db_service.admin_update("customers", customer_id, customer)
            if updated:
                return updated
            raise HTTPException(status_code=404, detail="Customer not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error updating customer: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update customer: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str) -> Dict[str, Any]:
    """Delete a customer."""
    if db_service.is_available():
        try:
            deleted = db_service.admin_delete("customers", customer_id)
            if deleted:
                return {"status": "success", "message": "Customer deleted"}
            raise HTTPException(status_code=404, detail="Customer not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error deleting customer: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete customer: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Database not available")

