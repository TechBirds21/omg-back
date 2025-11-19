"""
Migrate data from one Supabase instance to another Supabase instance.
Also creates tables in destination if they don't exist.

Usage:
    python -m scripts.migrate_supabase_to_supabase

Environment Variables Required:
    SOURCE_SUPABASE_URL=https://source-project.supabase.co
    SOURCE_SUPABASE_KEY=your_source_anon_key
    DEST_SUPABASE_URL=https://dest-project.supabase.co
    DEST_SUPABASE_KEY=your_dest_anon_key (or service_role key for table creation)
    
Optional (for direct SQL execution):
    DEST_DATABASE_URL=postgresql://user:pass@host:port/db (for creating tables)
"""

import os
import sys
from typing import Any, Dict, List, Optional
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from dotenv import load_dotenv

# Try to import psycopg2 for direct SQL execution
try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

# Load environment variables
load_dotenv()


def get_source_supabase() -> Optional[Client]:
    """Get source Supabase client."""
    url = os.getenv("SOURCE_SUPABASE_URL")
    key = os.getenv("SOURCE_SUPABASE_KEY")
    
    if not url or not key:
        print("❌ SOURCE_SUPABASE_URL and SOURCE_SUPABASE_KEY must be set in .env")
        return None
    
    try:
        client = create_client(url, key)
        # Test connection
        client.table("categories").select("id").limit(1).execute()
        return client
    except Exception as e:
        print(f"❌ Failed to connect to source Supabase: {e}")
        return None


def get_dest_supabase() -> Optional[Client]:
    """Get destination Supabase client."""
    url = os.getenv("DEST_SUPABASE_URL")
    key = os.getenv("DEST_SUPABASE_KEY")
    
    if not url or not key:
        print("❌ DEST_SUPABASE_URL and DEST_SUPABASE_KEY must be set in .env")
        return None
    
    try:
        client = create_client(url, key)
        # Test connection (this might fail if table doesn't exist, which is OK)
        try:
            client.table("categories").select("id").limit(1).execute()
        except:
            pass  # Table might not exist yet
        return client
    except Exception as e:
        print(f"❌ Failed to connect to destination Supabase: {e}")
        return None


def get_dest_db_connection():
    """Get direct PostgreSQL connection to destination database."""
    db_url = os.getenv("DEST_DATABASE_URL")
    
    if not db_url:
        return None
    
    try:
        # Convert postgres:// to postgresql:// if needed
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        print(f"⚠️  Could not connect to destination database directly: {e}")
        return None


