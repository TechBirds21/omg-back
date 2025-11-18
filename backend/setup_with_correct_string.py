"""
Setup script with the correct Render PostgreSQL connection string.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Correct external connection string
RENDER_DB_URL = "postgresql://omgdb_user:hN87aTqwoyrnaEMTDUO7nyUU93hDT3pP@dpg-d43v9f0dl3ps73aarjsg-a.singapore-postgres.render.com/omgdb"

def setup_database():
    """Set up the database configuration."""
    env_path = Path(__file__).parent / ".env"
    
    env_content = f"""# Render PostgreSQL
DATABASE_URL={RENDER_DB_URL}
DATABASE_PREFERENCE=render

# Cloudflare R2 (add your credentials when ready)
# R2_ACCOUNT_ID=your_account_id
# R2_ACCESS_KEY_ID=your_access_key_id
# R2_SECRET_ACCESS_KEY=your_secret_access_key
# R2_BUCKET_NAME=omaguva-storage
# R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev

# Supabase (for migration - can be removed after migration)
# SUPABASE_URL=https://sqmkdczbkfmgdlbotdtf.supabase.co
# SUPABASE_KEY=your_supabase_key

# PhonePe (if using)
# PHONEPE_ENABLED=false
# PHONEPE_MERCHANT_ID=your_merchant_id
# PHONEPE_MERCHANT_SECRET=your_merchant_secret
# PHONEPE_PAYMENT_CALLBACK_URL=https://yourdomain.com/payments/phonepe/callback
"""
    
    try:
        with open(env_path, "w") as f:
            f.write(env_content)
        print("✅ Updated .env file with Render PostgreSQL connection string")
        return True
    except Exception as e:
        print(f"❌ Error writing .env file: {e}")
        return False

def test_connection():
    """Test the database connection."""
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool
    
    print("\n" + "=" * 60)
    print("🧪 Testing Database Connection")
    print("=" * 60)
    
    try:
        # Ensure postgresql:// format
        db_url = RENDER_DB_URL
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        
        print(f"📡 Connecting to: {db_url.split('@')[1] if '@' in db_url else 'database'}...")
        
        engine = create_engine(
            db_url,
            poolclass=NullPool,
            echo=False,
            connect_args={"connect_timeout": 10}
        )
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Connected successfully!")
            print(f"   PostgreSQL: {version.split(',')[0]}")
            
            # Check tables
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            table_count = result.fetchone()[0]
            print(f"   Existing tables: {table_count}")
            
            return True, table_count
                
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        # Try with port 5432 if it fails
        if "could not translate host name" not in str(e) and "connection" in str(e).lower():
            print("\n💡 Trying with explicit port 5432...")
            try:
                db_url_with_port = RENDER_DB_URL.replace(
                    "@dpg-d43v9f0dl3ps73aarjsg-a.singapore-postgres.render.com/",
                    "@dpg-d43v9f0dl3ps73aarjsg-a.singapore-postgres.render.com:5432/"
                )
                engine = create_engine(
                    db_url_with_port,
                    poolclass=NullPool,
                    echo=False,
                    connect_args={"connect_timeout": 10}
                )
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT version()"))
                    version = result.fetchone()[0]
                    print(f"✅ Connected with port 5432!")
                    print(f"   PostgreSQL: {version.split(',')[0]}")
                    # Update .env with port
                    env_path = Path(__file__).parent / ".env"
                    with open(env_path, "r") as f:
                        content = f.read()
                    content = content.replace(RENDER_DB_URL, db_url_with_port)
                    with open(env_path, "w") as f:
                        f.write(content)
                    print("✅ Updated .env with port 5432")
                    return True, 0
            except Exception as e2:
                print(f"❌ Still failed: {e2}")
        
        import traceback
        traceback.print_exc()
        return False, 0

def initialize_schema():
    """Initialize the database schema."""
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool
    
    schema_path = Path(__file__).parent / "db" / "schema.sql"
    
    if not schema_path.exists():
        print(f"❌ Schema file not found: {schema_path}")
        return False
    
    print("\n" + "=" * 60)
    print("📦 Initializing Database Schema")
    print("=" * 60)
    
    try:
        load_dotenv(Path(__file__).parent / ".env")
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            print("❌ DATABASE_URL not found in .env")
            return False
        
        # Ensure postgresql:// format
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        engine = create_engine(
            database_url,
            poolclass=NullPool,
            echo=False
        )
        
        with open(schema_path, "r") as f:
            schema_sql = f.read()
        
        print("📝 Executing schema...")
        with engine.connect() as conn:
            conn.execute(text(schema_sql))
            conn.commit()
        
        print("✅ Schema initialized successfully!")
        
        # Verify
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            table_count = result.fetchone()[0]
            print(f"✅ Created {table_count} tables")
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing schema: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Render PostgreSQL Setup")
    print("=" * 60)
    
    # Step 1: Update .env file
    if not setup_database():
        exit(1)
    
    # Step 2: Test connection
    success, table_count = test_connection()
    if not success:
        print("\n❌ Connection test failed.")
        print("Please verify:")
        print("1. Database is running on Render")
        print("2. External connections are allowed")
        print("3. Network connectivity")
        exit(1)
    
    # Step 3: Initialize schema if needed
    if table_count == 0:
        print("\n📦 Schema is empty. Initializing...")
        if not initialize_schema():
            print("\n❌ Schema initialization failed")
            exit(1)
    else:
        print(f"\n✅ Schema already has {table_count} tables")
        response = input("\n❓ Re-initialize schema? This will recreate all tables (y/N): ").strip().lower()
        if response == 'y':
            if not initialize_schema():
                print("\n❌ Schema re-initialization failed")
                exit(1)
    
    # Step 4: Test database service
    print("\n" + "=" * 60)
    print("🧪 Testing Database Service")
    print("=" * 60)
    
    try:
        import sys
        load_dotenv(Path(__file__).parent / ".env")
        sys.path.insert(0, str(Path(__file__).parent))
        from app.services.database import database_service
        from app.services.db_service import db_service
        
        if database_service.is_available():
            print("✅ Database service is available")
            if database_service.test_connection():
                print("✅ Database service connection test passed")
            else:
                print("⚠️  Database service connection test failed")
        
        if db_service.is_available():
            print(f"✅ Unified service active: {db_service.get_service_name()}")
        else:
            print("⚠️  Unified service not available")
            
    except Exception as e:
        print(f"⚠️  Could not test database service: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Setup Complete!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Add Cloudflare R2 credentials to .env (when ready)")
    print("2. Start backend: uvicorn app.main:app --reload")
    print("3. Check startup logs for '✅ Database: Render PostgreSQL'")
    print("4. Test API: curl http://localhost:8000/api/store/categories")
    print("\n💡 To migrate data from Supabase:")
    print("   - Add SUPABASE_URL and SUPABASE_KEY to .env")
    print("   - Run: python -m scripts.migrate_to_render")

