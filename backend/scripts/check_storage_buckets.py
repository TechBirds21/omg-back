"""
Helper script to check which storage buckets exist and provide setup instructions.

Usage:
    python -m scripts.check_storage_buckets
"""

import os
import sys
from typing import List, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_supabase_client(url_env: str, key_env: str, name: str) -> Optional[Client]:
    """Get Supabase client."""
    url = os.getenv(url_env)
    key = os.getenv(key_env)
    
    if not url or not key:
        print(f"❌ {name}: {url_env} and {key_env} must be set in .env")
        return None
    
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"❌ {name}: Failed to connect - {e}")
        return None


def check_bucket_exists(client: Client, bucket_name: str) -> bool:
    """Check if bucket exists."""
    try:
        client.storage.from_(bucket_name).list(limit=1)
        return True
    except Exception as e:
        error_str = str(e).lower()
        if "not found" in error_str or "404" in error_str or "does not exist" in error_str:
            return False
        # Other errors might mean bucket exists but is empty
        return True


def get_bucket_info(client: Client, bucket_name: str) -> dict:
    """Get information about a bucket."""
    exists = check_bucket_exists(client, bucket_name)
    file_count = 0
    
    if exists:
        try:
            files = client.storage.from_(bucket_name).list()
            if files:
                file_count = len([f for f in files if f.get("id")])  # Count files, not folders
        except:
            pass
    
    return {
        "exists": exists,
        "file_count": file_count
    }


def main():
    """Main function."""
    print("=" * 70)
    print("🔍 Storage Buckets Checker")
    print("=" * 70)
    print()
    
    # Get clients
    print("📡 Connecting to Supabase instances...")
    source_client = get_supabase_client("SOURCE_SUPABASE_URL", "SOURCE_SUPABASE_KEY", "Source")
    dest_client = get_supabase_client("DEST_SUPABASE_URL", "DEST_SUPABASE_KEY", "Destination")
    
    if not source_client:
        print("\n⚠️  Cannot check source - add SOURCE_SUPABASE_URL and SOURCE_SUPABASE_KEY to .env")
    if not dest_client:
        print("\n⚠️  Cannot check destination - add DEST_SUPABASE_URL and DEST_SUPABASE_KEY to .env")
    
    if not source_client and not dest_client:
        print("\n❌ No Supabase connections available. Check your .env file.")
        return
    
    print()
    
    # Common buckets
    buckets_to_check = [
        "images",
        "product-images",
        "resumes",
        "uploads",
        "categories",
        "testimonials",
    ]
    
    print("📋 Checking buckets...")
    print()
    print(f"{'Bucket Name':<20} {'Source':<15} {'Destination':<15} {'Status'}")
    print("-" * 70)
    
    missing_buckets = []
    existing_buckets = []
    
    for bucket in buckets_to_check:
        source_info = get_bucket_info(source_client, bucket) if source_client else {"exists": False, "file_count": 0}
        dest_info = get_bucket_info(dest_client, bucket) if dest_client else {"exists": False, "file_count": 0}
        
        source_status = f"✅ ({source_info['file_count']} files)" if source_info["exists"] else "❌ Not found"
        dest_status = f"✅ ({dest_info['file_count']} files)" if dest_info["exists"] else "❌ Missing"
        
        if not source_client:
            source_status = "N/A"
        if not dest_client:
            dest_status = "N/A"
        
        status = ""
        if source_info["exists"] and not dest_info["exists"]:
            status = "⚠️  NEEDS CREATION"
            missing_buckets.append(bucket)
        elif dest_info["exists"]:
            status = "✅ Ready"
            existing_buckets.append(bucket)
        elif source_info["exists"]:
            status = "⚠️  Missing in destination"
            missing_buckets.append(bucket)
        
        print(f"{bucket:<20} {source_status:<15} {dest_status:<15} {status}")
    
    print()
    print("=" * 70)
    
    if missing_buckets:
        print("⚠️  MISSING BUCKETS IN DESTINATION")
        print("=" * 70)
        print()
        print("You need to create these buckets manually in destination Supabase:")
        print()
        
        for i, bucket in enumerate(missing_buckets, 1):
            print(f"{i}. {bucket}")
            print(f"   → Go to: Destination Supabase Dashboard → Storage")
            print(f"   → Click: 'New bucket'")
            print(f"   → Name: {bucket}")
            print(f"   → Public: ✅ Yes (check the box)")
            print(f"   → Click: 'Create bucket'")
            print()
        
        print("📝 Step-by-Step Instructions:")
        print("   1. Open your destination Supabase project")
        print("   2. Click 'Storage' in the left sidebar")
        print("   3. Click the green 'New bucket' button (top right)")
        print("   4. For each bucket above:")
        print("      - Enter the bucket name")
        print("      - Check 'Public bucket' checkbox")
        print("      - Click 'Create bucket'")
        print("   5. Come back and run this script again to verify")
        print()
    else:
        print("✅ All required buckets exist in destination!")
        print()
        print("You can now run the migration:")
        print("   python -m scripts.migrate_storage")
        print()
    
    if existing_buckets:
        print("✅ Existing buckets in destination:")
        for bucket in existing_buckets:
            print(f"   • {bucket}")
        print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

