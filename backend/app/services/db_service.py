"""Unified database service that can use either Render PostgreSQL or Supabase."""

from typing import Any, Dict, List, Optional

from ..config import get_settings
from .database import database_service
from .supabase_client import supabase_service


class UnifiedDatabaseService:
    """Unified service that routes to either Render DB or Supabase based on configuration."""
    
    def __init__(self) -> None:
        self.settings = get_settings()
        self._determine_service()
    
    def _determine_service(self) -> None:
        """Determine which database service to use."""
        has_render = self.settings.database_url and database_service.is_available()
        has_supabase = self.settings.supabase_url and self.settings.supabase_key and supabase_service.is_available()
        
        # If preference is "render", ONLY use Render (ignore Supabase even if configured)
        if self.settings.database_preference == "render":
            if has_render:
                self.service = database_service
                self.service_name = "Render PostgreSQL"
            else:
                self.service = None
                self.service_name = "None (Render DB not configured)"
        # If preference is "supabase", use Supabase if available, fallback to Render
        elif self.settings.database_preference == "supabase":
            if has_supabase:
                self.service = supabase_service
                self.service_name = "Supabase"
            elif has_render:
                self.service = database_service
                self.service_name = "Render PostgreSQL (fallback)"
            else:
                self.service = None
                self.service_name = "None (using fixtures)"
        # Default behavior: prefer Render if both available
        else:
            if has_render:
                self.service = database_service
                self.service_name = "Render PostgreSQL"
            elif has_supabase:
                self.service = supabase_service
                self.service_name = "Supabase"
            else:
                self.service = None
                self.service_name = "None (using fixtures)"
    
    def is_available(self) -> bool:
        """Check if any database service is available."""
        return self.service is not None
    
    def get_service_name(self) -> str:
        """Get the name of the active database service."""
        return self.service_name
    
    # Delegate all methods to the active service
    def get_products(
        self,
        *,
        limit: Optional[int] = None,
        featured: Optional[bool] = None,
        new_collection: Optional[bool] = None,
        best_seller: Optional[bool] = None,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        is_active: bool = True,
    ) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_products(
            limit=limit,
            featured=featured,
            new_collection=new_collection,
            best_seller=best_seller,
            category_id=category_id,
            search=search,
            is_active=is_active,
        )
    
    def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.get_product_by_id(product_id)
    
    def get_product_by_name(self, product_name: str) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.get_product_by_name(product_name)
    
    def get_categories(self) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_categories()
    
    def get_testimonials(self) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_testimonials()
    
    def get_offers(self, is_active: bool = True) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_offers(is_active=is_active)
    
    def get_best_sellers(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_best_sellers(limit=limit)
    
    def get_new_arrivals(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_new_arrivals(limit=limit)
    
    def get_settings(self) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.get_settings()
    
    def create_order(self, order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.create_order(order_data)
    
    def get_orders_by_email(self, email: str) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_orders_by_email(email)
    
    def get_orders_by_customer(self, email: Optional[str] = None, phone: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        return self.service.get_orders_by_customer(email=email, phone=phone)
    
    def get_order_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.get_order_by_order_id(order_id)
    
    def get_complete_order_for_invoice(self, order_id: str) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.get_complete_order_for_invoice(order_id)
    
    def get_pincode_details(self, pincode: str) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.get_pincode_details(pincode)
    
    def create_contact_submission(self, submission_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        return self.service.create_contact_submission(submission_data)
    
    # Admin operations
    def admin_get_all(self, table_name: str, order_by: str = "created_at", desc: bool = True, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.service:
            return []
        if hasattr(self.service, 'admin_get_all'):
            return self.service.admin_get_all(table_name, order_by, desc, filters)
        return []
    
    def admin_get_by_id(self, table_name: str, item_id: str, id_column: str = "id") -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        if hasattr(self.service, 'admin_get_by_id'):
            return self.service.admin_get_by_id(table_name, item_id, id_column)
        return None
    
    def admin_create(self, table_name: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        if hasattr(self.service, 'admin_create'):
            return self.service.admin_create(table_name, data)
        return None
    
    def admin_update(self, table_name: str, item_id: str, data: Dict[str, Any], id_column: str = "id") -> Optional[Dict[str, Any]]:
        if not self.service:
            return None
        if hasattr(self.service, 'admin_update'):
            return self.service.admin_update(table_name, item_id, data, id_column)
        return None
    
    def admin_delete(self, table_name: str, item_id: str, id_column: str = "id") -> bool:
        if not self.service:
            return False
        if hasattr(self.service, 'admin_delete'):
            return self.service.admin_delete(table_name, item_id, id_column)
        return False


# Global unified service instance
db_service = UnifiedDatabaseService()

