"""
Migrate storage files from one Supabase instance to another.

This script:
1. Lists all files in source Supabase storage buckets
2. Downloads files from source
3. Uploads files to destination Supabase storage buckets
4. Optionally updates URLs in database

Usage:
    python -m scripts.migrate_storage

Environment Variables Required:
    SOURCE_SUPABASE_URL=https://source-project.supabase.co
    SOURCE_SUPABASE_KEY=your_source_service_role_key (needs storage access)
    DEST_SUPABASE_URL=https://dest-project.supabase.co
    DEST_SUPABASE_KEY=your_dest_service_role_key (needs storage access)
"""

import os
import sys
import asyncio
from typing import List, Optional
from pathlib import Path
import tempfile
import shutil

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_source_supabase() -> Optional[Client]:
    """Get source Supabase client."""
    url = os.getenv("SOURCE_SUPABASE_URL")
    key = os.getenv("SOURCE_SUPABASE_KEY")
    
    if not url or not key:
        print("❌ SOURCE_SUPABASE_URL and SOURCE_SUPABASE_KEY must be set in .env")
        return None
    
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"❌ Failed to connect to source Supabase: {e}")
        return None


def get_dest_supabase() -> Optional[Client]:
    """Get destination Supabase client."""
    url = os.getenv("DEST_SUPABASE_URL")
    key = os.getenv("DEST_SUPABASE_KEY")
    
    if not url or not key:
        print("❌ DEST_SUPABASE_URL and DEST_SUPABASE_KEY must be set in .env")
        return None
    
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"❌ Failed to connect to destination Supabase: {e}")
        return None


def list_bucket_files(client: Client, bucket_name: str) -> List[dict]:
    """List all files in a storage bucket recursively."""
    files = []
    
    def collect_files(prefix=""):
        """Recursively collect files from bucket."""
        try:
            response = client.storage.from_(bucket_name).list(prefix)
            
            if not response:
                return
            
            for item in response:
                item_name = item.get("name", "")
                item_id = item.get("id")
                
                # If it has an ID, it's a file
                if item_id:
                    file_path = f"{prefix}/{item_name}" if prefix else item_name
                    # Clean up path (remove leading slash if prefix is empty)
                    file_path = file_path.lstrip("/")
                    files.append({
                        "name": item_name,
                        "path": file_path,
                        "size": item.get("metadata", {}).get("size", 0),
                        "updated_at": item.get("updated_at"),
                    })
                # If it's a folder (has name but no ID, or metadata indicates folder)
                elif item_name and not item_id:
                    folder_prefix = f"{prefix}/{item_name}" if prefix else item_name
                    folder_prefix = folder_prefix.lstrip("/")
                    # Recursively list files in folder
                    collect_files(folder_prefix)
        except Exception as e:
            error_str = str(e).lower()
            if "not found" not in error_str and "404" not in error_str:
                print(f"   ⚠️  Error listing {prefix} in {bucket_name}: {e}")
    
    # Start from root
    collect_files("")
    return files


def download_file(client: Client, bucket_name: str, file_path: str, local_path: str) -> bool:
    """Download a file from Supabase storage."""
    try:
        response = client.storage.from_(bucket_name).download(file_path)
        if response:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(response)
            return True
        return False
    except Exception as e:
        print(f"⚠️  Error downloading {file_path}: {e}")
        return False


