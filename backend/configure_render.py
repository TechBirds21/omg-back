"""
Quick configuration script for Render PostgreSQL.
This will help you set up your .env file with the Render database connection.
"""

import os
from pathlib import Path

# Your Render PostgreSQL connection string
RENDER_DB_URL = "postgresql://omgdb_user:hN87aTqwoyrnaEMTDUO7nyUU93hDT3pP@dpg-d43v9f0dl3ps73aarjsg-a/omgdb"

def create_env_file():
    """Create or update .env file with Render database configuration."""
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
    
    if env_path.exists():
        print(f"⚠️  .env file already exists at {env_path}")
        response = input("Overwrite? (y/N): ").strip().lower()
        if response != 'y':
            print("❌ Cancelled. Please manually update .env with:")
            print(f"   DATABASE_URL={RENDER_DB_URL}")
            print(f"   DATABASE_PREFERENCE=render")
            return False
    
    try:
        with open(env_path, "w") as f:
            f.write(env_content)
        print(f"✅ Created .env file at {env_path}")
        print("\n📝 Configuration added:")
        print(f"   DATABASE_URL={RENDER_DB_URL.split('@')[1] if '@' in RENDER_DB_URL else 'configured'}")
        print("   DATABASE_PREFERENCE=render")
        return True
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        print("\n📝 Please manually create backend/.env with:")
        print(f"   DATABASE_URL={RENDER_DB_URL}")
        print(f"   DATABASE_PREFERENCE=render")
        return False

def test_connection():
    """Test the database connection."""
    import os
    from dotenv import load_dotenv
    
    load_dotenv(Path(__file__).parent / ".env")
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found in .env")
        return False
    
    print("\n" + "=" * 60)
    print("🧪 Testing Database Connection")
    print("=" * 60)
    
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.pool import NullPool
        
        # Ensure postgresql:// format
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        print(f"📡 Connecting to: {database_url.split('@')[1] if '@' in database_url else 'database'}...")
        
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
            
            if table_count == 0:
                print("\n⚠️  No tables found. You need to initialize the schema.")
                return False
            else:
                print("✅ Schema is initialized")
                return True
                
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def initialize_schema():
    """Initialize the database schema."""
    import os
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
    print("🚀 Render PostgreSQL Configuration")
    print("=" * 60)
    
    # Step 1: Create .env file
    if not create_env_file():
        print("\n⚠️  Please create .env file manually and run this script again")
        exit(1)
    
    # Step 2: Test connection
    if not test_connection():
        print("\n❌ Connection test failed. Please check your DATABASE_URL")
        exit(1)
    
    # Step 3: Check if schema needs initialization
    import os
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        from sqlalchemy import create_engine, text
        engine = create_engine(database_url, poolclass=NullPool)
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            table_count = result.fetchone()[0]
        
        if table_count == 0:
            print("\n📦 Schema is empty. Initializing...")
            if initialize_schema():
                print("\n✅ Setup complete!")
            else:
                print("\n❌ Schema initialization failed")
                exit(1)
        else:
            print(f"\n✅ Schema already has {table_count} tables")
    
    print("\n" + "=" * 60)
    print("🎉 Configuration Complete!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Add Cloudflare R2 credentials to .env (when ready)")
    print("2. Start backend: uvicorn app.main:app --reload")
    print("3. Check startup logs for '✅ Database: Render PostgreSQL'")
    print("4. Test API: curl http://localhost:8000/api/store/categories")

