"""
Helper to fix Render PostgreSQL connection string format.
Render connection strings should include the port number.
"""

# Your original connection string
original = "postgresql://omgdb_user:hN87aTqwoyrnaEMTDUO7nyUU93hDT3pP@dpg-d43v9f0dl3ps73aarjsg-a/omgdb"

print("=" * 60)
print("🔍 Analyzing Connection String")
print("=" * 60)
print(f"Original: {original}")
print()

# Parse the connection string
import re
match = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)', original)

if match:
    user, password, host, port, database = match.groups()
    print(f"User: {user}")
    print(f"Password: {'*' * len(password)}")
    print(f"Host: {host}")
    print(f"Port: {port or 'MISSING'}")
    print(f"Database: {database}")
    print()
    
    if not port:
        print("⚠️  Port number is missing!")
        print("Render PostgreSQL typically uses port 5432")
        print()
        
        # Try with port 5432
        fixed = f"postgresql://{user}:{password}@{host}:5432/{database}"
        print(f"✅ Fixed connection string (with port 5432):")
        print(f"   {fixed}")
        print()
        
        # Also check if hostname needs .render.com suffix
        if not host.endswith('.render.com') and not '.' in host:
            print("⚠️  Hostname might need full domain")
            print("Render hostnames usually end with .render.com")
            print()
            print("Possible formats to try:")
            print(f"   1. {fixed}")
            print(f"   2. postgresql://{user}:{password}@{host}.render.com:5432/{database}")
            print(f"   3. postgresql://{user}:{password}@{host}.oregon-postgres.render.com:5432/{database}")
            print()
            print("📝 Please check your Render dashboard for the correct connection string.")
            print("   It should be in the format:")
            print("   postgresql://user:password@hostname:port/database")
    else:
        print("✅ Connection string format looks correct")
        print(f"   Using: {original}")
else:
    print("❌ Could not parse connection string")
    print("Expected format: postgresql://user:password@host:port/database")

print()
print("=" * 60)
print("💡 Next Steps")
print("=" * 60)
print("1. Go to your Render dashboard")
print("2. Find your PostgreSQL database")
print("3. Copy the 'External Database URL' (not Internal)")
print("4. It should look like: postgresql://user:pass@host:5432/db")
print("5. Update DATABASE_URL in your .env file")

