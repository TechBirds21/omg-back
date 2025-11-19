"""
Quick script to switch database endpoint to destination.

Usage:
    python switch_db_endpoint.py
"""

import os
from pathlib import Path
from dotenv import load_dotenv

def switch_database_endpoint():
    """Switch main database endpoint to destination."""
    env_path = Path(__file__).parent / ".env"
    
    print("=" * 60)
    print("🔄 Switch Database Endpoint")
    print("=" * 60)
    print()
    
    if not env_path.exists():
        print("❌ .env file not found!")
        return False
    
    load_dotenv(env_path)
    
    # Check current config
    current_url = os.getenv("SUPABASE_URL", "Not set")
    print(f"📋 Current Database: {current_url}")
    print()
    
    # Get destination URL
    print("🔑 Enter Destination Supabase Credentials:")
    print("   (Get from: Supabase Dashboard → Settings → API)")
    print()
    
    dest_url = input("Destination SUPABASE_URL: ").strip()
    if not dest_url:
        print("❌ URL is required")
        return False
    
    dest_key = input("Destination SUPABASE_KEY (anon key): ").strip()
    if not dest_key:
        print("❌ Key is required")
        return False
    
    # Read .env file
    with open(env_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Update SUPABASE_URL and SUPABASE_KEY
    lines = content.split("\n")
    updated = False
    
    new_lines = []
    for line in lines:
        if line.strip().startswith("SUPABASE_URL="):
            new_lines.append(f"SUPABASE_URL={dest_url}\n")
            updated = True
        elif line.strip().startswith("SUPABASE_KEY="):
            new_lines.append(f"SUPABASE_KEY={dest_key}\n")
            updated = True
        else:
            new_lines.append(line + "\n" if line else "\n")
    
    # If not found, add them
    if not updated:
        new_lines.append(f"\n# Main Database\nSUPABASE_URL={dest_url}\n")
        new_lines.append(f"SUPABASE_KEY={dest_key}\n")
    
    # Write back
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines([line.rstrip("\n") + "\n" if not line.endswith("\n") else line for line in new_lines])
    
    print()
    print("✅ Database endpoint switched!")
    print(f"   New SUPABASE_URL: {dest_url}")
    print()
    print("🎯 Next Steps:")
    print("   1. Restart backend: python -m uvicorn app.main:app --reload")
    print("   2. Your app will now use the destination database")
    print()
    
    return True

if __name__ == "__main__":
    try:
        switch_database_endpoint()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")

