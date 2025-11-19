"""
Complete setup for new database.

This script helps you:
1. Update SUPABASE_KEY to match new database
2. Create all tables
3. Migrate data
4. Fix RLS policies

Usage:
    python -m scripts.complete_new_db_setup
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()


def check_current_config():
    """Check current configuration."""
    print("=" * 70)
    print("🔍 Current Configuration")
    print("=" * 70)
    print()
    
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    
    print(f"SUPABASE_URL: {url}")
    if url:
        # Extract project ID
        if "supabase.co" in url:
            project_id = url.split("//")[1].split(".")[0] if "." in url.split("//")[1] else "unknown"
            print(f"   Project ID: {project_id}")
    
    print(f"SUPABASE_KEY: {'Set' if key else 'Not set'}")
    if key:
        key_length = len(key)
        print(f"   Key length: {key_length} characters")
        if key_length < 100:
            print("   ⚠️  Key seems too short (should be 200+ for service_role)")
    
    print()
    return url, key


def provide_setup_steps():
    """Provide complete setup steps."""
    print("=" * 70)
    print("📋 Complete Setup Steps for New Database")
    print("=" * 70)
    print()
    
    print("Step 1: Get New Database Credentials")
    print("-" * 70)
    print("1. Go to your NEW Supabase project dashboard")
    print("2. Go to Settings → API")
    print("3. Copy:")
    print("   • Project URL → This is your new SUPABASE_URL")
    print("   • anon public key → This is your new SUPABASE_KEY")
    print()
    
    print("Step 2: Update .env File")
    print("-" * 70)
    print("Update backend/.env with new credentials:")
    print()
    print("SUPABASE_URL=https://your-new-project.supabase.co")
    print("SUPABASE_KEY=your_new_anon_key_here")
    print("DATABASE_PREFERENCE=supabase")
    print()
    
    print("Step 3: Create Tables")
    print("-" * 70)
    print("1. Open: backend/db/schema_supabase.sql")
    print("2. Copy all SQL")
    print("3. Go to NEW Supabase → SQL Editor")
    print("4. Paste and Run")
    print()
    
    print("Step 4: Migrate Data (Optional)")
    print("-" * 70)
    print("If you want to copy data from old database:")
    print("1. Add to .env:")
    print("   SOURCE_SUPABASE_URL=https://old-project.supabase.co")
    print("   SOURCE_SUPABASE_KEY=old_anon_key")
    print("2. Run: python -m scripts.migrate_supabase_to_supabase")
    print()
    
    print("Step 5: Fix RLS Policies")
    print("-" * 70)
    print("1. Open: backend/scripts/fix_storage_rls_quick.sql")
    print("2. Copy all SQL")
    print("3. Go to NEW Supabase → SQL Editor")
    print("4. Paste and Run")
    print()
    
    print("Step 6: Restart Backend")
    print("-" * 70)
    print("Restart the backend server:")
    print("   python -m uvicorn app.main:app --reload")
    print()


def main():
    """Main function."""
    print()
    print("=" * 70)
    print("🚀 Complete New Database Setup")
    print("=" * 70)
    print()
    
    # Check current config
    url, key = check_current_config()
    
    # Check if there's a mismatch
    if url and "sqmkdczbkfmgdlbotdtf" in url:
        print("✅ SUPABASE_URL points to new database")
        if key and "yxaohpktlgkspapnhbwa" in key:
            print("❌ SUPABASE_KEY is from OLD database!")
            print("   This is the problem - you need the key from NEW database")
            print()
        elif not key:
            print("❌ SUPABASE_KEY not set!")
            print()
        else:
            print("✅ SUPABASE_KEY set (verify it's from new database)")
            print()
    
    # Provide setup steps
    provide_setup_steps()
    
    print("=" * 70)
    print("✅ After completing all steps:")
    print("=" * 70)
    print("1. Run: python -m scripts.setup_new_database")
    print("2. Verify database connection works")
    print("3. Test API: http://localhost:8000/api/store/categories")
    print("4. Frontend should work!")
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