def upload_file(client: Client, bucket_name: str, file_path: str, local_path: str, content_type: Optional[str] = None) -> bool:
    """Upload a file to Supabase storage."""
    try:
        with open(local_path, "rb") as f:
            file_data = f.read()
        
        # Use upsert to overwrite existing files
        # Set file options including content type
        file_options = {
            "content-type": content_type,
            "upsert": "true"  # Allow overwriting existing files
        } if content_type else {"upsert": "true"}
        
        response = client.storage.from_(bucket_name).upload(
            file_path, 
            file_data, 
            file_options=file_options
        )
        
        if response:
            return True
        return False
    except Exception as e:
        error_str = str(e).lower()
        error_dict = {}
        
        # Try to parse error as dict/JSON
        try:
            if isinstance(e, dict):
                error_dict = e
            elif hasattr(e, 'message') or hasattr(e, 'error'):
                error_dict = {
                    'statusCode': getattr(e, 'status_code', None) or getattr(e, 'statusCode', None),
                    'error': getattr(e, 'error', None) or str(e),
                    'message': getattr(e, 'message', None) or str(e)
                }
        except:
            pass
        
        # Check for RLS policy violation
        if "row-level security" in error_str or "rls" in error_str or "403" in str(error_dict.get('statusCode', '')):
            print(f"   ❌ RLS Policy Error: {file_path}")
            print(f"      Error: {error_dict.get('message', str(e))}")
            print(f"      💡 Solution: Disable RLS on bucket or use service_role key")
            return False
        
        # Check if it's a duplicate error (file already exists)
        if "duplicate" in error_str or "already exists" in error_str:
            print(f"   ℹ️  File already exists: {file_path}")
            return True
        
        print(f"⚠️  Error uploading {file_path}: {e}")
        return False


def check_bucket_exists(client: Client, bucket_name: str) -> bool:
    """Check if bucket exists in destination."""
    try:
        # Try to list bucket (will fail if doesn't exist)
        client.storage.from_(bucket_name).list(limit=1)
        return True
    except Exception as e:
        error_str = str(e).lower()
        if "not found" in error_str or "404" in error_str or "does not exist" in error_str:
            return False
        # Other errors might mean bucket exists but is empty or has permission issues
        return True


def list_all_buckets(client: Client) -> List[str]:
    """List all buckets in Supabase storage."""
    try:
        # Supabase storage API doesn't have a direct "list buckets" endpoint
        # We'll try common bucket names
        return []
    except:
        return []


def migrate_bucket(source_client: Client, dest_client: Client, bucket_name: str, temp_dir: str) -> dict:
    """Migrate all files from one bucket to another."""
    print(f"\n📦 Migrating bucket: {bucket_name}")
    
    # Check if bucket exists in source
    try:
        source_client.storage.from_(bucket_name).list(limit=1)
    except Exception as e:
        error_str = str(e).lower()
        if "not found" in error_str or "404" in error_str:
            print(f"   ℹ️  Bucket {bucket_name} doesn't exist in source, skipping")
            return {"total": 0, "success": 0, "failed": 0}
        # Other error - might exist but empty, continue
    
    # Check if bucket exists in destination
    if not check_bucket_exists(dest_client, bucket_name):
        print(f"   ❌ Bucket '{bucket_name}' doesn't exist in destination!")
        print(f"   💡 Please create it manually:")
        print(f"      1. Go to destination Supabase Dashboard → Storage")
        print(f"      2. Click 'New bucket'")
        print(f"      3. Name: {bucket_name}")
        print(f"      4. Make it Public (if you want public URLs)")
        print(f"      5. Click 'Create bucket'")
        print(f"   ⚠️  Skipping {bucket_name} - create bucket and run again")
        return {"total": 0, "success": 0, "failed": 0}
    
    # List all files in source bucket
    print(f"   📋 Listing files in source bucket...")
    source_files = list_bucket_files(source_client, bucket_name)
    
    if not source_files:
        print(f"   ℹ️  No files found in {bucket_name}")
        return {"total": 0, "success": 0, "failed": 0}
    
    print(f"   📊 Found {len(source_files)} files")
    
    # Migrate each file
    success_count = 0
    failed_count = 0
    
    for i, file_info in enumerate(source_files, 1):
        file_path = file_info["path"]
        file_size = file_info.get("size", 0)
        size_mb = file_size / (1024 * 1024) if file_size > 0 else 0
        
        print(f"   [{i}/{len(source_files)}] {file_path} ({size_mb:.2f} MB)", end=" ... ")
        
        # Download from source
        local_file = os.path.join(temp_dir, file_path.replace("/", "_"))
        if not download_file(source_client, bucket_name, file_path, local_file):
            print("❌ Download failed")
            failed_count += 1
            continue
        
        # Upload to destination
        # Determine content type from file extension
        content_type = None
        if file_path.endswith(".jpg") or file_path.endswith(".jpeg"):
            content_type = "image/jpeg"
        elif file_path.endswith(".png"):
            content_type = "image/png"
        elif file_path.endswith(".gif"):
            content_type = "image/gif"
        elif file_path.endswith(".webp"):
            content_type = "image/webp"
        elif file_path.endswith(".pdf"):
            content_type = "application/pdf"
        
        if upload_file(dest_client, bucket_name, file_path, local_file, content_type):
            print("✅")
            success_count += 1
        else:
            print("❌ Upload failed")
            failed_count += 1
        
        # Clean up local file
        try:
            os.remove(local_file)
        except:
            pass
    
    return {
        "total": len(source_files),
        "success": success_count,
        "failed": failed_count
    }


