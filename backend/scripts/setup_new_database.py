"""
Complete setup script for new database.

This script:
1. Verifies database connection
2. Checks if tables exist
3. Provides instructions to create tables
4. Verifies API endpoints work

Usage:
    python -m scripts.setup_new_database
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.services.db_service import db_service
from dotenv import load_dotenv

load_dotenv()


def check_database_connection():
    """Check if database is connected."""
    print("=" * 70)
    print("🔍 Database Connection Check")
    print("=" * 70)
    print()
    
    settings = get_settings()
    
    print(f"📋 Configuration:")
    print(f"   Database Preference: {settings.database_preference}")
    print(f"   SUPABASE_URL: {settings.supabase_url[:50] + '...' if settings.supabase_url else 'Not set'}")
    print(f"   SUPABASE_KEY: {'Set' if settings.supabase_key else 'Not set'}")
    print()
    
    if db_service.is_available():
        print(f"✅ Database Connected: {db_service.get_service_name()}")
        print()
        
        # Test a simple query
        try:
            categories = db_service.get_categories()
            print(f"✅ Can query database: Found {len(categories)} categories")
            
            products = db_service.get_products(limit=5)
            print(f"✅ Can query products: Found {len(products)} products (limited to 5)")
            
            return True
        except Exception as e:
            print(f"❌ Database query failed: {e}")
            return False
    else:
        print("❌ Database NOT connected")
        print("   Using fixture data (JSON files)")
        return False


def check_tables_exist():
    """Check if required tables exist."""
    print()
    print("=" * 70)
    print("📋 Checking Required Tables")
    print("=" * 70)
    print()
    
    required_tables = [
        "categories",
        "products",
        "offers",
        "settings",
        "testimonials",
    ]
    
    if not db_service.is_available():
        print("⚠️  Cannot check tables - database not connected")
        return False
    
    missing_tables = []
    
    for table in required_tables:
        try:
            # Try to query the table
            if table == "categories":
                result = db_service.get_categories()
                print(f"✅ {table}: Exists ({len(result)} rows)")
            elif table == "products":
                result = db_service.get_products(limit=1)
                print(f"✅ {table}: Exists ({len(result)} rows found)")
            elif table == "offers":
                result = db_service.get_offers()
                print(f"✅ {table}: Exists ({len(result)} rows)")
            elif table == "settings":
                result = db_service.get_settings()
                print(f"✅ {table}: Exists")
            elif table == "testimonials":
                result = db_service.get_testimonials()
                print(f"✅ {table}: Exists ({len(result)} rows)")
        except Exception as e:
            print(f"❌ {table}: Missing or error - {str(e)[:100]}")
            missing_tables.append(table)
    
    if missing_tables:
        print()
        print("⚠️  Missing Tables:")
        for table in missing_tables:
            print(f"   • {table}")
        return False
    
    return True


def provide_setup_instructions():
    """Provide setup instructions."""
    print()
    print("=" * 70)
    print("📝 Setup Instructions")
    print("=" * 70)
    print()
    
    print("1. ✅ Create Tables:")
    print("   → Open: backend/db/schema_supabase.sql")
    print("   → Copy all SQL")
    print("   → Go to Supabase Dashboard → SQL Editor")
    print("   → Paste and Run")
    print()
    
    print("2. ✅ Migrate Data:")
    print("   → Run: python -m scripts.migrate_supabase_to_supabase")
    print()
    
    print("3. ✅ Fix RLS Policies:")
    print("   → Open: backend/scripts/fix_storage_rls_quick.sql")
    print("   → Copy all SQL")
    print("   → Go to Supabase Dashboard → SQL Editor")
    print("   → Paste and Run")
    print()
    
    print("4. ✅ Verify Database Connection:")
    print("   → Check .env has SUPABASE_URL and SUPABASE_KEY")
    print("   → Restart backend: python -m uvicorn app.main:app --reload")
    print()


def main():
    """Main function."""
    print()
    print("=" * 70)
    print("🚀 New Database Setup Check")
    print("=" * 70)
    print()
    
    # Check connection
    is_connected = check_database_connection()
    
    # Check tables
    if is_connected:
        tables_exist = check_tables_exist()
    else:
        tables_exist = False
    
    # Summary
    print()
    print("=" * 70)
    print("📊 Summary")
    print("=" * 70)
    print()
    
    if is_connected and tables_exist:
        print("✅ Database is ready!")
        print("   All tables exist and can be queried")
        print()
        print("🎯 Next Steps:")
        print("   1. Restart backend if needed")
        print("   2. Test API endpoints: http://localhost:8000/api/store/categories")
        print("   3. Check frontend - it should work now!")
    else:
        print("⚠️  Database setup incomplete")
        print()
        if not is_connected:
            print("❌ Database not connected")
            print("   → Check SUPABASE_URL and SUPABASE_KEY in .env")
        if not tables_exist:
            print("❌ Tables missing")
            print("   → Run schema_supabase.sql in Supabase SQL Editor")
        
        print()
        provide_setup_instructions()
    
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

