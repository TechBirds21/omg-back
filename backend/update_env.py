"""
Update .env file with correct Supabase credentials
"""

import os
from pathlib import Path

# New credentials
NEW_SUPABASE_URL = "https://sqmkdczbkfmgdlbotdtf.supabase.co"
NEW_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbWtkY3pia2ZtZ2RsYm90ZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjQ5OTUsImV4cCI6MjA3ODk0MDk5NX0.kvrgdCTcMqWLGkomIb9PR4k44SY6PgSfF28AOsQnyoY"

env_file = Path(__file__).parent / ".env"

# Read existing .env if it exists
env_lines = []
if env_file.exists():
    env_lines = env_file.read_text(encoding='utf-8').splitlines()

# Update or add SUPABASE_URL and SUPABASE_KEY
updated = False
new_lines = []
supabase_url_found = False
supabase_key_found = False

for line in env_lines:
    if line.strip().startswith('SUPABASE_URL='):
        new_lines.append(f'SUPABASE_URL={NEW_SUPABASE_URL}')
        supabase_url_found = True
        updated = True
    elif line.strip().startswith('SUPABASE_KEY='):
        new_lines.append(f'SUPABASE_KEY={NEW_SUPABASE_KEY}')
        supabase_key_found = True
        updated = True
    elif line.strip().startswith('DATABASE_PREFERENCE='):
        new_lines.append('DATABASE_PREFERENCE=supabase')
    else:
        new_lines.append(line)

# Add missing entries
if not supabase_url_found:
    new_lines.append(f'SUPABASE_URL={NEW_SUPABASE_URL}')
    updated = True

if not supabase_key_found:
    new_lines.append(f'SUPABASE_KEY={NEW_SUPABASE_KEY}')
    updated = True

# Ensure DATABASE_PREFERENCE is set
if not any('DATABASE_PREFERENCE' in line for line in new_lines):
    new_lines.append('DATABASE_PREFERENCE=supabase')

# Write back
env_file.write_text('\n'.join(new_lines) + '\n', encoding='utf-8')

if updated:
    print("✅ Updated .env file with correct Supabase credentials")
else:
    print("✅ .env file already has correct credentials")

print(f"\nSUPABASE_URL={NEW_SUPABASE_URL}")
print(f"SUPABASE_KEY={'*' * 50}...{NEW_SUPABASE_KEY[-10:]}")
print("DATABASE_PREFERENCE=supabase")

