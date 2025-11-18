"""Script to force configuration to use only Render DB."""

import os
from pathlib import Path

def update_env_file():
    """Update .env file to use Render DB only."""
    env_path = Path(".env")
    
    # Render PostgreSQL connection string (external)
    render_db_url = "postgresql://omgdb_user:hN87aTqwoyrnaEMTDUO7nyUU93hDT3pP@dpg-d43v9f0dl3ps73aarjsg-a.singapore-postgres.render.com/omgdb"
    
    # Read existing .env if it exists
    env_vars = {}
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
    
    # Force Render DB configuration
    env_vars["DATABASE_URL"] = render_db_url
    env_vars["DATABASE_PREFERENCE"] = "render"
    
    # Optionally comment out Supabase (keep for reference but don't use)
    if "SUPABASE_URL" in env_vars:
        print("Note: SUPABASE_URL is set but will be ignored (DATABASE_PREFERENCE=render)")
    if "SUPABASE_KEY" in env_vars:
        print("Note: SUPABASE_KEY is set but will be ignored (DATABASE_PREFERENCE=render)")
    
    # Write updated .env file
    with open(env_path, "w", encoding="utf-8") as f:
        f.write("# Omaguva Backend Configuration\n")
        f.write("# Database: Render PostgreSQL (ONLY)\n")
        f.write(f"DATABASE_URL={render_db_url}\n")
        f.write("DATABASE_PREFERENCE=render\n")
        f.write("\n")
        
        # Write other existing vars (excluding Supabase if user wants to remove them)
        for key, value in env_vars.items():
            if key not in ["DATABASE_URL", "DATABASE_PREFERENCE"]:
                # Comment out Supabase vars but keep them
                if key in ["SUPABASE_URL", "SUPABASE_KEY"]:
                    f.write(f"# {key}={value}  # Commented out - using Render DB only\n")
                else:
                    f.write(f"{key}={value}\n")
    
    print("=" * 60)
    print("✅ Configuration updated to use Render DB ONLY")
    print("=" * 60)
    print(f"DATABASE_URL: {render_db_url[:50]}...")
    print("DATABASE_PREFERENCE: render")
    print("\n⚠️  Supabase credentials are commented out (if present)")
    print("   The application will ONLY use Render PostgreSQL")
    print("=" * 60)

if __name__ == "__main__":
    update_env_file()

