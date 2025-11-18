"""Detailed test of database connection."""
import sys

print("=" * 60)
print("Testing Database Connection")
print("=" * 60)

try:
    print("\n1. Testing configuration...")
    from app.config import get_settings
    settings = get_settings()
    print(f"   DATABASE_URL: {settings.database_url[:60] if settings.database_url else 'None'}...")
    print(f"   DATABASE_PREFERENCE: {settings.database_preference}")
    
    print("\n2. Testing database_service...")
    from app.services.database import database_service
    print(f"   Engine exists: {database_service.engine is not None}")
    print(f"   is_available(): {database_service.is_available()}")
    
    if database_service.engine:
        print("   Testing connection...")
        result = database_service.test_connection()
        print(f"   Connection test: {result}")
    
    print("\n3. Testing db_service...")
    from app.services.db_service import db_service
    print(f"   Service available: {db_service.is_available()}")
    print(f"   Service name: {db_service.get_service_name()}")
    print(f"   Service type: {type(db_service.service).__name__ if db_service.service else 'None'}")
    
    if db_service.is_available():
        print("\n4. Testing actual query...")
        try:
            products = db_service.get_products(limit=1)
            print(f"   ✅ Success! Got {len(products)} products")
            if products:
                print(f"   Sample product: {products[0].get('name', 'N/A')[:50]}")
        except Exception as e:
            print(f"   ❌ Query failed: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