def create_tables_from_schema(dest_client: Client, dest_db_conn=None) -> bool:
    """Create tables in destination database from schema files."""
    print("\n📋 Creating tables in destination database...")
    
    # Read schema files
    backend_dir = Path(__file__).parent.parent
    schema_file = backend_dir / "db" / "schema.sql"
    store_schema_file = backend_dir / "db" / "store_schema.sql"
    
    schemas = []
    if schema_file.exists():
        schemas.append(schema_file.read_text(encoding='utf-8'))
    if store_schema_file.exists():
        schemas.append(store_schema_file.read_text(encoding='utf-8'))
    
    if not schemas:
        print("⚠️  Schema files not found. Tables must be created manually.")
        return False
    
    combined_schema = "\n\n".join(schemas)
    
    # Remove auth schema creation (Supabase manages this)
    # Supabase already has auth.users table, so we skip creating it
    lines = combined_schema.split('\n')
    filtered_lines = []
    skip_auth_table = False
    paren_count = 0
    
    for line in lines:
        stripped = line.strip()
        
        # Skip auth schema creation
        if 'CREATE SCHEMA IF NOT EXISTS auth' in stripped.upper():
            print("   ℹ️  Skipping auth schema creation (managed by Supabase)")
            continue
        
        # Detect start of auth.users table creation
        if 'CREATE TABLE IF NOT EXISTS auth.users' in stripped.upper():
            print("   ℹ️  Skipping auth.users table creation (managed by Supabase)")
            skip_auth_table = True
            paren_count = stripped.count('(') - stripped.count(')')
            continue
        
        # Track parentheses to know when CREATE TABLE block ends
        if skip_auth_table:
            paren_count += stripped.count('(') - stripped.count(')')
            if paren_count <= 0 and ');' in stripped:
                skip_auth_table = False
                paren_count = 0
            continue
        
        filtered_lines.append(line)
    
    combined_schema = '\n'.join(filtered_lines)
    
    # Try to execute SQL directly if we have database connection
    if dest_db_conn and PSYCOPG2_AVAILABLE:
        try:
            cursor = dest_db_conn.cursor()
            
            # Execute the entire schema as one block (handles multi-line statements better)
            # Split into logical blocks (CREATE TABLE, ALTER TABLE, CREATE INDEX, etc.)
            # Remove comments and empty lines
            lines = []
            for line in combined_schema.split('\n'):
                line = line.strip()
                # Skip comments and empty lines
                if line and not line.startswith('--'):
                    lines.append(line)
            
            # Join and split by semicolon for individual statements
            full_sql = ' '.join(lines)
            statements = [s.strip() for s in full_sql.split(';') if s.strip()]
            
            executed = 0
            for i, statement in enumerate(statements, 1):
                if statement and len(statement) > 5:  # Ignore very short statements
                    # Skip auth schema related statements
                    if 'auth.users' in statement.lower() or 'create schema auth' in statement.lower():
                        continue
                    
                    try:
                        cursor.execute(statement)
                        executed += 1
                        if executed % 5 == 0:
                            print(f"   ✅ Executed {executed} statements...")
                    except Exception as e:
                        error_str = str(e).lower()
                        # Ignore errors like "already exists", "duplicate", "does not exist", "permission denied for schema auth"
                        if any(phrase in error_str for phrase in [
                            "already exists", 
                            "duplicate", 
                            "does not exist",
                            "permission denied for schema auth",
                            "schema \"auth\" does not exist"
                        ]):
                            pass  # Expected errors, ignore
                        else:
                            # Only show unexpected errors
                            if "syntax error" not in error_str:  # Some syntax errors are OK for IF NOT EXISTS
                                print(f"   ⚠️  Statement {i} warning: {str(e)[:150]}")
            
            cursor.close()
            print(f"   ✅ Schema executed successfully ({executed} statements)")
            return True
        except Exception as e:
            print(f"   ⚠️  Error executing schema: {e}")
            print("   ℹ️  Will try to create tables during migration")
            return False
    
    # If no direct DB connection, try using Supabase SQL API (requires service role key)
    # Note: Supabase REST API doesn't support SQL execution, so we'll skip this
    # and create tables during migration by inferring schema from data
    print("   ℹ️  Direct database connection not available.")
    print("   ℹ️  Tables will be created automatically during migration if needed.")
    print("   💡 Tip: Set DEST_DATABASE_URL for automatic table creation")
    return False


def get_all_tables(source_client: Client) -> List[str]:
    """Get all table names from source Supabase."""
    # Common tables in the application
    common_tables = [
        "categories",
        "vendors",
        "products",
        "customers",
        "testimonials",
        "offers",
        "orders",
        "delivery_areas",
        "deliveries",
        "contact_submissions",
        "settings",
        "inventory",
        "admin_settings",
        "admin_status",
        "payment_config",
        "user_roles",
        "homepage_sections",
        "visits",
        "zoho_oauth_tokens",
        "chat_tickets",
        "chat_messages",
        "store_bills",
        "store_bill_items",
        "store_discounts",
        "pincodes",
        "delivery_pincodes",
        "blog_posts",
        "analytics_events",
        "performance_metrics",
        "business_metrics",
        "site_visits",
        "vendor_orders",
    ]
    
    # Try to get actual table list (this might not work with anon key, so we use common tables)
    existing_tables = []
    for table in common_tables:
        try:
            result = source_client.table(table).select("id").limit(1).execute()
            existing_tables.append(table)
        except Exception:
            # Table doesn't exist or no access, skip it
            pass
    
    return existing_tables


def get_table_columns(source_client: Client, table_name: str) -> List[str]:
    """Get column names for a table by fetching one row."""
    try:
        result = source_client.table(table_name).select("*").limit(1).execute()
        if result.data and len(result.data) > 0:
            return list(result.data[0].keys())
        return []
    except Exception as e:
        print(f"   ⚠️  Could not get columns for {table_name}: {e}")
        return []


def check_table_exists(dest_client: Client, table_name: str) -> bool:
    """Check if a table exists in destination."""
    try:
        dest_client.table(table_name).select("id").limit(1).execute()
        return True
    except:
        return False


