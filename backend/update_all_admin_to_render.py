"""
Comprehensive script to update ALL admin endpoints to use Render DB (db_service).
This replaces all Supabase calls with db_service admin methods.
"""

import re
from pathlib import Path

admin_dir = Path(__file__).parent / "app" / "api" / "admin"

def update_admin_file(file_path: Path):
    """Update a single admin file to use db_service."""
    if not file_path.exists():
        return False
    
    content = file_path.read_text(encoding='utf-8')
    original = content
    
    # 1. Replace import
    content = content.replace(
        "from ...services.supabase_client import supabase_service",
        "from ...services.db_service import db_service"
    )
    
    # 2. Replace is_available checks
    content = content.replace("supabase_service.is_available()", "db_service.is_available()")
    
    # 3. Replace common patterns
    # Get all with order
    content = re.sub(
        r'supabase_service\.client\.table\("(\w+)"\)\.select\("\*"\)\.order\("([^"]+)"[^)]*\)\.execute\(\)',
        r'db_service.admin_get_all("\1", order_by="\2", desc=True)',
        content
    )
    
    # Get by ID
    content = re.sub(
        r'supabase_service\.client\.table\("(\w+)"\)\.select\("\*"\)\.eq\("id",\s*(\w+)\)\.single\(\)\.execute\(\)',
        r'db_service.admin_get_by_id("\1", \2)',
        content
    )
    
    # Insert
    content = re.sub(
        r'supabase_service\.client\.table\("(\w+)"\)\.insert\((\w+)\)\.execute\(\)',
        r'db_service.admin_create("\1", \2)',
        content
    )
    
    # Update
    content = re.sub(
        r'supabase_service\.client\.table\("(\w+)"\)\.update\((\w+)\)\.eq\("id",\s*(\w+)\)\.execute\(\)',
        r'db_service.admin_update("\1", \3, \2)',
        content
    )
    
    # Delete
    content = re.sub(
        r'supabase_service\.client\.table\("(\w+)"\)\.delete\(\)\.eq\("id",\s*(\w+)\)\.execute\(\)',
        r'db_service.admin_delete("\1", \2)',
        content
    )
    
    # Fix response.data patterns
    content = content.replace("response.data if response.data else []", "")
    content = content.replace("if response.data:", "if created:")
    content = content.replace("if response.data:", "if updated:")
    content = content.replace("return response.data[0]", "return created")
    content = content.replace("return response.data[0]", "return updated")
    
    # Fix error messages
    content = content.replace("from Supabase", "")
    content = content.replace("in Supabase", "")
    
    if content != original:
        file_path.write_text(content, encoding='utf-8')
        print(f"✅ Updated: {file_path.name}")
        return True
    else:
        print(f"⏭️  No changes needed: {file_path.name}")
        return False

# Update all admin files
print("Updating all admin endpoints to use Render DB...")
print("=" * 60)

files_updated = 0
for file_path in sorted(admin_dir.glob("*.py")):
    if file_path.name != "__init__.py":
        if update_admin_file(file_path):
            files_updated += 1

print("=" * 60)
print(f"✅ Updated {files_updated} files")
print("\n📝 Note: Some complex queries may need manual review.")
print("   Check files with custom filters or joins.")

