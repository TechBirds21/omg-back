"""
Test script to check Supabase storage API and identify errors.

Usage:
    python -m scripts.test_storage_api
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def test_storage_api():
    """Test Supabase storage API."""
    print("=" * 70)
    print("🧪 Testing Supabase Storage API")
    print("=" * 70)
    print()
    
    # Get destination client
    url = os.getenv("DEST_SUPABASE_URL")
    key = os.getenv("DEST_SUPABASE_KEY")
    
    if not url or not key:
        print("❌ DEST_SUPABASE_URL and DEST_SUPABASE_KEY must be set in .env")
        return
    
    print(f"📡 Connecting to: {url}")
    print()
    
    try:
        client = create_client(url, key)
        print("✅ Connected to Supabase")
        print()
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    # Test different storage API methods
    bucket_name = "images"
    
    print(f"🔍 Testing storage API for bucket: {bucket_name}")
    print()
    
    # Method 1: Try storage.from()
    print("1. Testing: client.storage.from(bucket_name)")
    try:
        bucket = client.storage.from_(bucket_name)
        print("   ✅ client.storage.from_() works")
        result = bucket.list()
        print(f"   ✅ bucket.list() works - returned: {type(result)}")
        if result:
            print(f"   📊 Found {len(result)} items")
        else:
            print("   ℹ️  Bucket is empty or doesn't exist")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # Method 2: Check if from_ is the correct method
    print("2. Testing: Check storage API structure")
    try:
        # Check available attributes
        print(f"   Storage object type: {type(client.storage)}")
        print(f"   Has 'from_': {hasattr(client.storage, 'from_')}")
        if hasattr(client.storage, 'from_'):
            print("   ✅ client.storage.from_() method exists")
        else:
            print("   ❌ client.storage.from_() does not exist")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Method 3: Check available methods
    print("3. Available storage methods:")
    try:
        storage_methods = [m for m in dir(client.storage) if not m.startswith('_')]
        print(f"   Methods: {', '.join(storage_methods)}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Method 4: Try list_buckets if available
    print("4. Testing bucket listing:")
    try:
        if hasattr(client.storage, 'list_buckets'):
            buckets = client.storage.list_buckets()
            print(f"   ✅ Found buckets: {buckets}")
        else:
            print("   ℹ️  list_buckets() not available")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    print("=" * 70)
    print("💡 If you see errors above, those are the issues to fix")
    print("=" * 70)


if __name__ == "__main__":
    try:
        test_storage_api()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

