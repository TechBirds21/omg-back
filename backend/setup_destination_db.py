"""
Helper script to configure destination Supabase as main database.

Usage:
    python setup_destination_db.py
"""

import os
from pathlib import Path
from dotenv import load_dotenv, set_key

def setup_destination_db():
    """Configure destination Supabase URLs in .env file."""
    env_path = Path(__file__).parent / ".env"
    
    print("=" * 60)
    print("🔧 Setup Destination Database Configuration")
    print("=" * 60)
    print()
    
    # Check if .env exists
    if not env_path.exists():
        print("❌ .env file not found!")
        print("   Please create backend/.env file first")
        return False
    
    # Load existing .env
    load_dotenv(env_path)
    
    print("📋 Current Configuration:")
    print(f"   DEST_SUPABASE_URL: {os.getenv('DEST_SUPABASE_URL', 'Not set')}")
    print(f"   DEST_SUPABASE_KEY: {'Set' if os.getenv('DEST_SUPABASE_KEY') else 'Not set'}")
    print(f"   DEST_DATABASE_URL: {'Set' if os.getenv('DEST_DATABASE_URL') else 'Not set'}")
    print()
    
    # Get destination URLs
    print("🔑 Enter Destination Supabase Credentials:")
    print("   (Get these from: Supabase Dashboard → Settings → API)")
    print()
    
    dest_url = input("Destination SUPABASE_URL (e.g., https://abc123.supabase.co): ").strip()
    if not dest_url:
        print("❌ Destination URL is required")
        return False
    
    dest_key = input("Destination SUPABASE_KEY (anon key): ").strip()
    if not dest_key:
        print("❌ Destination key is required")
        return False
    
    print()
    print("💾 Database Connection String (Optional but recommended):")
    print("   (Get from: Supabase Dashboard → Settings → Database → Connection String → URI)")
    print("   (Leave empty to skip)")
    dest_db_url = input("DEST_DATABASE_URL: ").strip()
    
    # Update .env file
    print()
    print("📝 Updating .env file...")
    
    # Read existing content
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Track what we're updating
    updated = {
        "DEST_SUPABASE_URL": False,
        "DEST_SUPABASE_KEY": False,
        "DEST_DATABASE_URL": False,
        "SUPABASE_URL": False,
        "SUPABASE_KEY": False,
    }
    
    # Update existing lines
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("DEST_SUPABASE_URL="):
            new_lines.append(f"DEST_SUPABASE_URL={dest_url}\n")
            updated["DEST_SUPABASE_URL"] = True
        elif stripped.startswith("DEST_SUPABASE_KEY="):
            new_lines.append(f"DEST_SUPABASE_KEY={dest_key}\n")
            updated["DEST_SUPABASE_KEY"] = True
        elif stripped.startswith("DEST_DATABASE_URL="):
            if dest_db_url:
                new_lines.append(f"DEST_DATABASE_URL={dest_db_url}\n")
                updated["DEST_DATABASE_URL"] = True
            else:
                # Keep existing or skip
                if "=" in stripped:
                    new_lines.append(line)  # Keep existing
        elif stripped.startswith("SUPABASE_URL="):
            # Update to use destination
            new_lines.append(f"SUPABASE_URL={dest_url}\n")
            updated["SUPABASE_URL"] = True
        elif stripped.startswith("SUPABASE_KEY="):
            # Update to use destination
            new_lines.append(f"SUPABASE_KEY={dest_key}\n")
            updated["SUPABASE_KEY"] = True
        else:
            new_lines.append(line)
    
    # Add missing variables
    if not updated["DEST_SUPABASE_URL"]:
        new_lines.append(f"\n# Destination Supabase\nDEST_SUPABASE_URL={dest_url}\n")
    if not updated["DEST_SUPABASE_KEY"]:
        new_lines.append(f"DEST_SUPABASE_KEY={dest_key}\n")
    if dest_db_url and not updated["DEST_DATABASE_URL"]:
        new_lines.append(f"DEST_DATABASE_URL={dest_db_url}\n")
    if not updated["SUPABASE_URL"]:
        new_lines.append(f"\n# Main Application Database\nSUPABASE_URL={dest_url}\n")
    if not updated["SUPABASE_KEY"]:
        new_lines.append(f"SUPABASE_KEY={dest_key}\n")
    
    # Write back
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    
    print("✅ Configuration updated!")
    print()
    print("📋 Updated Variables:")
    print(f"   ✅ DEST_SUPABASE_URL={dest_url}")
    print(f"   ✅ DEST_SUPABASE_KEY={'*' * 20}...")
    if dest_db_url:
        print(f"   ✅ DEST_DATABASE_URL={'*' * 20}...")
    print(f"   ✅ SUPABASE_URL={dest_url} (main app database)")
    print(f"   ✅ SUPABASE_KEY={'*' * 20}... (main app database)")
    print()
    print("🎯 Next Steps:")
    print("   1. Verify tables exist in destination (run schema_supabase.sql if needed)")
    print("   2. Run migration: python -m scripts.migrate_supabase_to_supabase")
    print("   3. Start backend: python -m uvicorn app.main:app --reload")
    print()
    
    return True

if __name__ == "__main__":
    try:
        setup_destination_db()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")