def main():
    """Main migration function."""
    print("=" * 60)
    print("🚀 Supabase Storage Migration")
    print("=" * 60)
    print()
    
    # Connect to Supabase instances
    print("📡 Connecting to Supabase instances...")
    source_client = get_source_supabase()
    dest_client = get_dest_supabase()
    
    if not source_client or not dest_client:
        print("❌ Failed to connect to Supabase instances")
        return
    
    print("✅ Connected to both Supabase instances")
    print()
    
    # Detect buckets from source
    print("📋 Detecting buckets in source...")
    
    # Common buckets to check
    common_buckets = [
        "images",  # Main bucket (contains categories/, products/, etc.)
        "product-images",
        "resumes",
        "uploads",
        "categories",
        "testimonials",
    ]
    
    # Check which buckets exist in source
    buckets_to_migrate = []
    for bucket in common_buckets:
        if check_bucket_exists(source_client, bucket):
            buckets_to_migrate.append(bucket)
            print(f"   ✅ Found: {bucket}")
        else:
            print(f"   ⏭️  Not found: {bucket}")
    
    if not buckets_to_migrate:
        print("   ⚠️  No buckets found in source!")
        print("   💡 Make sure SOURCE_SUPABASE_KEY is a service_role key")
        return
    
    print(f"\n📋 Will migrate {len(buckets_to_migrate)} bucket(s)")
    print()
    
    # Ask for confirmation
    confirm = input("⚠️  This will migrate all files. Continue? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("❌ Migration cancelled")
        return
    
    # Create temporary directory for downloads
    temp_dir = tempfile.mkdtemp(prefix="supabase_storage_migration_")
    
    try:
        print("\n🚀 Starting migration...")
        print("=" * 60)
        
        total_stats = {"total": 0, "success": 0, "failed": 0}
        
        # Migrate each bucket
        for bucket in buckets_to_migrate:
            stats = migrate_bucket(source_client, dest_client, bucket, temp_dir)
            total_stats["total"] += stats["total"]
            total_stats["success"] += stats["success"]
            total_stats["failed"] += stats["failed"]
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Migration Summary")
        print("=" * 60)
        print(f"📦 Total files: {total_stats['total']}")
        print(f"✅ Successfully migrated: {total_stats['success']}")
        print(f"❌ Failed: {total_stats['failed']}")
        print()
        
        if total_stats["failed"] > 0:
            print("⚠️  Some files failed to migrate. Check errors above.")
        else:
            print("✅ All files migrated successfully!")
        
        print()
        print("💡 Next Steps:")
        print("   1. Verify files in destination Supabase Dashboard → Storage")
        print("   2. Update SUPABASE_URL in .env to point to destination")
        print("   3. Test your application with the new storage")
        print()
        
    finally:
        # Clean up temporary directory
        try:
            shutil.rmtree(temp_dir)
        except:
            pass


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Migration cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

