"""
Test script to verify backend setup and database connection
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.services.db_service import db_service

def test_configuration():
    """Test that configuration is loaded correctly"""
    print("=" * 60)
    print("Testing Configuration...")
    print("=" * 60)

    settings = get_settings()
    print(f"✓ App Name: {settings.app_name}")
    print(f"✓ Debug Mode: {settings.debug}")
    print(f"✓ Database Preference: {settings.database_preference}")
    print(f"✓ Supabase URL: {settings.supabase_url[:30]}..." if settings.supabase_url else "✗ Supabase URL: Not configured")
    print(f"✓ Supabase Key: {'*' * 20}..." if settings.supabase_key else "✗ Supabase Key: Not configured")
    print()

def test_database_connection():
    """Test database connection"""
    print("=" * 60)
    print("Testing Database Connection...")
    print("=" * 60)

    if db_service.is_available():
        print(f"✅ Database Service: {db_service.get_service_name()}")

        # Try to fetch categories as a simple test
        try:
            categories = db_service.get_categories()
            print(f"✅ Database Query Test: Successfully fetched {len(categories)} categories")
            if categories:
                print(f"   Sample category: {categories[0].get('name', 'N/A')}")
        except Exception as e:
            print(f"✗ Database Query Test Failed: {e}")
    else:
        print("✗ Database Service: Not available")
        print("   Make sure SUPABASE_URL and SUPABASE_KEY are set in .env file")
    print()

def test_zohopay_config():
    """Test ZohoPay configuration"""
    print("=" * 60)
    print("Testing ZohoPay Configuration...")
    print("=" * 60)

    if not db_service.is_available():
        print("✗ Database not available - cannot check ZohoPay config")
        return

    try:
        from app.api.payments.zohopay import get_zohopay_config

        config = get_zohopay_config()
        if config:
            print("✅ ZohoPay configuration found")
            print(f"   Has account_id: {bool(config.get('account_id'))}")
            print(f"   Has access_token: {bool(config.get('access_token'))}")
            print(f"   Has api_key: {bool(config.get('api_key'))}")
            print(f"   Domain: {config.get('domain', 'N/A')}")
        else:
            print("⚠️  ZohoPay configuration not found in database")
            print("   You can configure it via the admin panel")
    except Exception as e:
        print(f"✗ Error checking ZohoPay config: {e}")
    print()

def main():
    """Run all tests"""
    print()
    print("=" * 60)
    print("Backend Setup Verification")
    print("=" * 60)
    print()

    test_configuration()
    test_database_connection()
    test_zohopay_config()

    print("=" * 60)
    print("Verification Complete!")
    print("=" * 60)
    print()

if __name__ == "__main__":
    main()
