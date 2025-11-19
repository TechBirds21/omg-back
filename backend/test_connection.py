"""Test database connection with new credentials"""

import os
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from app.config import get_settings
from app.services.db_service import db_service

print("=" * 70)
print("Database Connection Test")
print("=" * 70)
print()

settings = get_settings()
print(f"SUPABASE_URL: {settings.supabase_url}")
print(f"SUPABASE_KEY: {'Set (' + str(len(settings.supabase_key)) + ' chars)' if settings.supabase_key else 'Not set'}")
print(f"DATABASE_PREFERENCE: {settings.database_preference}")
print()

# Reinitialize db_service to pick up new credentials
db_service._determine_service()

print(f"Database available: {db_service.is_available()}")
if db_service.is_available():
    print(f"Service: {db_service.get_service_name()}")
    print()
    
    # Test queries
    try:
        categories = db_service.get_categories()
        print(f"✅ Categories: {len(categories)} found")
    except Exception as e:
        print(f"❌ Categories error: {str(e)[:100]}")
    
    try:
        products = db_service.get_products(limit=3)
        print(f"✅ Products: {len(products)} found")
    except Exception as e:
        print(f"❌ Products error: {str(e)[:100]}")
    
    try:
        orders = db_service.admin_get_all("orders")
        print(f"✅ Orders table: accessible ({len(orders) if orders else 0} rows)")
    except Exception as e:
        print(f"❌ Orders error: {str(e)[:100]}")
else:
    print("❌ Database not available")

print()
print("=" * 70)

