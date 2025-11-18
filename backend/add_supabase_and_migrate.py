"""
Add Supabase credentials to .env and run complete migration.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Supabase credentials from README
SUPABASE_URL = "https://sqmkdczbkfmgdlbotdtf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YW9ocGt0bGdrc3BhcG5oYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzA1OTAsImV4cCI6MjA2ODc0NjU5MH0.Ezxz85xISpTXJXj2LZIENv0PflBWxobkTDRKkB0-rec"

def add_supabase_credentials():
    """Add Supabase credentials to .env file."""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print("❌ .env file not found")
        return False
    
    # Read existing content
    with open(env_path, "r") as f:
        content = f.read()
    
    # Check if already exists
    if "SUPABASE_URL" in content and "SUPABASE_KEY" in content:
        # Update if exists
        import re
        content = re.sub(r'SUPABASE_URL=.*', f'SUPABASE_URL={SUPABASE_URL}', content)
        content = re.sub(r'SUPABASE_KEY=.*', f'SUPABASE_KEY={SUPABASE_KEY}', content)
        print("✅ Updated existing Supabase credentials in .env")
    else:
        # Add if doesn't exist
        if not content.endswith("\n"):
            content += "\n"
        content += f"\n# Supabase (for migration)\n"
        content += f"SUPABASE_URL={SUPABASE_URL}\n"
        content += f"SUPABASE_KEY={SUPABASE_KEY}\n"
        print("✅ Added Supabase credentials to .env")
    
    # Write back
    with open(env_path, "w") as f:
        f.write(content)
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 Adding Supabase Credentials")
    print("=" * 60)
    
    if add_supabase_credentials():
        print("\n✅ Credentials added successfully!")
        print("\n📝 Now running migration...")
        print("=" * 60)
        
        # Run migration
        import subprocess
        import sys
        
        result = subprocess.run(
            [sys.executable, "-m", "scripts.migrate_complete"],
            cwd=Path(__file__).parent
        )
        
        sys.exit(result.returncode)
    else:
        print("\n❌ Failed to add credentials")
        sys.exit(1)

