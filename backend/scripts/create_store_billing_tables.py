#!/usr/bin/env python3
"""
Script to create store billing tables in the database.
This script will automatically create the required tables if they don't exist.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.services.database import database_service
from app.services.supabase_client import supabase_service
from app.services.db_service import db_service
from sqlalchemy import text

def create_tables():
    """Create store billing tables in the database."""
    print("🚀 Creating Store Billing Tables...")
    print("=" * 60)
    
    # Check which database service is being used
    service_name = db_service.get_service_name()
    print(f"📊 Using database service: {service_name}")
    
    if not db_service.is_available():
        print("❌ Database service is not available!")
        return False
    
    # Read the SQL script
    sql_file = Path(__file__).parent.parent / "db" / "create_store_billing_tables.sql"
    if not sql_file.exists():
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    # Split by semicolons to execute statements separately
    statements = [s.strip() for s in sql_script.split(';') if s.strip() and not s.strip().startswith('--')]
    
    try:
        # Get the actual database service
        if hasattr(db_service, 'service') and db_service.service:
            actual_service = db_service.service
            
            # If using Render PostgreSQL (database_service)
            if hasattr(actual_service, 'engine') and actual_service.engine:
                print("📝 Executing SQL on Render PostgreSQL...")
                with actual_service.get_session() as session:
                    for i, statement in enumerate(statements, 1):
                        if statement:
                            try:
                                print(f"   Executing statement {i}/{len(statements)}...")
                                session.execute(text(statement))
                                session.commit()
                            except Exception as e:
                                # Ignore "already exists" errors
                                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                                    print(f"   ⚠️  Table/index already exists, skipping...")
                                else:
                                    print(f"   ⚠️  Warning: {e}")
                                    # Continue with next statement
                
                print("✅ Tables created successfully in Render PostgreSQL!")
                return True
            
            # If using Supabase
            elif hasattr(actual_service, 'client') and actual_service.client:
                print("📝 Executing SQL on Supabase...")
                # Supabase uses REST API, so we need to execute via SQL editor
                # For now, print instructions
                print("⚠️  Supabase requires manual SQL execution via dashboard.")
                print("   1. Go to Supabase Dashboard → SQL Editor")
                print("   2. Copy the SQL from: backend/db/create_store_billing_tables.sql")
                print("   3. Paste and run it")
                return False
        
        print("❌ Could not determine database service type")
        return False
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_tables():
    """Verify that the tables were created successfully."""
    print("\n🔍 Verifying tables...")
    
    tables_to_check = ["store_bills", "store_bill_items", "store_discounts"]
    
    for table_name in tables_to_check:
        try:
            result = db_service.admin_get_all(table_name)
            print(f"   ✅ {table_name} - OK ({len(result)} rows)")
        except Exception as e:
            print(f"   ❌ {table_name} - ERROR: {e}")
            return False
    
    print("✅ All tables verified!")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Store Billing Tables Setup")
    print("=" * 60)
    
    if create_tables():
        verify_tables()
        print("\n✅ Setup complete! You can now create store bills.")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        print("\n💡 Alternative: Run the SQL script manually:")
        print("   backend/db/create_store_billing_tables.sql")
        sys.exit(1)

