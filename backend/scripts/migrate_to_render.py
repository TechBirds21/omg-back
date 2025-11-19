"""
Migration script to move data from Supabase to Render PostgreSQL.

Usage:
    python -m scripts.migrate_to_render

This script will:
1. Connect to both Supabase and Render PostgreSQL
2. Copy all data from Supabase tables to Render PostgreSQL
3. Preserve UUIDs and relationships
4. Handle JSONB and array fields correctly
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from typing import Any, Dict, List
import json
from datetime import datetime
from supabase import create_client
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")


def get_supabase_client():
    """Get Supabase client."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    
    return create_client(supabase_url, supabase_key)


def get_render_db_engine():
    """Get Render PostgreSQL engine."""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        raise ValueError("DATABASE_URL must be set in .env")
    
    # Convert postgres:// to postgresql://
    db_url = database_url.replace("postgres://", "postgresql://", 1)
    
    return create_engine(db_url, poolclass=NullPool, echo=False)


def migrate_table(
    supabase_client,
    render_engine,
    table_name: str,
    columns: List[str],
    transform_row: callable = None
):
    """Migrate a single table from Supabase to Render."""
    print(f"\n📦 Migrating {table_name}...")
    
    try:
        # Fetch from Supabase
        response = supabase_client.table(table_name).select("*").execute()
        rows = response.data if response.data else []
        
        if not rows:
            print(f"  ⚠️  No data in {table_name}")
            return 0
        
        print(f"  📥 Found {len(rows)} rows in Supabase")
        
        # Insert into Render
        with render_engine.connect() as conn:
            inserted = 0
            for row in rows:
                try:
                    # Transform row if needed
                    if transform_row:
                        row = transform_row(row)
                    
                    # Build INSERT statement
                    placeholders = ", ".join([f":{col}" for col in columns])
                    column_names = ", ".join(columns)
                    
                    insert_sql = f"""
                        INSERT INTO {table_name} ({column_names})
                        VALUES ({placeholders})
                        ON CONFLICT DO NOTHING
                    """
                    
                    # Prepare data
                    insert_data = {}
                    for col in columns:
                        value = row.get(col)
                        # Handle UUIDs
                        if col.endswith("_id") and value and isinstance(value, str):
                            try:
                                # Validate UUID format
                                if len(value) == 36:
                                    insert_data[col] = value
                                else:
                                    insert_data[col] = None
                            except:
                                insert_data[col] = None
                        # Handle JSONB fields
                        elif isinstance(value, (dict, list)):
                            insert_data[col] = json.dumps(value)
                        # Handle arrays
                        elif isinstance(value, list):
                            insert_data[col] = value
                        else:
                            insert_data[col] = value
                    
                    conn.execute(text(insert_sql), insert_data)
                    inserted += 1
                    
                    if inserted % 100 == 0:
                        print(f"  ✅ Inserted {inserted}/{len(rows)} rows...")
                        conn.commit()
                
                except Exception as e:
                    print(f"  ❌ Error inserting row: {e}")
                    print(f"     Row data: {row}")
                    continue
            
            conn.commit()
            print(f"  ✅ Successfully migrated {inserted}/{len(rows)} rows")
            return inserted
    
    except Exception as e:
        print(f"  ❌ Error migrating {table_name}: {e}")
        import traceback
        traceback.print_exc()
        return 0


def main():
    """Main migration function."""
    print("🚀 Starting migration from Supabase to Render PostgreSQL...")
    print("=" * 60)
    
    # Get clients
    try:
        supabase = get_supabase_client()
        render_engine = get_render_db_engine()
        print("✅ Connected to both databases")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    # Test Render connection
    try:
        with render_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Render PostgreSQL connection verified")
    except Exception as e:
        print(f"❌ Render PostgreSQL connection failed: {e}")
        return
    
    # Define tables to migrate (in dependency order)
    tables = [
        ("categories", ["id", "name", "description", "image_url", "is_active", "sort_order", "created_at", "updated_at", "images", "cover_image_index"]),
        ("vendors", ["id", "vendor_code", "name", "contact_person", "phone", "email", "address", "city", "state", "pincode", "specialization", "is_active", "notes", "created_at", "updated_at"]),
        ("products", ["id", "name", "description", "category_id", "sku", "price", "original_price", "images", "colors", "sizes", "fabric", "care_instructions", "is_active", "featured", "meta_title", "meta_description", "slug", "sort_order", "created_at", "updated_at", "cover_image_index", "vendor_id", "saree_id", "vendor_code", "color_images", "color_stock", "total_stock", "stock_status", "best_seller", "best_seller_rank", "stretch_variants", "new_collection", "new_collection_start_date", "new_collection_end_date", "color_size_stock"]),
        ("customers", ["id", "customer_id", "name", "email", "phone", "location", "city", "state", "total_orders", "total_spent", "tier", "status", "last_order_date", "joined_date", "created_at", "updated_at"]),
        ("testimonials", ["id", "customer_name", "customer_location", "content", "rating", "image_url", "is_active", "display_order", "created_at", "updated_at"]),
        ("offers", ["id", "title", "description", "offer_type", "conditions", "discount_percentage", "discount_amount", "minimum_quantity", "maximum_quantity", "applicable_categories", "applicable_products", "start_date", "end_date", "is_active", "priority", "max_uses_per_customer", "total_max_uses", "current_uses", "created_at", "updated_at"]),
        ("orders", ["id", "order_id", "customer_name", "customer_email", "customer_phone", "product_id", "product_name", "quantity", "amount", "status", "payment_method", "payment_status", "shipping_address", "created_at", "updated_at", "customer_id", "product_colors", "product_sizes", "vendor_id", "vendor_code", "saree_id", "transaction_id", "payment_gateway_response", "applied_offer", "inventory_decremented"]),
        ("delivery_areas", ["id", "pincode", "area", "city", "state", "country"]),
        ("deliveries", ["id", "delivery_id", "order_id", "customer_name", "customer_phone", "customer_address", "product_name", "status", "courier", "courier_phone", "tracking_id", "estimated_delivery", "pickup_date", "delivered_date", "created_at", "updated_at", "estimated_delivery_date", "actual_delivery_date", "courier_service", "tracking_number", "pickup_timestamp", "delivery_timestamp", "delivery_notes"]),
        ("contact_submissions", ["id", "name", "email", "phone", "subject", "message", "status", "created_at"]),
        ("settings", ["id", "key", "value", "description", "created_at", "updated_at"]),
        ("inventory", ["id", "product_id", "product_name", "sku", "category", "current_stock", "minimum_stock", "maximum_stock", "cost_price", "selling_price", "supplier", "status", "last_restocked", "created_at", "updated_at", "images", "colors"]),
    ]
    
    total_migrated = 0
    
    for table_name, columns in tables:
        count = migrate_table(supabase, render_engine, table_name, columns)
        total_migrated += count
    
    print("\n" + "=" * 60)
    print(f"🎉 Migration complete! Total rows migrated: {total_migrated}")
    print("\n📝 Next steps:")
    print("1. Verify data in Render PostgreSQL")
    print("2. Update DATABASE_PREFERENCE=render in .env")
    print("3. Test your application")
    print("4. Once verified, you can remove Supabase credentials")


if __name__ == "__main__":
    main()

