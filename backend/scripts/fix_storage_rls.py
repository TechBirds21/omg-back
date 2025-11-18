"""
Fix RLS policies on Supabase Storage buckets.

This script creates permissive RLS policies that allow all operations on storage buckets.

Usage:
    python -m scripts.fix_storage_rls
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_dest_supabase() -> Client:
    """Get destination Supabase client."""
    url = os.getenv("DEST_SUPABASE_URL")
    key = os.getenv("DEST_SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("DEST_SUPABASE_URL and DEST_SUPABASE_KEY must be set in .env")
    
    return create_client(url, key)


def fix_rls_policies(client: Client, bucket_names: list):
    """Create permissive RLS policies for storage buckets."""
    print("=" * 70)
    print("🔧 Fixing RLS Policies on Storage Buckets")
    print("=" * 70)
    print()
    
    # SQL to create permissive policies
    policies_sql = []
    
    for bucket_name in bucket_names:
        # Policy to allow INSERT (upload)
        policies_sql.append(f"""
-- Allow INSERT (upload) for {bucket_name}
CREATE POLICY IF NOT EXISTS "Allow uploads to {bucket_name}"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = '{bucket_name}');
""")
        
        # Policy to allow SELECT (download/view)
        policies_sql.append(f"""
-- Allow SELECT (download/view) for {bucket_name}
CREATE POLICY IF NOT EXISTS "Allow downloads from {bucket_name}"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (bucket_id = '{bucket_name}');
""")
        
        # Policy to allow UPDATE
        policies_sql.append(f"""
-- Allow UPDATE for {bucket_name}
CREATE POLICY IF NOT EXISTS "Allow updates to {bucket_name}"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (bucket_id = '{bucket_name}');
""")
        
        # Policy to allow DELETE
        policies_sql.append(f"""
-- Allow DELETE for {bucket_name}
CREATE POLICY IF NOT EXISTS "Allow deletes from {bucket_name}"
ON storage.objects
FOR DELETE
TO authenticated, anon
USING (bucket_id = '{bucket_name}');
""")
    
    # Combine all policies
    full_sql = "\n".join(policies_sql)
    
    print("📋 SQL Policies to Execute:")
    print("-" * 70)
    print(full_sql)
    print("-" * 70)
    print()
    
    # Try to execute via Supabase (if service_role key)
    try:
        # Note: Supabase Python client doesn't have direct SQL execution
        # We'll provide the SQL for manual execution
        print("⚠️  Note: Supabase Python client cannot execute SQL directly.")
        print("   You need to run this SQL manually in Supabase SQL Editor.")
        print()
        print("📝 Steps:")
        print("   1. Go to destination Supabase Dashboard")
        print("   2. Click 'SQL Editor' in left sidebar")
        print("   3. Click 'New query'")
        print("   4. Copy and paste the SQL above")
        print("   5. Click 'Run' (or press Ctrl+Enter)")
        print()
        
        return full_sql
    except Exception as e:
        print(f"⚠️  Could not execute automatically: {e}")
        print("   Please run the SQL manually.")
        return full_sql


def main():
    """Main function."""
    try:
        print("📡 Connecting to destination Supabase...")
        client = get_dest_supabase()
        print("✅ Connected")
        print()
        
        # Buckets to fix
        buckets = [
            "images",
            "product-images",
            "resumes",
            "uploads",
            "categories",
            "testimonials",
        ]
        
        print(f"🔧 Will create RLS policies for {len(buckets)} buckets:")
        for bucket in buckets:
            print(f"   • {bucket}")
        print()
        
        # Generate SQL
        sql = fix_rls_policies(client, buckets)
        
        # Save to file
        sql_file = os.path.join(os.path.dirname(__file__), "fix_storage_rls.sql")
        with open(sql_file, "w", encoding="utf-8") as f:
            f.write(sql)
        
        print(f"💾 SQL saved to: {sql_file}")
        print()
        print("=" * 70)
        print("✅ Next Steps:")
        print("=" * 70)
        print("1. Go to destination Supabase Dashboard → SQL Editor")
        print("2. Copy the SQL from above (or from the file)")
        print("3. Paste and run it")
        print("4. Run migration again: python -m scripts.migrate_storage")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

