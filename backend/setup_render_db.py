"""
Setup script for Render PostgreSQL database.
This will:
1. Test the connection
2. Initialize the schema if needed
3. Verify everything works
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    print("⚠️  .env file not found. Creating one...")
    # Create .env file with the provided connection string
    database_url = "postgresql://omgdb_user:hN87aTqwoyrnaEMTDUO7nyUU93hDT3pP@dpg-d43v9f0dl3ps73aarjsg-a/omgdb"
    
    env_content = f"""# Render PostgreSQL
DATABASE_URL={database_url}
DATABASE_PREFERENCE=render

# Cloudflare R2 (add your credentials)
# R2_ACCOUNT_ID=your_account_id
# R2_ACCESS_KEY_ID=your_access_key_id
# R2_SECRET_ACCESS_KEY=your_secret_access_key
# R2_BUCKET_NAME=omaguva-storage
"""
    
    with open(env_path, "w") as f:
        f.write(env_content)
    print(f"✅ Created .env file at {env_path}")
    print("📝 Please add your Cloudflare R2 credentials to .env")
    load_dotenv(env_path)

database_url = os.getenv("DATABASE_URL")

if not database_url:
    print("❌ DATABASE_URL not found")
    print("Please set DATABASE_URL in your .env file")
    sys.exit(1)

# Ensure postgresql:// format
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

print("=" * 60)
print("🚀 Render PostgreSQL Setup")
print("=" * 60)
print(f"🔗 Database: {database_url.split('@')[1] if '@' in database_url else 'database'}")
print()

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool
    
    # Create engine
    print("📡 Connecting to database...")
    engine = create_engine(
        database_url,
        poolclass=NullPool,
        echo=False,
        connect_args={"connect_timeout": 10}
    )
    
    # Test connection
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✅ Connected successfully!")
        print(f"   PostgreSQL: {version.split(',')[0]}")
        
        # Check existing tables
        print("\n📋 Checking existing tables...")
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        existing_tables = [row[0] for row in result.fetchall()]
        
        if existing_tables:
            print(f"   Found {len(existing_tables)} existing tables:")
            for table in existing_tables[:10]:
                print(f"   - {table}")
            if len(existing_tables) > 10:
                print(f"   ... and {len(existing_tables) - 10} more")
            
            response = input("\n❓ Schema already exists. Re-initialize? (y/N): ").strip().lower()
            if response != 'y':
                print("✅ Keeping existing schema")
                sys.exit(0)
        
        # Initialize schema
        print("\n📦 Initializing database schema...")
        schema_path = Path(__file__).parent / "db" / "schema.sql"
        
        if not schema_path.exists():
            print(f"❌ Schema file not found: {schema_path}")
            sys.exit(1)
        
        with open(schema_path, "r") as f:
            schema_sql = f.read()
        
        # Execute schema
        conn.execute(text(schema_sql))
        conn.commit()
        
        print("✅ Schema initialized successfully!")
        
        # Verify tables were created
        result = conn.execute(text("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        table_count = result.fetchone()[0]
        print(f"✅ Created {table_count} tables")
        
        # Test database service
        print("\n🧪 Testing database service...")
        sys.path.insert(0, str(Path(__file__).parent))
        from app.services.database import database_service
        
        if database_service.is_available():
            print("✅ Database service is available")
            if database_service.test_connection():
                print("✅ Database service connection test passed")
            else:
                print("⚠️  Database service connection test failed")
        else:
            print("❌ Database service not available")
    
    print("\n" + "=" * 60)
    print("🎉 Setup complete!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Add Cloudflare R2 credentials to .env (if not done)")
    print("2. Start backend: uvicorn app.main:app --reload")
    print("3. Check startup logs for '✅ Database: Render PostgreSQL'")
    print("4. Test API: curl http://localhost:8000/api/store/categories")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    print("\n🔍 Troubleshooting:")
    print("1. Verify DATABASE_URL is correct")
    print("2. Check if database is running on Render")
    print("3. Ensure external connections are allowed")
    print("4. Check network connectivity")
    sys.exit(1)

