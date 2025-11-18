"""
Run complete migration from Supabase to Render PostgreSQL.
This script sets environment variables and runs the migration.
"""

import os
import sys
from pathlib import Path

# Supabase credentials
os.environ["SUPABASE_URL"] = "https://sqmkdczbkfmgdlbotdtf.supabase.co"
os.environ["SUPABASE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YW9ocGt0bGdrc3BhcG5oYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzA1OTAsImV4cCI6MjA2ODc0NjU5MH0.Ezxz85xISpTXJXj2LZIENv0PflBWxobkTDRKkB0-rec"

# Load DATABASE_URL from .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Verify DATABASE_URL is set
if not os.getenv("DATABASE_URL"):
    print("❌ DATABASE_URL not found in .env")
    print("Please make sure DATABASE_URL is set in backend/.env")
    sys.exit(1)

print("=" * 60)
print("🚀 Starting Complete Migration")
print("=" * 60)
print(f"✅ Supabase URL: {os.environ['SUPABASE_URL']}")
print(f"✅ Render DB: {os.getenv('DATABASE_URL').split('@')[1] if '@' in os.getenv('DATABASE_URL') else 'configured'}")
print()

# Now run the migration
if __name__ == "__main__":
    # Import and run migration
    sys.path.insert(0, str(Path(__file__).parent))
    from scripts.migrate_complete import main
    main()

