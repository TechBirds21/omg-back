"""
Execute RLS fix SQL directly via Supabase REST API.

This script uses the service_role key to execute SQL that creates RLS policies.

Usage:
    python -m scripts.execute_rls_fix
"""

import os
import sys
import requests
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()


def execute_sql_via_rest(url: str, service_role_key: str, sql: str) -> bool:
    """Execute SQL via Supabase REST API using service_role key."""
    try:
        # Use Supabase REST API to execute SQL
        # Note: This requires the service_role key
        headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }
        
        # Supabase REST API endpoint for SQL execution
        # We'll use the PostgREST API with rpc or direct SQL
        # Actually, Supabase doesn't expose SQL execution via REST easily
        # So we'll provide instructions to use the Management API or SQL Editor
        
        print("⚠️  Supabase doesn't allow direct SQL execution via REST API")
        print("   You need to run the SQL manually in SQL Editor")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Main function."""
    print("=" * 70)
    print("🔧 Execute RLS Fix SQL")
    print("=" * 70)
    print()
    
    # Get credentials
    url = os.getenv("DEST_SUPABASE_URL")
    key = os.getenv("DEST_SUPABASE_KEY")
    
    if not url or not key:
        print("❌ DEST_SUPABASE_URL and DEST_SUPABASE_KEY must be set in .env")
        return
    
    # Check if it's service_role key
    if "service_role" not in key.lower() and len(key) < 100:
        print("⚠️  Warning: You might not be using service_role key")
        print("   Service role keys are longer and contain 'service_role'")
        print("   Get it from: Supabase Dashboard → Settings → API → service_role")
        print()
        response = input("Continue anyway? (yes/no): ").strip().lower()
        if response != "yes":
            return
    
    # Read SQL file
    sql_file = Path(__file__).parent / "fix_storage_rls.sql"
    if not sql_file.exists():
        print(f"❌ SQL file not found: {sql_file}")
        return
    
    sql = sql_file.read_text(encoding="utf-8")
    
    print("📋 SQL to Execute:")
    print("-" * 70)
    print(sql[:500] + "..." if len(sql) > 500 else sql)
    print("-" * 70)
    print()
    
    print("📝 Manual Steps (Required):")
    print()
    print("1. Open your destination Supabase Dashboard")
    print("2. Click 'SQL Editor' in the left sidebar")
    print("3. Click 'New query' (or the '+' button)")
    print("4. Copy the SQL from: backend/scripts/fix_storage_rls.sql")
    print("5. Paste into the SQL Editor")
    print("6. Click 'Run' (or press Ctrl+Enter)")
    print("7. Wait for 'Success' message")
    print()
    
    print("💡 Quick Copy:")
    print(f"   File location: {sql_file}")
    print()
    
    # Try to open the file (if possible)
    try:
        import webbrowser
        import subprocess
        import platform
        
        print("🔗 Opening SQL file...")
        if platform.system() == "Windows":
            os.startfile(str(sql_file))
        elif platform.system() == "Darwin":  # macOS
            subprocess.run(["open", str(sql_file)])
        else:  # Linux
            subprocess.run(["xdg-open", str(sql_file)])
        print("✅ SQL file opened - copy the contents")
    except:
        print("   (Could not open file automatically)")
    
    print()
    print("=" * 70)
    print("✅ After running the SQL:")
    print("=" * 70)
    print("1. Verify policies were created:")
    print("   → Go to Storage → images bucket → Policies tab")
    print("   → You should see 4 policies")
    print()
    print("2. Run migration again:")
    print("   python -m scripts.migrate_storage")
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