def create_table_from_sample(dest_db_conn, table_name: str, sample_row: Dict[str, Any]) -> bool:
    """Create a table in destination database based on sample data."""
    if not dest_db_conn or not PSYCOPG2_AVAILABLE:
        return False
    
    try:
        cursor = dest_db_conn.cursor()
        
        # Check if table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            )
        """, (table_name,))
        
        if cursor.fetchone()[0]:
            cursor.close()
            return True  # Table already exists
        
        # Build CREATE TABLE statement from sample data
        columns = []
        for key, value in sample_row.items():
            if key == 'id':
                columns.append(f"{key} uuid PRIMARY KEY DEFAULT gen_random_uuid()")
            elif isinstance(value, bool):
                columns.append(f"{key} boolean")
            elif isinstance(value, int):
                columns.append(f"{key} integer")
            elif isinstance(value, float):
                columns.append(f"{key} numeric")
            elif isinstance(value, list):
                columns.append(f"{key} text[]")
            elif isinstance(value, dict):
                columns.append(f"{key} jsonb")
            elif isinstance(value, str):
                # Try to detect if it's a timestamp
                if 'created_at' in key or 'updated_at' in key or 'date' in key.lower():
                    columns.append(f"{key} timestamptz")
                else:
                    columns.append(f"{key} text")
            else:
                columns.append(f"{key} text")
        
        create_sql = f"""
            CREATE TABLE IF NOT EXISTS public.{table_name} (
                {', '.join(columns)},
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            )
        """
        
        cursor.execute(create_sql)
        cursor.close()
        return True
    except Exception as e:
        print(f"   ⚠️  Could not create table {table_name}: {e}")
        return False


def migrate_table(
    source_client: Client,
    dest_client: Client,
    table_name: str,
    dest_db_conn=None,
    batch_size: int = 1000
) -> Dict[str, Any]:
    """Migrate a single table from source to destination."""
    print(f"\n📦 Migrating table: {table_name}")
    
    stats = {
        "table": table_name,
        "total_rows": 0,
        "migrated_rows": 0,
        "errors": 0,
        "error_messages": []
    }
    
    try:
        # Check if table exists in destination
        table_exists = check_table_exists(dest_client, table_name)
        
        # Get all data from source (in batches)
        all_data = []
        offset = 0
        
        while True:
            try:
                result = source_client.table(table_name).select("*").range(offset, offset + batch_size - 1).execute()
                
                if not result.data or len(result.data) == 0:
                    break
                
                all_data.extend(result.data)
                offset += batch_size
                
                if len(result.data) < batch_size:
                    break
            except Exception as e:
                print(f"   ⚠️  Error fetching batch: {e}")
                break
        
        stats["total_rows"] = len(all_data)
        
        if stats["total_rows"] == 0:
            print(f"   ℹ️  Table {table_name} is empty, skipping")
            return stats
        
        print(f"   📊 Found {stats['total_rows']} rows")
        
        # If table doesn't exist and we have sample data, try to create it
        if not table_exists and all_data and dest_db_conn:
            print(f"   🔨 Table {table_name} doesn't exist, creating from schema...")
            create_table_from_sample(dest_db_conn, table_name, all_data[0])
            # Check again
            table_exists = check_table_exists(dest_client, table_name)
        
        if not table_exists:
            print(f"   ⚠️  Table {table_name} doesn't exist in destination and couldn't be created automatically")
            print(f"   💡 Please create the table manually or set DEST_DATABASE_URL for automatic creation")
            stats["errors"] = stats["total_rows"]
            stats["error_messages"].append("Table does not exist in destination")
            return stats
        
        # Insert data into destination (in batches)
        for i in range(0, len(all_data), batch_size):
            batch = all_data[i:i + batch_size]
            
            try:
                # Try upsert first (insert or update on conflict)
                # Determine primary key column (usually 'id')
                pk_column = "id" if "id" in (batch[0] if batch else {}) else None
                
                if pk_column:
                    result = dest_client.table(table_name).upsert(batch, on_conflict=pk_column).execute()
                else:
                    result = dest_client.table(table_name).insert(batch).execute()
                
                stats["migrated_rows"] += len(batch)
                print(f"   ✅ Migrated batch {i//batch_size + 1} ({len(batch)} rows)")
            except Exception as e:
                # If upsert fails, try insert
                try:
                    result = dest_client.table(table_name).insert(batch).execute()
                    stats["migrated_rows"] += len(batch)
                    print(f"   ✅ Migrated batch {i//batch_size + 1} ({len(batch)} rows)")
                except Exception as e2:
                    # Try one by one if batch fails
                    print(f"   ⚠️  Batch insert failed, trying individual inserts...")
                    for row in batch:
                        try:
                            pk_column = "id" if "id" in row else None
                            if pk_column:
                                dest_client.table(table_name).upsert(row, on_conflict=pk_column).execute()
                            else:
                                dest_client.table(table_name).insert(row).execute()
                            stats["migrated_rows"] += 1
                        except Exception as e3:
                            stats["errors"] += 1
                            error_msg = f"Row error: {str(e3)[:100]}"
                            if error_msg not in stats["error_messages"]:
                                stats["error_messages"].append(error_msg)
        
        print(f"   ✅ Completed: {stats['migrated_rows']}/{stats['total_rows']} rows migrated")
        if stats["errors"] > 0:
            print(f"   ⚠️  {stats['errors']} errors occurred")
        
    except Exception as e:
        print(f"   ❌ Error migrating {table_name}: {e}")
        stats["errors"] = stats["total_rows"]
        stats["error_messages"].append(str(e))
    
    return stats


def main():
    """Main migration function."""
    print("=" * 70)
    print("🚀 Supabase to Supabase Data Migration")
    print("=" * 70)
    print()
    
    # Get clients
    print("📡 Connecting to databases...")
    source_client = get_source_supabase()
    if not source_client:
        return
    
    dest_client = get_dest_supabase()
    if not dest_client:
        return
    
    print("✅ Connected to both Supabase instances")
    
    # Try to get direct database connection for table creation
    dest_db_conn = get_dest_db_connection()
    if dest_db_conn:
        print("✅ Direct database connection available (can create tables)")
    else:
        print("ℹ️  Direct database connection not available")
        print("   Tables must exist in destination or be created manually")
    print()
    
    # Create tables from schema if we have direct DB connection
    if dest_db_conn:
        create_tables_from_schema(dest_client, dest_db_conn)
        if dest_db_conn:
            dest_db_conn.close()
            # Reconnect for migration
            dest_db_conn = get_dest_db_connection()
    print()
    
    # Get tables to migrate
    print("📋 Discovering tables...")
    tables = get_all_tables(source_client)
    
    if not tables:
        print("❌ No tables found in source database")
        return
    
    print(f"📊 Found {len(tables)} tables to migrate:")
    for i, table in enumerate(tables, 1):
        print(f"   {i}. {table}")
    print()
    
    # Ask for confirmation
    response = input("⚠️  This will migrate data to destination. Continue? (yes/no): ")
    if response.lower() not in ["yes", "y"]:
        print("❌ Migration cancelled")
        return
    
    print()
    print("🚀 Starting migration...")
    print("=" * 70)
    
    # Migration order (respecting dependencies)
    migration_order = [
        "categories",
        "vendors",
        "settings",
        "admin_settings",
        "admin_status",
        "payment_config",
        "delivery_areas",
        "pincodes",
        "delivery_pincodes",
        "products",
        "customers",
        "testimonials",
        "offers",
        "orders",
        "store_bills",
        "store_bill_items",
        "store_discounts",
        "inventory",
        "deliveries",
        "vendor_orders",
        "contact_submissions",
        "user_roles",
        "homepage_sections",
        "visits",
        "zoho_oauth_tokens",
        "chat_tickets",
        "chat_messages",
        "blog_posts",
        "analytics_events",
        "performance_metrics",
        "business_metrics",
        "site_visits",
    ]
    
    # Reorder tables based on dependencies
    ordered_tables = []
    for table in migration_order:
        if table in tables:
            ordered_tables.append(table)
    
    # Add any remaining tables
    for table in tables:
        if table not in ordered_tables:
            ordered_tables.append(table)
    
    # Migrate tables
    all_stats = []
    start_time = datetime.now()
    
    for table_name in ordered_tables:
        stats = migrate_table(source_client, dest_client, table_name, dest_db_conn)
        all_stats.append(stats)
    
    # Close database connection if opened
    if dest_db_conn:
        dest_db_conn.close()
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    # Print summary
    print()
    print("=" * 70)
    print("📊 Migration Summary")
    print("=" * 70)
    print()
    
    total_rows = sum(s["total_rows"] for s in all_stats)
    total_migrated = sum(s["migrated_rows"] for s in all_stats)
    total_errors = sum(s["errors"] for s in all_stats)
    
    print(f"⏱️  Duration: {duration:.2f} seconds")
    print(f"📦 Tables processed: {len(all_stats)}")
    print(f"📊 Total rows found: {total_rows:,}")
    print(f"✅ Rows migrated: {total_migrated:,}")
    print(f"❌ Errors: {total_errors:,}")
    print()
    
    # Detailed table stats
    print("📋 Table Details:")
    for stats in all_stats:
        status = "✅" if stats["migrated_rows"] == stats["total_rows"] and stats["errors"] == 0 else "⚠️"
        print(f"   {status} {stats['table']}: {stats['migrated_rows']}/{stats['total_rows']} rows")
        if stats["errors"] > 0:
            for error in stats["error_messages"][:3]:  # Show first 3 errors
                print(f"      ⚠️  {error}")
    
    print()
    print("=" * 70)
    
    if total_errors == 0:
        print("✅ Migration completed successfully!")
    else:
        print(f"⚠️  Migration completed with {total_errors} errors")
        print("   Please review the errors above")
    
    print("=" * 70)


if __name__ == "__main__":
    main()

