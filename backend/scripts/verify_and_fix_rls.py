"""
Verify service_role key and provide direct RLS fix.

This script checks if service_role key is being used and provides
the exact SQL to run.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()


def check_service_role_key():
    """Check if service_role key is being used."""
    key = os.getenv("DEST_SUPABASE_KEY", "")
    
    print("=" * 70)
    print("🔍 Checking Service Role Key")
    print("=" * 70)
    print()
    
    # Service role keys are typically longer and contain 'service_role'
    is_service_role = len(key) > 100 or "service_role" in key.lower()
    
    if is_service_role:
        print("✅ Using service_role key (good!)")
        print(f"   Key length: {len(key)} characters")
    else:
        print("⚠️  WARNING: Might not be using service_role key")
        print(f"   Key length: {len(key)} characters")
        print("   Service role keys are usually 200+ characters")
        print()
        print("📝 To get service_role key:")
        print("   1. Go to Supabase Dashboard → Settings → API")
        print("   2. Find 'service_role' key (NOT 'anon' key)")
        print("   3. Copy it (it's very long)")
        print("   4. Update .env: DEST_SUPABASE_KEY=your_service_role_key")
    
    print()
    return is_service_role


def test_upload_with_service_role():
    """Test if service_role key can upload (bypasses RLS)."""
    url = os.getenv("DEST_SUPABASE_URL")
    key = os.getenv("DEST_SUPABASE_KEY")
    
    if not url or not key:
        print("❌ DEST_SUPABASE_URL and DEST_SUPABASE_KEY must be set")
        return False
    
    try:
        client = create_client(url, key)
        
        # Try to list buckets (this should work with service_role)
        try:
            buckets = client.storage.list_buckets()
            print("✅ Can access storage (service_role working)")
            print(f"   Found {len(buckets)} buckets")
            return True
        except Exception as e:
            print(f"⚠️  Cannot access storage: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return False


def provide_sql_instructions():
    """Provide clear SQL execution instructions."""
    sql_file = Path(__file__).parent / "fix_storage_rls.sql"
    
    print("=" * 70)
    print("📋 SQL to Fix RLS Policies")
    print("=" * 70)
    print()
    print("You MUST run this SQL in Supabase SQL Editor:")
    print()
    print("1. Go to: https://app.supabase.com")
    print("2. Select your DESTINATION project")
    print("3. Click 'SQL Editor' (left sidebar)")
    print("4. Click 'New query'")
    print("5. Copy SQL from: backend/scripts/fix_storage_rls.sql")
    print("6. Paste and click 'Run'")
    print()
    
    if sql_file.exists():
        sql_content = sql_file.read_text(encoding="utf-8")
        
        # Show first few lines
        lines = sql_content.split("\n")[:20]
        print("📄 SQL Preview (first 20 lines):")
        print("-" * 70)
        for line in lines:
            print(line)
        print("...")
        print("-" * 70)
        print()
        print(f"📁 Full SQL file: {sql_file}")
        print()
        
        # Provide minimal SQL for quick test
        print("🧪 Quick Test - Run this SQL first (just for 'images' bucket):")
        print("-" * 70)
        quick_sql = """
-- Quick fix for images bucket only
CREATE POLICY IF NOT EXISTS "Allow uploads to images"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'images');

CREATE POLICY IF NOT EXISTS "Allow downloads from images"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'images');

CREATE POLICY IF NOT EXISTS "Allow updates to images"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'images');

CREATE POLICY IF NOT EXISTS "Allow deletes from images"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'images');
"""
        print(quick_sql)
        print("-" * 70)
        print()
        print("💡 Copy the SQL above, run it in SQL Editor, then test migration")
        print()


def main():
    """Main function."""
    print()
    print("=" * 70)
    print("🔧 RLS Fix Verification and Instructions")
    print("=" * 70)
    print()
    
    # Check service role key
    is_service_role = check_service_role_key()
    
    # Test connection
    print("=" * 70)
    print("🧪 Testing Storage Access")
    print("=" * 70)
    print()
    can_access = test_upload_with_service_role()
    
    print()
    print("=" * 70)
    print("💡 Important Note")
    print("=" * 70)
    print()
    
    if is_service_role and can_access:
        print("✅ Service role key is working")
        print("⚠️  BUT: RLS policies still need to be created")
        print("   Even with service_role, if RLS is enabled on storage.objects,")
        print("   you need policies to allow operations.")
        print()
    elif not is_service_role:
        print("❌ You're NOT using service_role key")
        print("   This is likely the main issue!")
        print("   Get service_role key and update .env")
        print()
    
    # Provide SQL instructions
    provide_sql_instructions()
    
    print("=" * 70)
    print("✅ Next Steps")
    print("=" * 70)
    print()
    print("1. ✅ Verify service_role key (see above)")
    print("2. ✅ Run SQL in Supabase SQL Editor (see above)")
    print("3. ✅ Verify policies created:")
    print("   → Go to Storage → images → Policies tab")
    print("   → Should see 4 policies")
    print("4. ✅ Run migration: python -m scripts.migrate_storage")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

