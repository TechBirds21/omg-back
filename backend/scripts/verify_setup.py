"""
Verify complete setup - Database, Payment Gateways, Backend
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.services.db_service import db_service
from dotenv import load_dotenv

load_dotenv()


def check_database():
    """Check database connection and tables."""
    print("=" * 70)
    print("Database Check")
    print("=" * 70)
    print()
    
    settings = get_settings()
    print(f"Database Preference: {settings.database_preference}")
    print(f"SUPABASE_URL: {settings.supabase_url[:50] + '...' if settings.supabase_url else 'Not set'}")
    print()
    
    if not db_service.is_available():
        print("ERROR: Database NOT connected")
        return False
    
    print(f"OK: Database Connected - {db_service.get_service_name()}")
    print()
    
    # Check required tables
    required_tables = [
        "categories",
        "products",
        "orders",
        "payment_webhooks",
        "payment_sessions",
        "websocket_connections",
    ]
    
    print("Checking tables:")
    all_exist = True
    for table in required_tables:
        try:
            if table == "categories":
                result = db_service.get_categories()
                print(f"  OK: {table} ({len(result)} rows)")
            elif table == "products":
                result = db_service.get_products(limit=1)
                print(f"  OK: {table} (accessible)")
            elif table == "orders":
                result = db_service.admin_get_all("orders")
                print(f"  OK: {table} (accessible, {len(result) if result else 0} rows)")
            elif table == "payment_webhooks":
                result = db_service.admin_get_all("payment_webhooks")
                print(f"  OK: {table} (accessible, {len(result) if result else 0} rows)")
            elif table == "payment_sessions":
                result = db_service.admin_get_all("payment_sessions")
                print(f"  OK: {table} (accessible, {len(result) if result else 0} rows)")
            elif table == "websocket_connections":
                result = db_service.admin_get_all("websocket_connections")
                print(f"  OK: {table} (accessible, {len(result) if result else 0} rows)")
        except Exception as e:
            print(f"  ERROR: {table} - {str(e)[:100]}")
            all_exist = False
    
    print()
    return all_exist


def check_payment_configs():
    """Check payment gateway configurations."""
    print("=" * 70)
    print("Payment Gateway Configuration Check")
    print("=" * 70)
    print()
    
    if not db_service.is_available():
        print("ERROR: Database not available - cannot check payment configs")
        return False
    
    gateways = ["easebuzz", "zohopay"]
    all_configured = True
    
    for gateway in gateways:
        try:
            configs = db_service.admin_get_all("payment_config", filters={"payment_method": gateway})
            if configs and len(configs) > 0:
                config = configs[0]
                is_active = config.get("is_active", False)
                encrypted_keys = config.get("encrypted_keys", {})
                
                if is_active and encrypted_keys:
                    print(f"OK: {gateway} - Configured and Active")
                else:
                    print(f"WARNING: {gateway} - Configured but not active")
                    all_configured = False
            else:
                print(f"WARNING: {gateway} - Not configured")
                all_configured = False
        except Exception as e:
            print(f"ERROR: {gateway} - {str(e)[:100]}")
            all_configured = False
    
    print()
    return all_configured


def check_backend_routes():
    """Check if backend routes are registered."""
    print("=" * 70)
    print("Backend Routes Check")
    print("=" * 70)
    print()
    
    try:
        from app.main import app
        routes = [r.path for r in app.routes]
        
        required_routes = [
            "/healthz",
            "/api/payments/easebuzz/initiate",
            "/api/payments/easebuzz/webhook",
            "/api/payments/zohopay/initiate",
            "/api/payments/zohopay/webhook",
            "/api/ws/payment-status/{order_id}",
        ]
        
        all_present = True
        for route in required_routes:
            # Check if route exists (handle path parameters)
            route_base = route.split("{")[0]
            found = any(route_base in r for r in routes)
            if found:
                print(f"OK: {route}")
            else:
                print(f"ERROR: {route} - Not found")
                all_present = False
        
        print()
        print(f"Total routes registered: {len(routes)}")
        print()
        return all_present
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False


def main():
    """Main verification."""
    print()
    print("=" * 70)
    print("Complete Setup Verification")
    print("=" * 70)
    print()
    
    db_ok = check_database()
    config_ok = check_payment_configs()
    routes_ok = check_backend_routes()
    
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print()
    
    if db_ok:
        print("OK: Database connection and tables")
    else:
        print("ERROR: Database issues - fix before proceeding")
    
    if config_ok:
        print("OK: Payment gateway configurations")
    else:
        print("WARNING: Payment gateways not fully configured")
    
    if routes_ok:
        print("OK: Backend routes registered")
    else:
        print("ERROR: Backend routes missing")
    
    print()
    
    if db_ok and routes_ok:
        print("SUCCESS: Backend is ready!")
        print()
        print("Next steps:")
        print("1. Start backend: python -m uvicorn app.main:app --reload")
        print("2. Configure payment gateways if not done")
        print("3. Test endpoints: http://localhost:8000/docs")
    else:
        print("ERROR: Setup incomplete - fix issues above")
    
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()

