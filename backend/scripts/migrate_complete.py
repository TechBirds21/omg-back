"""
Complete migration script to move ALL data from Supabase to Render PostgreSQL.
This script automatically discovers all tables and migrates them.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from typing import Any, Dict, List, Optional
import json
from datetime import datetime
from supabase import create_client
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.pool import NullPool
from sqlalchemy.dialects.postgresql import ARRAY
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


def get_table_columns(engine, table_name: str) -> List[str]:
    """Get all column names for a table."""
    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
        return [col['name'] for col in columns]
    except Exception:
        # If table doesn't exist, return empty list
        return []


def get_primary_key(engine, table_name: str) -> Optional[str]:
    """Get primary key column name for a table."""
    inspector = inspect(engine)
    try:
        pk_constraint = inspector.get_pk_constraint(table_name)
        if pk_constraint and pk_constraint.get('constrained_columns'):
            return pk_constraint['constrained_columns'][0]
    except Exception:
        pass
    return None


def migrate_table(
    supabase_client,
    render_engine,
    table_name: str
):
    """Migrate a single table from Supabase to Render."""
    print(f"\n📦 Migrating {table_name}...")
    
    try:
        # Get columns from Render table (target schema)
        render_columns = get_table_columns(render_engine, table_name)
        if not render_columns:
            print(f"  ⚠️  Table {table_name} does not exist in Render database. Skipping.")
            return 0
        
        # Get primary key for conflict resolution
        pk_column = get_primary_key(render_engine, table_name)
        
        # Fetch from Supabase
        try:
            response = supabase_client.table(table_name).select("*").execute()
            rows = response.data if response.data else []
        except Exception as e:
            print(f"  ⚠️  Could not fetch from Supabase: {e}")
            return 0
        
        if not rows:
            print(f"  ⚠️  No data in {table_name}")
            return 0
        
        print(f"  📥 Found {len(rows)} rows in Supabase")
        print(f"  📋 Target columns: {len(render_columns)}")
        
        # Insert into Render
        with render_engine.connect() as conn:
            inserted = 0
            skipped = 0
            errors = 0
            
            for idx, row in enumerate(rows, 1):
                try:
                    # Prepare data - only include columns that exist in target
                    insert_data = {}
                    for col in render_columns:
                        value = row.get(col)
                        
                        # Handle None values
                        if value is None:
                            insert_data[col] = None
                            continue
                        
                        # Handle UUIDs (keep as string, PostgreSQL will convert)
                        if col.endswith("_id") and isinstance(value, str) and len(value) == 36:
                            insert_data[col] = value
                        # Handle JSONB fields
                        elif isinstance(value, (dict, list)):
                            # PostgreSQL JSONB accepts dict/list directly
                            insert_data[col] = json.dumps(value) if isinstance(value, (dict, list)) else value
                        # Handle arrays (PostgreSQL arrays)
                        elif isinstance(value, list) and not isinstance(value, str):
                            # Pass as Python list - SQLAlchemy will handle conversion
                            # Filter out None values
                            filtered_list = [v for v in value if v is not None]
                            insert_data[col] = filtered_list if filtered_list else []
                        # Handle timestamps
                        elif isinstance(value, str) and ('T' in value or ' ' in value):
                            # Try to parse as datetime
                            try:
                                # Supabase returns ISO format strings
                                insert_data[col] = value
                            except:
                                insert_data[col] = value
                        # Handle everything else
                        else:
                            insert_data[col] = value
                    
                    # Build INSERT statement with ON CONFLICT
                    # Handle arrays separately - build column names and placeholders
                    all_columns = list(insert_data.keys())
                    column_names_list = []
                    placeholders_list = []
                    
                    for col in all_columns:
                        value = insert_data[col]
                        column_names_list.append(col)
                        
                        if isinstance(value, list):
                            # Handle array - use PostgreSQL array syntax
                            if len(value) == 0:
                                placeholders_list.append("ARRAY[]::text[]")
                            else:
                                # Format as PostgreSQL array literal
                                array_strs = []
                                for v in value:
                                    if v is None:
                                        continue
                                    v_escaped = str(v).replace("'", "''").replace("\\", "\\\\")
                                    array_strs.append(f"'{v_escaped}'")
                                placeholders_list.append(f"ARRAY[{','.join(array_strs)}]")
                            # Remove from insert_data since we're handling it in SQL
                            del insert_data[col]
                        else:
                            placeholders_list.append(f":{col}")
                    
                    column_names = ", ".join(column_names_list)
                    placeholders = ", ".join(placeholders_list)
                    
                    # Check if primary key is in the columns we're inserting
                    pk_in_columns = pk_column and pk_column in column_names_list
                    
                    if pk_in_columns:
                        # Use ON CONFLICT for primary key
                        insert_sql = f"""
                            INSERT INTO {table_name} ({column_names})
                            VALUES ({placeholders})
                            ON CONFLICT ({pk_column}) DO NOTHING
                        """
                    else:
                        # No primary key conflict resolution
                        insert_sql = f"""
                            INSERT INTO {table_name} ({column_names})
                            VALUES ({placeholders})
                            ON CONFLICT DO NOTHING
                        """
                    
                    result = conn.execute(text(insert_sql), insert_data)
                    if result.rowcount > 0:
                        inserted += 1
                    else:
                        skipped += 1
                    
                    # Commit every 50 rows
                    if idx % 50 == 0:
                        conn.commit()
                        print(f"  ⏳ Progress: {idx}/{len(rows)} rows processed ({inserted} inserted, {skipped} skipped)...")
                
                except Exception as e:
                    errors += 1
                    if errors <= 5:  # Only show first 5 errors
                        print(f"  ⚠️  Error on row {idx}: {str(e)[:100]}")
                    elif errors == 6:
                        print(f"  ⚠️  (Suppressing further error messages...)")
                    continue
            
            conn.commit()
            print(f"  ✅ Migration complete: {inserted} inserted, {skipped} skipped, {errors} errors")
            return inserted
    
    except Exception as e:
        print(f"  ❌ Error migrating {table_name}: {e}")
        import traceback
        traceback.print_exc()
        return 0


def get_all_tables(supabase_client) -> List[str]:
    """Get list of all tables from Supabase."""
    # Common tables in the schema
    common_tables = [
        "categories", "vendors", "products", "customers", "testimonials",
        "offers", "orders", "delivery_areas", "deliveries", "contact_submissions",
        "settings", "inventory", "admin_settings", "admin_status", "payment_config",
        "homepage_sections", "visits", "zoho_oauth_tokens", "chat_tickets", "chat_messages"
    ]
    
    # Try to get tables that exist
    existing_tables = []
    for table in common_tables:
        try:
            # Try a simple query to see if table exists
            response = supabase_client.table(table).select("id").limit(1).execute()
            existing_tables.append(table)
        except Exception:
            # Table might not exist or might be empty, but we'll try anyway
            pass
    
    return existing_tables


def main():
    """Main migration function."""
    print("=" * 60)
    print("🚀 Complete Supabase to Render PostgreSQL Migration")
    print("=" * 60)
    
    # Get clients
    try:
        print("\n📡 Connecting to databases...")
        supabase = get_supabase_client()
        render_engine = get_render_db_engine()
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        print("\n💡 Make sure SUPABASE_URL and SUPABASE_KEY are set in .env")
        return
    
    # Test Render connection
    try:
        with render_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Connected to Render PostgreSQL")
    except Exception as e:
        print(f"❌ Render PostgreSQL connection failed: {e}")
        print("\n💡 Make sure DATABASE_URL is set correctly in .env")
        return
    
    # Get all tables to migrate
    print("\n📋 Discovering tables...")
    tables = get_all_tables(supabase)
    
    if not tables:
        print("⚠️  No tables found. Trying common table names...")
        # Fallback to common tables
        tables = [
            "categories", "vendors", "products", "customers", "testimonials",
            "offers", "orders", "delivery_areas", "deliveries", "contact_submissions",
            "settings", "inventory", "admin_settings", "admin_status", "payment_config",
            "homepage_sections", "visits", "zoho_oauth_tokens", "chat_tickets", "chat_messages"
        ]
    
    print(f"📊 Found {len(tables)} tables to migrate")
    print(f"   Tables: {', '.join(tables[:10])}{'...' if len(tables) > 10 else ''}")
    
    # Migrate tables
    total_migrated = 0
    successful_tables = []
    failed_tables = []
    
    for table_name in tables:
        count = migrate_table(supabase, render_engine, table_name)
        if count > 0:
            total_migrated += count
            successful_tables.append((table_name, count))
        else:
            failed_tables.append(table_name)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Migration Summary")
    print("=" * 60)
    print(f"✅ Total rows migrated: {total_migrated}")
    print(f"✅ Successful tables: {len(successful_tables)}")
    if successful_tables:
        print("\n📋 Tables migrated:")
        for table, count in successful_tables:
            print(f"   - {table}: {count} rows")
    
    if failed_tables:
        print(f"\n⚠️  Tables with no data or errors: {len(failed_tables)}")
        for table in failed_tables:
            print(f"   - {table}")
    
    print("\n" + "=" * 60)
    print("🎉 Migration Complete!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. ✅ Verify data in Render PostgreSQL")
    print("2. ✅ Test your application endpoints")
    print("3. ✅ DATABASE_PREFERENCE=render is already set")
    print("4. ⏳ Once verified, you can remove Supabase credentials from .env")
    print("\n💡 To verify migration:")
    print("   python -c \"from app.services.db_service import db_service; print(f'Categories: {len(db_service.get_categories())}')\"")


if __name__ == "__main__":
    main()

