"""
Non-interactive script to configure Render PostgreSQL.
This will update your .env file with the Render database connection.
"""

import os
from pathlib import Path

# Your Render PostgreSQL connection string
RENDER_DB_URL = "postgresql://omgdb_user:hN87aTqwoyrnaEMTDUO7nyUU93hDT3pP@dpg-d43v9f0dl3ps73aarjsg-a/omgdb"

def setup_database():
    """Set up the database configuration."""
    env_path = Path(__file__).parent / ".env"
    
    # Read existing .env if it exists
    existing_vars = {}
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    existing_vars[key.strip()] = value.strip()
    
    # Update with Render database
    existing_vars["DATABASE_URL"] = RENDER_DB_URL
    existing_vars["DATABASE_PREFERENCE"] = "render"
    
    # Ensure Cloudflare R2 placeholders are there if not set
    if "R2_ACCOUNT_ID" not in existing_vars:
        existing_vars["# R2_ACCOUNT_ID"] = "your_account_id"
    if "R2_ACCESS_KEY_ID" not in existing_vars:
        existing_vars["# R2_ACCESS_KEY_ID"] = "your_access_key_id"
    if "R2_SECRET_ACCESS_KEY" not in existing_vars:
        existing_vars["# R2_SECRET_ACCESS_KEY"] = "your_secret_access_key"
    if "R2_BUCKET_NAME" not in existing_vars:
        existing_vars["# R2_BUCKET_NAME"] = "omaguva-storage"
    
    # Write .env file
    env_content = """# Render PostgreSQL
DATABASE_URL={}
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
""".format(RENDER_DB_URL)
    
    try:
        with open(env_path, "w") as f:
            f.write(env_content)
        print("✅ Updated .env file with Render PostgreSQL configuration")
        return True
    except Exception as e:
        print(f"❌ Error writing .env file: {e}")
        print("\n📝 Please manually create backend/.env with:")
        print(f"   DATABASE_URL={RENDER_DB_URL}")
        print(f"   DATABASE_PREFERENCE=render")
        return False

def test_connection():
    """Test the database connection."""
    from dotenv import load_dotenv
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool
    
    load_dotenv(Path(__file__).parent / ".env")
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found")
        return False
    
    print("\n" + "=" * 60)
    print("🧪 Testing Database Connection")
    print("=" * 60)
    
    try:
        # Ensure postgresql:// format
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        print(f"📡 Connecting...")
        
        engine = create_engine(
            database_url,
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
            print(f"   Tables: {table_count}")
            
            return True, table_count
                
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False, 0

def initialize_schema():
    """Initialize the database schema."""
    from dotenv import load_dotenv
    from sqlalchemy import create_engine, text
    
    load_dotenv(Path(__file__).parent / ".env")
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found")
        return False
    
    # Ensure postgresql:// format
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    schema_path = Path(__file__).parent / "db" / "schema.sql"
    
    if not schema_path.exists():
        print(f"❌ Schema file not found: {schema_path}")
        return False
    
    print("\n" + "=" * 60)
    print("📦 Initializing Database Schema")
    print("=" * 60)
    
    try:
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
        print("\n❌ Connection test failed. Please check your DATABASE_URL")
        exit(1)
    
    # Step 3: Initialize schema if needed
    if table_count == 0:
        print("\n📦 Schema is empty. Initializing...")
        if not initialize_schema():
            print("\n❌ Schema initialization failed")
            exit(1)
    else:
        print(f"\n✅ Schema already has {table_count} tables")
    
    print("\n" + "=" * 60)
    print("🎉 Setup Complete!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Add Cloudflare R2 credentials to .env (when ready)")
    print("2. Start backend: uvicorn app.main:app --reload")
    print("3. Check startup logs for '✅ Database: Render PostgreSQL'")
    print("4. Test API: curl http://localhost:8000/api/store/categories")

