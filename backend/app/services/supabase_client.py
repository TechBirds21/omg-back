"""Supabase client service for database operations."""

from typing import Any, Dict, List, Optional

from supabase import create_client, Client
from ..config import get_settings


class SupabaseService:
    """Service for interacting with Supabase database."""
    
    def __init__(self) -> None:
        settings = get_settings()
        self.client: Optional[Client] = None
        
        if settings.supabase_url and settings.supabase_key:
            self.client = create_client(settings.supabase_url, settings.supabase_key)
    
    def is_available(self) -> bool:
        """Check if Supabase client is available."""
        return self.client is not None
    
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
        """Get products from Supabase with filters."""
        if not self.client:
            return []
        
        try:
            query = self.client.table("products").select("*")
            
            if is_active:
                query = query.eq("is_active", True)
            
            if featured is not None:
                query = query.eq("featured", featured)
            
            if new_collection is not None:
                query = query.eq("new_collection", new_collection)
                if new_collection:
                    # Filter by date if end_date exists
                    from datetime import datetime
                    today = datetime.utcnow().isoformat()
                    query = query.or_(f"new_collection_end_date.is.null,new_collection_end_date.gte.{today}")
            
            if best_seller is not None:
                query = query.eq("best_seller", best_seller)
                if best_seller:
                    query = query.order("best_seller_rank", desc=False)
            
            if category_id:
                query = query.eq("category_id", category_id)
            
            if search:
                query = query.or_(f"name.ilike.%{search}%,description.ilike.%{search}%")
            
            query = query.order("created_at", desc=True)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching products from Supabase: {e}")
            return []
    
    def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get a single product by ID."""
        if not self.client:
            return None
        try:
            response = self.client.table("products").select("*").eq("id", product_id).eq("is_active", True).single().execute()
            return response.data if response.data else None
        except Exception:
            return None
    
    def get_product_by_name(self, product_name: str) -> Optional[Dict[str, Any]]:
        """Get a product by name."""
        if not self.client:
            return None
        try:
            decoded_name = product_name.replace("+", " ")
            response = (
                self.client.table("products")
                .select("*")
                .eq("is_active", True)
                .ilike("name", decoded_name)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception:
            return None
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get all active categories."""
        if not self.client:
            return []
        try:
            response = (
                self.client.table("categories")
                .select("*")
                .eq("is_active", True)
                .order("sort_order", desc=False)
                .order("created_at", desc=True)
                .execute()
            )
            print(f"Supabase: Fetched {len(response.data) if response.data else 0} categories")
            if response.data:
                print(f"Categories: {[cat.get('name', 'N/A') for cat in response.data[:5]]}")
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching categories from Supabase: {e}")
            return []
    
    def get_testimonials(self) -> List[Dict[str, Any]]:
        """Get active testimonials."""
        if not self.client:
            return []
        try:
            response = (
                self.client.table("testimonials")
                .select("*")
                .eq("is_active", True)
                .order("display_order", desc=False)
                .execute()
            )
            return response.data if response.data else []
        except Exception:
            return []
    
    def get_offers(self, is_active: bool = True) -> List[Dict[str, Any]]:
        """Get active offers."""
        if not self.client:
            return []
        try:
            from datetime import datetime
            today = datetime.utcnow().isoformat()
            
            query = self.client.table("offers").select("*")
            
            if is_active:
                query = query.eq("is_active", True)
                # Fetch all active offers and filter by date in Python
                # Supabase PostgREST has limitations with complex OR conditions
                response = query.order("priority", desc=True).execute()
                offers = response.data if response.data else []
                
                # Filter by date range in Python
                filtered_offers = []
                for offer in offers:
                    start_ok = not offer.get("start_date") or offer.get("start_date") <= today
                    end_ok = not offer.get("end_date") or offer.get("end_date") >= today
                    if start_ok and end_ok:
                        filtered_offers.append(offer)
                
                return filtered_offers
            else:
                response = query.order("priority", desc=True).execute()
                return response.data if response.data else []
        except Exception:
            return []
    
    def get_best_sellers(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get best seller products."""
        return self.get_products(
            best_seller=True,
            limit=limit,
            is_active=True,
        )
    
    def get_new_arrivals(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get new collection products."""
        return self.get_products(
            new_collection=True,
            limit=limit,
            is_active=True,
        )
    
    def get_settings(self) -> Optional[Dict[str, Any]]:
        """Get settings from Supabase and format for frontend."""
        if not self.client:
            return None
        try:
            response = self.client.table("settings").select("*").execute()
            if response.data:
                # Convert list of {key, value} to dict
                settings_dict = {}
                for item in response.data:
                    key = item.get("key")
                    value = item.get("value")
                    if key and value:
                        # If value is a string, try to parse as JSON
                        if isinstance(value, str):
                            try:
                                import json
                                value = json.loads(value)
                            except:
                                pass
                        settings_dict[key] = value
                
                # Ensure brand has logo_url if not present
                if "brand" in settings_dict and isinstance(settings_dict["brand"], dict):
                    brand = settings_dict["brand"]
                    # If logo_url is not present, try to get from seo.default_image
                    if "logo_url" not in brand or not brand.get("logo_url"):
                        seo = settings_dict.get("seo", {})
                        if isinstance(seo, dict) and seo.get("default_image"):
                            brand["logo_url"] = seo["default_image"]
                        elif not brand.get("logo_url"):
                            # Last resort: use a default placeholder
                            brand["logo_url"] = None
                
                # Debug: Print brand settings to verify logo_url
                if "brand" in settings_dict:
                    print(f"Brand settings from DB: {settings_dict['brand']}")
                
                # Return settings in the format expected by frontend
                # Frontend expects: { hero_section: {...}, brand: {...}, etc. }
                return settings_dict
            return None
        except Exception as e:
            print(f"Error fetching settings from Supabase: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_order(self, order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create an order in Supabase."""
        if not self.client:
            return None
        try:
            response = self.client.table("orders").insert(order_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating order in Supabase: {e}")
            return None
    
    def get_orders_by_email(self, email: str) -> List[Dict[str, Any]]:
        """Get orders by customer email."""
        if not self.client:
            return []
        try:
            response = (
                self.client.table("orders")
                .select("*")
                .eq("customer_email", email)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching orders from Supabase: {e}")
            return []
    
    def get_orders_by_customer(self, email: Optional[str] = None, phone: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get orders by customer email or phone."""
        if not self.client:
            return []
        try:
            query = self.client.table("orders").select("*")
            
            if email:
                query = query.eq("customer_email", email)
            elif phone:
                # Clean phone number for comparison
                clean_phone = phone.replace(" ", "").replace("-", "").replace("+", "")
                # Note: This is a simple match, might need better phone normalization
                query = query.ilike("customer_phone", f"%{clean_phone}%")
            else:
                return []
            
            response = query.order("created_at", desc=True).execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching orders from Supabase: {e}")
            return []
    
    def get_order_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get order by order_id (merchant order ID)."""
        if not self.client:
            return None
        try:
            response = (
                self.client.table("orders")
                .select("*")
                .eq("order_id", order_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            print(f"Error fetching order from Supabase: {e}")
            return None
    
    def get_complete_order_for_invoice(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get complete order data with product information for invoice generation."""
        if not self.client:
            return None
        try:
            # First try by order_id
            response = (
                self.client.table("orders")
                .select("*, product:products(*), vendor:vendors(id, name, vendor_code)")
                .eq("order_id", order_id)
                .single()
                .execute()
            )
            
            if response.data:
                order = response.data
                # If product join failed, try to get product by name
                if not order.get("product") and order.get("product_name"):
                    base_name = order["product_name"].split(" (")[0] if " (" in order["product_name"] else order["product_name"]
                    product_response = (
                        self.client.table("products")
                        .select("id, name, images, cover_image_index, colors, color_images, saree_id")
                        .eq("name", base_name)
                        .maybe_single()
                        .execute()
                    )
                    if product_response.data:
                        order["product"] = product_response.data
                return order
            
            # If not found by order_id, try by UUID
            try:
                uuid_response = (
                    self.client.table("orders")
                    .select("*, product:products(*), vendor:vendors(id, name, vendor_code)")
                    .eq("id", order_id)
                    .single()
                    .execute()
                )
                if uuid_response.data:
                    order = uuid_response.data
                    # If product join failed, try to get product by name
                    if not order.get("product") and order.get("product_name"):
                        base_name = order["product_name"].split(" (")[0] if " (" in order["product_name"] else order["product_name"]
                        product_response = (
                            self.client.table("products")
                            .select("id, name, images, cover_image_index, colors, color_images, saree_id")
                            .eq("name", base_name)
                            .maybe_single()
                            .execute()
                        )
                        if product_response.data:
                            order["product"] = product_response.data
                    return order
            except:
                pass
            
            return None
        except Exception as e:
            print(f"Error fetching complete order from Supabase: {e}")
            return None
    
    def get_pincode_details(self, pincode: str) -> Optional[Dict[str, Any]]:
        """Get pincode delivery details from Supabase."""
        if not self.client:
            return None
        try:
            # Clean pincode - remove any non-digit characters
            clean_pincode = ''.join(filter(str.isdigit, pincode))
            if not clean_pincode:
                return None
            
            # Try as integer first (most common case)
            try:
                pincode_int = int(clean_pincode)
                response = (
                    self.client.table("delivery_areas")
                    .select("*")
                    .eq("pincode", pincode_int)
                    .maybe_single()
                    .execute()
                )
            except ValueError:
                # If not a valid integer, try as string
                response = (
                    self.client.table("delivery_areas")
                    .select("*")
                    .eq("pincode", clean_pincode)
                    .maybe_single()
                    .execute()
                )
            
            if response.data:
                data = response.data
                return {
                    "pincode": str(data.get("pincode", clean_pincode)),
                    "area": data.get("area") or data.get("area_name") or "",
                    "city": data.get("city") or "",
                    "state": data.get("state") or "",
                    "country": data.get("country") or "India",
                }
            
            # If not found, try with text comparison (case-insensitive)
            response_text = (
                self.client.table("delivery_areas")
                .select("*")
                .ilike("pincode", f"%{clean_pincode}%")
                .maybe_single()
                .execute()
            )
            
            if response_text.data:
                data = response_text.data
                return {
                    "pincode": str(data.get("pincode", clean_pincode)),
                    "area": data.get("area") or data.get("area_name") or "",
                    "city": data.get("city") or "",
                    "state": data.get("state") or "",
                    "country": data.get("country") or "India",
                }
            
            return None
        except Exception as e:
            print(f"Error fetching pincode from Supabase: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_contact_submission(self, submission_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a contact submission in Supabase."""
        if not self.client:
            return None
        try:
            response = self.client.table("contact_submissions").insert(submission_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating contact submission in Supabase: {e}")
            return None
    
    # Admin operations - Generic CRUD methods
    def admin_get_all(self, table_name: str, order_by: str = "created_at", desc: bool = True, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get all rows from a table (admin)."""
        if not self.client:
            print(f"⚠️ Supabase client not available for {table_name}")
            return []
        try:
            # Fetch all records (Supabase has a default limit, so we need to paginate)
            all_items = []
            offset = 0
            limit = 1000  # Supabase default limit
            
            while True:
                # Build query fresh for each batch
                query = self.client.table(table_name).select("*")
                
                # Apply filters
                if filters:
                    for key, value in filters.items():
                        if value is not None:
                            query = query.eq(key, value)
                
                # Apply ordering
                query = query.order(order_by, desc=desc)
                
                # Apply pagination
                query = query.range(offset, offset + limit - 1)
                
                response = query.execute()
                items = response.data if response.data else []
                
                if not items:
                    break
                
                all_items.extend(items)
                
                # If we got less than the limit, we've reached the end
                if len(items) < limit:
                    break
                
                offset += limit
            
            # Convert timestamps to ISO format
            for item in all_items:
                for key in ["created_at", "updated_at"]:
                    if key in item and item[key]:
                        if isinstance(item[key], str):
                            # Already a string, keep it
                            pass
                        else:
                            # Convert datetime to ISO string
                            try:
                                item[key] = item[key].isoformat()
                            except:
                                pass
            
            print(f"✅ Supabase: Fetched {len(all_items)} records from {table_name}")
            if len(all_items) > 0:
                print(f"   Sample record keys: {list(all_items[0].keys())[:10]}")
            return all_items
        except Exception as e:
            print(f"❌ Error fetching from {table_name} in Supabase: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def admin_get_by_id(self, table_name: str, item_id: str, id_column: str = "id") -> Optional[Dict[str, Any]]:
        """Get a row by ID (admin)."""
        if not self.client:
            return None
        try:
            response = (
                self.client.table(table_name)
                .select("*")
                .eq(id_column, item_id)
                .maybe_single()
                .execute()
            )
            if response.data:
                item = response.data
                # Convert timestamps
                for key in ["created_at", "updated_at"]:
                    if key in item and item[key]:
                        try:
                            if not isinstance(item[key], str):
                                item[key] = item[key].isoformat()
                        except:
                            pass
                return item
            return None
        except Exception as e:
            print(f"Error fetching {table_name} by {id_column}={item_id} from Supabase: {e}")
            return None
    
    def admin_create(self, table_name: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a row (admin)."""
        if not self.client:
            return None
        try:
            print(f"[Supabase] Attempting to insert into {table_name}")
            print(f"[Supabase] Data keys: {list(data.keys())}")
            print(f"[Supabase] Data preview: {str({k: str(v)[:50] for k, v in list(data.items())[:5]})}")
            
            response = self.client.table(table_name).insert(data).execute()
            
            print(f"[Supabase] Response received: {type(response)}")
            print(f"[Supabase] Response has data attr: {hasattr(response, 'data')}")
            
            if hasattr(response, 'data'):
                print(f"[Supabase] Response.data type: {type(response.data)}")
                print(f"[Supabase] Response.data value: {response.data}")
                
                if response.data:
                    if isinstance(response.data, list):
                        if len(response.data) > 0:
                            item = response.data[0]
                            print(f"[Supabase] ✅ Successfully created in {table_name}: {item.get('id', 'N/A')}")
                            # Convert timestamps
                            for key in ["created_at", "updated_at"]:
                                if key in item and item[key]:
                                    try:
                                        if not isinstance(item[key], str):
                                            item[key] = item[key].isoformat()
                                    except:
                                        pass
                            return item
                        else:
                            print(f"[Supabase] ⚠️  Response.data is empty list")
                            return None
                    else:
                        # Single item, not a list
                        item = response.data
                        print(f"[Supabase] ✅ Successfully created in {table_name}: {item.get('id', 'N/A')}")
                        # Convert timestamps
                        for key in ["created_at", "updated_at"]:
                            if key in item and item[key]:
                                try:
                                    if not isinstance(item[key], str):
                                        item[key] = item[key].isoformat()
                                except:
                                    pass
                        return item
                else:
                    print(f"[Supabase] ⚠️  No data returned from insert into {table_name}")
                    print(f"[Supabase] Response object: {response}")
                    print(f"[Supabase] Response attributes: {dir(response)}")
                    return None
            else:
                print(f"[Supabase] ⚠️  Response object has no 'data' attribute")
                print(f"[Supabase] Response object: {response}")
                print(f"[Supabase] Response type: {type(response)}")
                print(f"[Supabase] Response attributes: {dir(response)}")
                return None
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error creating in {table_name} in Supabase: {error_msg}")
            print(f"   Error type: {type(e).__name__}")
            
            # Try to extract more details from the error
            if hasattr(e, 'message'):
                print(f"   Error message: {e.message}")
            if hasattr(e, 'details'):
                print(f"   Error details: {e.details}")
            if hasattr(e, 'hint'):
                print(f"   Error hint: {e.hint}")
            if hasattr(e, 'code'):
                print(f"   Error code: {e.code}")
            
            # Check if it's a Supabase API error with more details
            if hasattr(e, 'args') and e.args:
                print(f"   Error args: {e.args}")
                for i, arg in enumerate(e.args):
                    print(f"     Arg {i}: {arg}")
            
            import traceback
            traceback.print_exc()
            return None
    
    def admin_update(self, table_name: str, item_id: str, data: Dict[str, Any], id_column: str = "id") -> Optional[Dict[str, Any]]:
        """Update a row (admin)."""
        if not self.client:
            return None
        try:
            response = (
                self.client.table(table_name)
                .update(data)
                .eq(id_column, item_id)
                .execute()
            )
            if response.data:
                item = response.data[0] if isinstance(response.data, list) else response.data
                # Convert timestamps
                for key in ["created_at", "updated_at"]:
                    if key in item and item[key]:
                        try:
                            if not isinstance(item[key], str):
                                item[key] = item[key].isoformat()
                        except:
                            pass
                return item
            return None
        except Exception as e:
            print(f"Error updating {table_name} in Supabase: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def admin_delete(self, table_name: str, item_id: str, id_column: str = "id") -> bool:
        """Delete a row (admin)."""
        if not self.client:
            return False
        try:
            response = (
                self.client.table(table_name)
                .delete()
                .eq(id_column, item_id)
                .execute()
            )
            # Supabase returns the deleted row(s) in response.data
            return response.data is not None and len(response.data) > 0
        except Exception as e:
            print(f"Error deleting from {table_name} in Supabase: {e}")
            return False


# Global service instance
supabase_service = SupabaseService()

