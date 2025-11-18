"""Test all API endpoints to find 404s"""

import requests
import json

BASE_URL = "http://localhost:8000"

# Endpoints to test
endpoints = [
    "/healthz",
    "/api/store/categories",
    "/api/store/products",
    "/api/store/products?limit=8",
    "/api/store/products?limit=20",
    "/api/store/products?newCollection=true",
    "/api/store/products?featured=true",
    "/api/store/offers",
    "/api/store/settings",
    "/api/store/testimonials",
    "/api/store/products/best-sellers",
    "/api/store/products/new-arrivals",
    "/api/admin/settings",
    "/api/admin/categories",
    "/api/admin/products",
    "/api/payments/easebuzz/initiate",
    "/api/payments/zohopay/initiate",
    "/api/ws/payment-status/TEST_001/poll",
]

print("=" * 70)
print("Testing All API Endpoints")
print("=" * 70)
print()

failed = []
success = []

for endpoint in endpoints:
    try:
        url = f"{BASE_URL}{endpoint}"
        # Skip POST endpoints for now
        if "initiate" in endpoint:
            print(f"⏭️  SKIP (POST): {endpoint}")
            continue
            
        response = requests.get(url, timeout=5)
        status = response.status_code
        
        if status == 200:
            print(f"✅ {endpoint:50} {status}")
            success.append(endpoint)
        elif status == 404:
            print(f"❌ {endpoint:50} {status} - NOT FOUND")
            failed.append(endpoint)
        else:
            print(f"⚠️  {endpoint:50} {status}")
            failed.append(endpoint)
    except Exception as e:
        print(f"❌ {endpoint:50} ERROR - {str(e)[:50]}")
        failed.append(endpoint)

print()
print("=" * 70)
print("Summary")
print("=" * 70)
print(f"✅ Success: {len(success)}")
print(f"❌ Failed: {len(failed)}")

if failed:
    print("\nFailed endpoints:")
    for ep in failed:
        print(f"  - {ep}")

