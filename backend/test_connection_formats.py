"""
Test different connection string formats for Render PostgreSQL.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# Base connection info
user = "omgdb_user"
password = "hN87aTqwoyrnaEMTDUO7nyUU93hDT3pP"
host = "dpg-d43v9f0dl3ps73aarjsg-a"
database = "omgdb"

# Try different formats
formats_to_try = [
    f"postgresql://{user}:{password}@{host}:5432/{database}",
    f"postgresql://{user}:{password}@{host}.render.com:5432/{database}",
    f"postgresql://{user}:{password}@{host}.oregon-postgres.render.com:5432/{database}",
    f"postgresql://{user}:{password}@{host}.a.oregon-postgres.render.com:5432/{database}",
    f"postgresql://{user}:{password}@{host}-a.oregon-postgres.render.com:5432/{database}",
]

print("=" * 60)
print("🧪 Testing Connection String Formats")
print("=" * 60)
print()

for i, conn_str in enumerate(formats_to_try, 1):
    print(f"Testing format {i}/{len(formats_to_try)}:")
    print(f"  {conn_str.split('@')[1] if '@' in conn_str else conn_str}")
    
    try:
        engine = create_engine(
            conn_str,
            poolclass=NullPool,
            echo=False,
            connect_args={"connect_timeout": 5}
        )
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"  ✅ SUCCESS!")
            print(f"  PostgreSQL: {version.split(',')[0]}")
            print()
            print("=" * 60)
            print("🎉 Working Connection String Found!")
            print("=" * 60)
            print(f"Use this in your .env file:")
            print(f"DATABASE_URL={conn_str}")
            print()
            
            # Update .env file
            from pathlib import Path
            env_path = Path(__file__).parent / ".env"
            if env_path.exists():
                # Read existing content
                with open(env_path, "r") as f:
                    content = f.read()
                
                # Replace DATABASE_URL
                import re
                content = re.sub(
                    r'DATABASE_URL=.*',
                    f'DATABASE_URL={conn_str}',
                    content
                )
                
                # Write back
                with open(env_path, "w") as f:
                    f.write(content)
                
                print(f"✅ Updated .env file with working connection string")
            
            exit(0)
            
    except Exception as e:
        error_msg = str(e)
        if "could not translate host name" in error_msg:
            print(f"  ❌ DNS resolution failed")
        elif "Connection refused" in error_msg or "connection" in error_msg.lower():
            print(f"  ❌ Connection refused")
        else:
            print(f"  ❌ {error_msg[:80]}...")
        print()

print("=" * 60)
print("❌ None of the formats worked")
print("=" * 60)
print()
print("📝 Please check your Render dashboard:")
print("1. Go to your PostgreSQL database")
print("2. Click on 'Connections' or 'Info' tab")
print("3. Copy the 'External Database URL'")
print("4. It should include a port number (usually 5432)")
print("5. Update DATABASE_URL in your .env file")
print()
print("The connection string should look like:")
print("postgresql://user:password@hostname:port/database")

