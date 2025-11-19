#!/usr/bin/env python3
"""Quick test script to verify Supabase connection."""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from dotenv import load_dotenv
    from supabase import create_client
    load_dotenv()
    
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    print("=" * 60)
    print("🔍 Testing Supabase Connection")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERROR: Missing credentials in .env")
        sys.exit(1)
    
    print(f"✅ URL: {SUPABASE_URL}")
    print(f"✅ Key: {SUPABASE_KEY[:20]}...")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Test categories
    cats = supabase.table("categories").select("*").limit(3).execute()
    print(f"✅ Categories: {len(cats.data)}")
    
    # Test products
    prods = supabase.table("products").select("*").eq("is_active", True).limit(3).execute()
    print(f"✅ Products: {len(prods.data)}")
    
    print("\n🎉 CONNECTION SUCCESS!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    sys.exit(1)
