"""
Script to update all admin endpoints to use db_service instead of supabase_service.
This will replace all occurrences in admin API files.
"""

import re
from pathlib import Path

admin_dir = Path(__file__).parent / "app" / "api" / "admin"

# Files to update
files_to_update = [
    "products.py",
    "vendors.py",
    "customers.py",
    "testimonials.py",
    "offers.py",
    "orders.py",
    "delivery_areas.py",
    "deliveries.py",
    "contact_submissions.py",
    "inventory.py",
    "dashboard.py",
    "analytics.py",
]

def update_file(file_path: Path):
    """Update a single file to use db_service."""
    if not file_path.exists():
        print(f"⚠️  File not found: {file_path}")
        return False
    
    content = file_path.read_text(encoding='utf-8')
    original = content
    
    # Replace import
    content = content.replace(
        "from ...services.supabase_client import supabase_service",
        "from ...services.db_service import db_service"
    )
    
    # Replace service calls - this is complex, so we'll do it file by file
    # For now, just replace the import and is_available checks
    content = content.replace("supabase_service.is_available()", "db_service.is_available()")
    content = content.replace("supabase_service.client", "db_service")  # This will need manual fixes
    
    if content != original:
        file_path.write_text(content, encoding='utf-8')
        print(f"✅ Updated: {file_path.name}")
        return True
    else:
        print(f"⏭️  No changes: {file_path.name}")
        return False

if __name__ == "__main__":
    print("Updating admin endpoints to use db_service...")
    for filename in files_to_update:
        file_path = admin_dir / filename
        update_file(file_path)
    print("Done! Note: Some files may need manual fixes for complex queries.")

