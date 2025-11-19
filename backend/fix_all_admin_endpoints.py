"""
Fix all admin endpoints to use db_service admin methods properly.
"""

import re
from pathlib import Path

admin_dir = Path(__file__).parent / "app" / "api" / "admin"

# Mapping of table operations to db_service methods
replacements = [
    # Get all patterns
    (r'db_service\.table\("(\w+)"\)\.select\("\*"\)\.order\("(\w+)"[^)]*\)\.execute\(\)', 
     lambda m: f'db_service.admin_get_all("{m.group(1)}", order_by="{m.group(2)}", desc=True)'),
    
    # Get by ID patterns  
    (r'db_service\.table\("(\w+)"\)\.select\("\*"\)\.eq\("id",\s*(\w+)\)\.single\(\)\.execute\(\)',
     lambda m: f'db_service.admin_get_by_id("{m.group(1)}", {m.group(2)})'),
    
    # Insert patterns
    (r'db_service\.table\("(\w+)"\)\.insert\((\w+)\)\.execute\(\)',
     lambda m: f'db_service.admin_create("{m.group(1)}", {m.group(2)})'),
    
    # Update patterns
    (r'db_service\.table\("(\w+)"\)\.update\((\w+)\)\.eq\("id",\s*(\w+)\)\.execute\(\)',
     lambda m: f'db_service.admin_update("{m.group(1)}", {m.group(3)}, {m.group(2)})'),
    
    # Delete patterns
    (r'db_service\.table\("(\w+)"\)\.delete\(\)\.eq\("id",\s*(\w+)\)\.execute\(\)',
     lambda m: f'db_service.admin_delete("{m.group(1)}", {m.group(2)})'),
]

def fix_file(file_path: Path):
    """Fix a single admin file."""
    if not file_path.exists():
        return False
    
    content = file_path.read_text(encoding='utf-8')
    original = content
    
    # Simple replacements first
    content = content.replace('response.data if response.data else []', '')
    content = content.replace('if response.data:', 'if created:')
    content = content.replace('return response.data[0]', 'return created')
    content = content.replace('Error fetching.*from Supabase', 'Error fetching')
    content = content.replace('Error creating.*in Supabase', 'Error creating')
    content = content.replace('Error updating.*in Supabase', 'Error updating')
    content = content.replace('Error deleting.*in Supabase', 'Error deleting')
    
    if content != original:
        file_path.write_text(content, encoding='utf-8')
        print(f"✅ Fixed: {file_path.name}")
        return True
    return False

# Fix all admin files
files = list(admin_dir.glob("*.py"))
for file_path in files:
    if file_path.name != "__init__.py":
        fix_file(file_path)

print("Done! Some files may need manual review for complex queries.")

