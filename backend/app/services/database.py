"""Database service for Render PostgreSQL using SQLAlchemy."""

from typing import Any, Dict, List, Optional
from datetime import datetime
import json

from sqlalchemy import create_engine, text, select, func, or_, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

from ..config import get_settings


class DatabaseService:
    """Service for interacting with Render PostgreSQL database."""
    
    def __init__(self) -> None:
        settings = get_settings()
        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self.AsyncSessionLocal = None
        
        if settings.database_url:
            # Convert postgres:// to postgresql:// for SQLAlchemy
            db_url = settings.database_url.replace("postgres://", "postgresql://", 1)
            
            # Create sync engine for migrations and simple queries
            self.engine = create_engine(
                db_url,
                poolclass=NullPool,
                echo=False
            )
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
            # Create async engine for async operations
            async_db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            self.async_engine = create_async_engine(
                async_db_url,
                poolclass=NullPool,
                echo=False
            )
            self.AsyncSessionLocal = async_sessionmaker(
                self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
    
    def is_available(self) -> bool:
        """Check if database connection is available."""
        return self.engine is not None
    
    def get_session(self) -> Session:
        """Get a synchronous database session."""
        if not self.SessionLocal:
            raise RuntimeError("Database not configured. Set DATABASE_URL environment variable.")
        return self.SessionLocal()
    
    async def get_async_session(self):
        """Get an asynchronous database session (generator)."""
        if not self.AsyncSessionLocal:
            raise RuntimeError("Database not configured. Set DATABASE_URL environment variable.")
        async with self.AsyncSessionLocal() as session:
            yield session
    
    def test_connection(self) -> bool:
        """Test database connection."""
        if not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            print(f"Database connection test failed: {e}")
            return False
    
    # Products methods
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
        """Get products with filters."""
        if not self.engine:
            return []
        
        try:
            with self.get_session() as session:
                # Build query dynamically based on provided filters
                conditions = []
                params = {}
                
                # Always filter by is_active if specified
                if is_active is not None:
                    conditions.append("is_active = :is_active")
                    params["is_active"] = is_active
                
                if featured is not None:
                    conditions.append("featured = :featured")
                    params["featured"] = featured
                
                if new_collection is not None:
                    conditions.append("new_collection = :new_collection")
                    params["new_collection"] = new_collection
                
                if best_seller is not None:
                    conditions.append("best_seller = :best_seller")
                    params["best_seller"] = best_seller
                
                if category_id:
                    conditions.append("category_id = :category_id::uuid")
                    params["category_id"] = category_id
                
                if search:
                    conditions.append("(name ILIKE :search_pattern OR description ILIKE :search_pattern)")
                    params["search_pattern"] = f"%{search}%"
                
                where_clause = " AND ".join(conditions) if conditions else "1=1"
                limit_value = limit if limit else 1000
                
                query_str = f"""
                    SELECT * FROM products
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT :limit
                """
                
                params["limit"] = limit_value
                query = text(query_str)
                
                result = session.execute(query, params)
                rows = result.fetchall()
                
                products = []
                for row in rows:
                    product_dict = dict(row._mapping)
                    # Convert UUIDs and other types to strings
                    if product_dict.get("id"):
                        product_dict["id"] = str(product_dict["id"])
                    if product_dict.get("category_id"):
                        product_dict["category_id"] = str(product_dict["category_id"])
                    if product_dict.get("vendor_id"):
                        product_dict["vendor_id"] = str(product_dict["vendor_id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at", "new_collection_start_date", "new_collection_end_date"]:
                        if product_dict.get(key) and isinstance(product_dict[key], datetime):
                            product_dict[key] = product_dict[key].isoformat()
                    products.append(product_dict)
                
                return products
        except Exception as e:
            print(f"Error fetching products from database: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get a single product by ID."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                query = text("SELECT * FROM products WHERE id = :id::uuid AND is_active = true")
                result = session.execute(query, {"id": product_id})
                row = result.fetchone()
                if row:
                    product = dict(row._mapping)
                    # Convert types
                    if product.get("id"):
                        product["id"] = str(product["id"])
                    if product.get("category_id"):
                        product["category_id"] = str(product["category_id"])
                    if product.get("vendor_id"):
                        product["vendor_id"] = str(product["vendor_id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at", "new_collection_start_date", "new_collection_end_date"]:
                        if product.get(key) and isinstance(product[key], datetime):
                            product[key] = product[key].isoformat()
                    return product
                return None
        except Exception as e:
            print(f"Error fetching product by ID: {e}")
            return None
    
    def get_product_by_name(self, product_name: str) -> Optional[Dict[str, Any]]:
        """Get a product by name."""
        if not self.engine:
            return None
        try:
            decoded_name = product_name.replace("+", " ")
            with self.get_session() as session:
                query = text("SELECT * FROM products WHERE name ILIKE :name AND is_active = true LIMIT 1")
                result = session.execute(query, {"name": decoded_name})
                row = result.fetchone()
                if row:
                    product = dict(row._mapping)
                    # Convert types
                    if product.get("id"):
                        product["id"] = str(product["id"])
                    if product.get("category_id"):
                        product["category_id"] = str(product["category_id"])
                    if product.get("vendor_id"):
                        product["vendor_id"] = str(product["vendor_id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at", "new_collection_start_date", "new_collection_end_date"]:
                        if product.get(key) and isinstance(product[key], datetime):
                            product[key] = product[key].isoformat()
                    return product
                return None
        except Exception as e:
            print(f"Error fetching product by name: {e}")
            return None
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get all active categories."""
        if not self.engine:
            return []
        try:
            with self.get_session() as session:
                query = text("""
                    SELECT * FROM categories
                    WHERE is_active = true
                    ORDER BY sort_order ASC, created_at DESC
                """)
                result = session.execute(query)
                rows = result.fetchall()
                
                categories = []
                for row in rows:
                    cat = dict(row._mapping)
                    if cat.get("id"):
                        cat["id"] = str(cat["id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if cat.get(key) and isinstance(cat[key], datetime):
                            cat[key] = cat[key].isoformat()
                    categories.append(cat)
                
                return categories
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return []
    
    def get_testimonials(self) -> List[Dict[str, Any]]:
        """Get active testimonials."""
        if not self.engine:
            return []
        try:
            with self.get_session() as session:
                query = text("""
                    SELECT * FROM testimonials
                    WHERE is_active = true
                    ORDER BY display_order ASC
                """)
                result = session.execute(query)
                rows = result.fetchall()
                
                testimonials = []
                for row in rows:
                    testimonial = dict(row._mapping)
                    if testimonial.get("id"):
                        testimonial["id"] = str(testimonial["id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if testimonial.get(key) and isinstance(testimonial[key], datetime):
                            testimonial[key] = testimonial[key].isoformat()
                    testimonials.append(testimonial)
                
                return testimonials
        except Exception as e:
            print(f"Error fetching testimonials: {e}")
            return []
    
    def get_offers(self, is_active: bool = True) -> List[Dict[str, Any]]:
        """Get active offers."""
        if not self.engine:
            return []
        try:
            today = datetime.utcnow().isoformat()
            with self.get_session() as session:
                # Build query with proper conditions
                conditions = []
                params = {}
                
                if is_active is not None:
                    conditions.append("is_active = :is_active")
                    params["is_active"] = is_active
                
                conditions.append("(start_date IS NULL OR start_date <= :today)")
                conditions.append("(end_date IS NULL OR end_date >= :today)")
                params["today"] = today
                
                where_clause = " AND ".join(conditions)
                
                query_str = f"""
                    SELECT * FROM offers
                    WHERE {where_clause}
                    ORDER BY priority DESC
                """
                
                query = text(query_str)
                result = session.execute(query, params)
                rows = result.fetchall()
                
                offers = []
                for row in rows:
                    offer = dict(row._mapping)
                    if offer.get("id"):
                        offer["id"] = str(offer["id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at", "start_date", "end_date"]:
                        if offer.get(key) and isinstance(offer[key], datetime):
                            offer[key] = offer[key].isoformat()
                    offers.append(offer)
                
                return offers
        except Exception as e:
            print(f"Error fetching offers: {e}")
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
        """Get settings from database."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                query = text("SELECT key, value FROM settings")
                result = session.execute(query)
                rows = result.fetchall()
                
                settings_dict = {}
                for row in rows:
                    key = row.key
                    value = row.value
                    if key and value:
                        # value is already JSONB, so it should be a dict/list
                        settings_dict[key] = value
                
                # Ensure brand has logo_url if not present
                if "brand" in settings_dict and isinstance(settings_dict["brand"], dict):
                    brand = settings_dict["brand"]
                    if "logo_url" not in brand or not brand.get("logo_url"):
                        seo = settings_dict.get("seo", {})
                        if isinstance(seo, dict) and seo.get("default_image"):
                            brand["logo_url"] = seo["default_image"]
                        elif not brand.get("logo_url"):
                            brand["logo_url"] = None
                
                return settings_dict
        except Exception as e:
            print(f"Error fetching settings: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_order(self, order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create an order in database."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                # Convert UUID strings to UUID objects if needed
                insert_query = text("""
                    INSERT INTO orders (
                        order_id, customer_name, customer_email, customer_phone,
                        product_id, product_name, quantity, amount, status,
                        payment_method, payment_status, shipping_address,
                        customer_id, product_colors, product_sizes, vendor_id,
                        vendor_code, saree_id, transaction_id, payment_gateway_response,
                        applied_offer
                    ) VALUES (
                        :order_id, :customer_name, :customer_email, :customer_phone,
                        :product_id::uuid, :product_name, :quantity, :amount, :status,
                        :payment_method, :payment_status, :shipping_address,
                        :customer_id::uuid, :product_colors, :product_sizes, :vendor_id::uuid,
                        :vendor_code, :saree_id, :transaction_id, :payment_gateway_response::jsonb,
                        :applied_offer::jsonb
                    ) RETURNING *
                """)
                
                result = session.execute(insert_query, order_data)
                session.commit()
                row = result.fetchone()
                if row:
                    order = dict(row._mapping)
                    # Convert types
                    if order.get("id"):
                        order["id"] = str(order["id"])
                    if order.get("product_id"):
                        order["product_id"] = str(order["product_id"])
                    if order.get("customer_id"):
                        order["customer_id"] = str(order["customer_id"])
                    if order.get("vendor_id"):
                        order["vendor_id"] = str(order["vendor_id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if order.get(key) and isinstance(order[key], datetime):
                            order[key] = order[key].isoformat()
                    return order
                return None
        except Exception as e:
            print(f"Error creating order: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_orders_by_email(self, email: str) -> List[Dict[str, Any]]:
        """Get orders by customer email."""
        if not self.engine:
            return []
        try:
            with self.get_session() as session:
                query = text("""
                    SELECT * FROM orders
                    WHERE customer_email = :email
                    ORDER BY created_at DESC
                """)
                result = session.execute(query, {"email": email})
                rows = result.fetchall()
                
                orders = []
                for row in rows:
                    order = dict(row._mapping)
                    # Convert types
                    if order.get("id"):
                        order["id"] = str(order["id"])
                    if order.get("product_id"):
                        order["product_id"] = str(order["product_id"])
                    if order.get("customer_id"):
                        order["customer_id"] = str(order["customer_id"])
                    if order.get("vendor_id"):
                        order["vendor_id"] = str(order["vendor_id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if order.get(key) and isinstance(order[key], datetime):
                            order[key] = order[key].isoformat()
                    orders.append(order)
                
                return orders
        except Exception as e:
            print(f"Error fetching orders: {e}")
            return []
    
    def get_orders_by_customer(self, email: Optional[str] = None, phone: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get orders by customer email or phone."""
        if not self.engine:
            return []
        try:
            with self.get_session() as session:
                if email:
                    query = text("""
                        SELECT * FROM orders
                        WHERE customer_email = :email
                        ORDER BY created_at DESC
                    """)
                    result = session.execute(query, {"email": email})
                elif phone:
                    clean_phone = phone.replace(" ", "").replace("-", "").replace("+", "")
                    query = text("""
                        SELECT * FROM orders
                        WHERE customer_phone ILIKE :phone
                        ORDER BY created_at DESC
                    """)
                    result = session.execute(query, {"phone": f"%{clean_phone}%"})
                else:
                    return []
                
                rows = result.fetchall()
                orders = []
                for row in rows:
                    order = dict(row._mapping)
                    # Convert types
                    if order.get("id"):
                        order["id"] = str(order["id"])
                    if order.get("product_id"):
                        order["product_id"] = str(order["product_id"])
                    if order.get("customer_id"):
                        order["customer_id"] = str(order["customer_id"])
                    if order.get("vendor_id"):
                        order["vendor_id"] = str(order["vendor_id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if order.get(key) and isinstance(order[key], datetime):
                            order[key] = order[key].isoformat()
                    orders.append(order)
                
                return orders
        except Exception as e:
            print(f"Error fetching orders: {e}")
            return []
    
    def get_order_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get order by order_id (merchant order ID)."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                query = text("SELECT * FROM orders WHERE order_id = :order_id")
                result = session.execute(query, {"order_id": order_id})
                row = result.fetchone()
                if row:
                    order = dict(row._mapping)
                    # Convert types
                    if order.get("id"):
                        order["id"] = str(order["id"])
                    if order.get("product_id"):
                        order["product_id"] = str(order["product_id"])
                    if order.get("customer_id"):
                        order["customer_id"] = str(order["customer_id"])
                    if order.get("vendor_id"):
                        order["vendor_id"] = str(order["vendor_id"])
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if order.get(key) and isinstance(order[key], datetime):
                            order[key] = order[key].isoformat()
                    return order
                return None
        except Exception as e:
            print(f"Error fetching order: {e}")
            return None
    
    def get_complete_order_for_invoice(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get complete order data with product information for invoice generation."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                # Try by order_id first
                query = text("""
                    SELECT o.*, 
                           p.id as product_id, p.name as product_name, p.images, 
                           p.cover_image_index, p.colors, p.color_images, p.saree_id,
                           v.id as vendor_id, v.name as vendor_name, v.vendor_code
                    FROM orders o
                    LEFT JOIN products p ON o.product_id = p.id
                    LEFT JOIN vendors v ON o.vendor_id = v.id
                    WHERE o.order_id = :order_id
                    LIMIT 1
                """)
                result = session.execute(query, {"order_id": order_id})
                row = result.fetchone()
                
                if not row:
                    # Try by UUID
                    query = text("""
                        SELECT o.*, 
                               p.id as product_id, p.name as product_name, p.images, 
                               p.cover_image_index, p.colors, p.color_images, p.saree_id,
                               v.id as vendor_id, v.name as vendor_name, v.vendor_code
                        FROM orders o
                        LEFT JOIN products p ON o.product_id = p.id
                        LEFT JOIN vendors v ON o.vendor_id = v.id
                        WHERE o.id = :order_id::uuid
                        LIMIT 1
                    """)
                    result = session.execute(query, {"order_id": order_id})
                    row = result.fetchone()
                
                if row:
                    order = dict(row._mapping)
                    # Convert types
                    if order.get("id"):
                        order["id"] = str(order["id"])
                    if order.get("product_id"):
                        order["product_id"] = str(order["product_id"])
                    if order.get("customer_id"):
                        order["customer_id"] = str(order["customer_id"])
                    if order.get("vendor_id"):
                        order["vendor_id"] = str(order["vendor_id"])
                    
                    # Format product data
                    if order.get("product_name"):
                        order["product"] = {
                            "id": order.get("product_id"),
                            "name": order.get("product_name"),
                            "images": order.get("images"),
                            "cover_image_index": order.get("cover_image_index"),
                            "colors": order.get("colors"),
                            "color_images": order.get("color_images"),
                            "saree_id": order.get("saree_id")
                        }
                    
                    # Format vendor data
                    if order.get("vendor_name"):
                        order["vendor"] = {
                            "id": order.get("vendor_id"),
                            "name": order.get("vendor_name"),
                            "vendor_code": order.get("vendor_code")
                        }
                    
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if order.get(key) and isinstance(order[key], datetime):
                            order[key] = order[key].isoformat()
                    
                    return order
                return None
        except Exception as e:
            print(f"Error fetching complete order: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_pincode_details(self, pincode: str) -> Optional[Dict[str, Any]]:
        """Get pincode delivery details."""
        if not self.engine:
            return None
        try:
            clean_pincode = ''.join(filter(str.isdigit, pincode))
            if not clean_pincode:
                return None
            
            with self.get_session() as session:
                try:
                    pincode_int = int(clean_pincode)
                    query = text("SELECT * FROM delivery_areas WHERE pincode = :pincode LIMIT 1")
                    result = session.execute(query, {"pincode": pincode_int})
                except ValueError:
                    query = text("SELECT * FROM delivery_areas WHERE pincode::text = :pincode LIMIT 1")
                    result = session.execute(query, {"pincode": clean_pincode})
                
                row = result.fetchone()
                if row:
                    data = dict(row._mapping)
                    return {
                        "pincode": str(data.get("pincode", clean_pincode)),
                        "area": data.get("area") or data.get("area_name") or "",
                        "city": data.get("city") or "",
                        "state": data.get("state") or "",
                        "country": data.get("country") or "India",
                    }
                return None
        except Exception as e:
            print(f"Error fetching pincode: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_contact_submission(self, submission_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a contact submission."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                query = text("""
                    INSERT INTO contact_submissions (name, email, phone, subject, message, status)
                    VALUES (:name, :email, :phone, :subject, :message, :status)
                    RETURNING *
                """)
                result = session.execute(query, submission_data)
                session.commit()
                row = result.fetchone()
                if row:
                    submission = dict(row._mapping)
                    if submission.get("id"):
                        submission["id"] = str(submission["id"])
                    # Convert timestamps
                    if submission.get("created_at") and isinstance(submission["created_at"], datetime):
                        submission["created_at"] = submission["created_at"].isoformat()
                    return submission
                return None
        except Exception as e:
            print(f"Error creating contact submission: {e}")
            import traceback
            traceback.print_exc()
            return None


    # Admin operations - Generic CRUD methods
    def admin_get_all(self, table_name: str, order_by: str = "created_at", desc: bool = True, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get all rows from a table (admin)."""
        if not self.engine:
            return []
        try:
            with self.get_session() as session:
                query = f"SELECT * FROM {table_name}"
                params = {}
                
                if filters:
                    conditions = []
                    for key, value in filters.items():
                        if value is not None:
                            conditions.append(f"{key} = :{key}")
                            params[key] = value
                    if conditions:
                        query += " WHERE " + " AND ".join(conditions)
                
                query += f" ORDER BY {order_by} {'DESC' if desc else 'ASC'}"
                
                result = session.execute(text(query), params)
                rows = result.fetchall()
                
                items = []
                for row in rows:
                    item = dict(row._mapping)
                    # Convert UUIDs
                    for key in item.keys():
                        if key.endswith("_id") and item[key] and isinstance(item[key], str):
                            if len(item[key]) == 36:  # UUID format
                                pass  # Keep as string
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if item.get(key) and isinstance(item[key], datetime):
                            item[key] = item[key].isoformat()
                    items.append(item)
                
                return items
        except Exception as e:
            print(f"Error fetching from {table_name}: {e}")
            return []
    
    def admin_get_by_id(self, table_name: str, item_id: str, id_column: str = "id") -> Optional[Dict[str, Any]]:
        """Get a single row by ID (admin)."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                query = text(f"SELECT * FROM {table_name} WHERE {id_column} = :id")
                result = session.execute(query, {"id": item_id})
                row = result.fetchone()
                if row:
                    item = dict(row._mapping)
                    # Convert UUIDs
                    for key in item.keys():
                        if key.endswith("_id") and item[key]:
                            if isinstance(item[key], str) and len(item[key]) == 36:
                                pass  # Keep as string
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if item.get(key) and isinstance(item[key], datetime):
                            item[key] = item[key].isoformat()
                    return item
                return None
        except Exception as e:
            print(f"Error fetching {table_name} by ID: {e}")
            return None
    
    def admin_create(self, table_name: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new row (admin)."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                # Prepare columns and values
                columns = list(data.keys())
                placeholders = ", ".join([f":{col}" for col in columns])
                column_names = ", ".join(columns)
                
                # Handle arrays
                array_columns = {}
                for col, value in list(data.items()):
                    if isinstance(value, list):
                        array_columns[col] = value
                        idx = columns.index(col)
                        if len(value) == 0:
                            placeholders = placeholders.replace(f":{col}", "ARRAY[]::text[]", 1)
                        else:
                            array_strs = []
                            for v in value:
                                if v is None:
                                    continue
                                v_escaped = str(v).replace("'", "''").replace("\\", "\\\\")
                                array_strs.append(f"'{v_escaped}'")
                            placeholders = placeholders.replace(f":{col}", f"ARRAY[{','.join(array_strs)}]", 1)
                        del data[col]
                
                query = text(f"""
                    INSERT INTO {table_name} ({column_names})
                    VALUES ({placeholders})
                    RETURNING *
                """)
                
                result = session.execute(query, data)
                session.commit()
                row = result.fetchone()
                if row:
                    item = dict(row._mapping)
                    # Convert UUIDs
                    for key in item.keys():
                        if key.endswith("_id") and item[key]:
                            if isinstance(item[key], str) and len(item[key]) == 36:
                                pass
                    # Convert timestamps
                    for key in ["created_at", "updated_at"]:
                        if item.get(key) and isinstance(item[key], datetime):
                            item[key] = item[key].isoformat()
                    return item
                return None
        except Exception as e:
            print(f"Error creating in {table_name}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def admin_update(self, table_name: str, item_id: str, data: Dict[str, Any], id_column: str = "id") -> Optional[Dict[str, Any]]:
        """Update a row (admin)."""
        if not self.engine:
            return None
        try:
            with self.get_session() as session:
                # Prepare update set
                updates = []
                params = {"id": item_id}
                
                for col, value in data.items():
                    if isinstance(value, list):
                        # Handle arrays
                        if len(value) == 0:
                            updates.append(f"{col} = ARRAY[]::text[]")
                        else:
                            array_strs = []
                            for v in value:
                                if v is None:
                                    continue
                                v_escaped = str(v).replace("'", "''").replace("\\", "\\\\")
                                array_strs.append(f"'{v_escaped}'")
                            updates.append(f"{col} = ARRAY[{','.join(array_strs)}]")
                    else:
                        updates.append(f"{col} = :{col}")
                        params[col] = value
                
                if not updates:
                    return self.admin_get_by_id(table_name, item_id, id_column)
                
                set_clause = ", ".join(updates)
                query = text(f"""
                    UPDATE {table_name}
                    SET {set_clause}, updated_at = NOW()
                    WHERE {id_column} = :id
                    RETURNING *
                """)
                
                result = session.execute(query, params)
                session.commit()
                row = result.fetchone()
                if row:
                    item = dict(row._mapping)
                    # Convert UUIDs and timestamps
                    for key in item.keys():
                        if key.endswith("_id") and item[key] and isinstance(item[key], str) and len(item[key]) == 36:
                            pass
                        if key in ["created_at", "updated_at"] and isinstance(item[key], datetime):
                            item[key] = item[key].isoformat()
                    return item
                return None
        except Exception as e:
            print(f"Error updating {table_name}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def admin_delete(self, table_name: str, item_id: str, id_column: str = "id") -> bool:
        """Delete a row (admin)."""
        if not self.engine:
            return False
        try:
            with self.get_session() as session:
                query = text(f"DELETE FROM {table_name} WHERE {id_column} = :id")
                result = session.execute(query, {"id": item_id})
                session.commit()
                return result.rowcount > 0
        except Exception as e:
            print(f"Error deleting from {table_name}: {e}")
            return False


# Global service instance
database_service = DatabaseService()

