"""
Quick script to test Render PostgreSQL connection and initialize schema.
Run this after setting DATABASE_URL in your .env file.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

database_url = os.getenv("DATABASE_URL")

if not database_url:
    print("❌ DATABASE_URL not found in environment variables")
    print("Please set DATABASE_URL in your .env file")
    sys.exit(1)

# Ensure postgresql:// format (not postgres://)
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

print(f"🔗 Testing connection to: {database_url.split('@')[1] if '@' in database_url else 'database'}")
print("=" * 60)

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool
    
    # Create engine
    engine = create_engine(
        database_url,
        poolclass=NullPool,
        echo=False
    )
    
    # Test connection
    print("📡 Testing database connection...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✅ Connected successfully!")
        print(f"   PostgreSQL version: {version.split(',')[0]}")
        
        # Check if schema exists
        print("\n📋 Checking database schema...")
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result.fetchall()]
        
        if tables:
            print(f"✅ Found {len(tables)} tables:")
            for table in tables[:10]:  # Show first 10
                print(f"   - {table}")
            if len(tables) > 10:
                print(f"   ... and {len(tables) - 10} more")
        else:
            print("⚠️  No tables found. You may need to initialize the schema.")
            print("\n💡 To initialize schema, run:")
            print("   psql $DATABASE_URL -f db/schema.sql")
            print("   OR")
            print("   python -m scripts.init_schema")
    
    print("\n" + "=" * 60)
    print("✅ Database connection test passed!")
    print("\n📝 Next steps:")
    print("1. If schema is empty, initialize it: psql $DATABASE_URL -f db/schema.sql")
    print("2. Test the backend: uvicorn app.main:app --reload")
    print("3. Check startup logs to see '✅ Database: Render PostgreSQL'")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\n🔍 Troubleshooting:")
    print("1. Verify DATABASE_URL is correct")
    print("2. Check if database is running on Render")
    print("3. Ensure external connections are allowed")
    print("4. Verify network connectivity")
    sys.exit(1)

