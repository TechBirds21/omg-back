from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback

from .config import get_settings
from .routers import health, phonepe
from .api import admin as admin_api
from .api import storefront, customer
from .api import store_billing
from .api.payments import router as payments_router
from .services.db_service import db_service
from .services.storage import storage_client


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Handle all unhandled exceptions."""
        print(f"Unhandled exception: {exc}")
        print(f"Request path: {request.url.path}")
        traceback.print_exc()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Internal server error: {str(exc)}",
                "path": request.url.path,
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle validation errors."""
        print(f"Validation error: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )

    app.include_router(health.router)
    app.include_router(phonepe.router, prefix="/payments/phonepe", tags=["phonepe"])
    app.include_router(payments_router, prefix="/api")
    app.include_router(storefront.router, prefix="/api")
    app.include_router(admin_api.router, prefix="/api")
    app.include_router(customer.router, prefix="/api")
    app.include_router(store_billing.router, prefix="/api")

    # Log startup information
    @app.on_event("startup")
    async def startup_event():
        print("=" * 60)
        print(f"🚀 {settings.app_name} starting up...")
        print("=" * 60)
        
        # Database status
        if db_service.is_available():
            print(f"✅ Database: {db_service.get_service_name()}")
        else:
            print("⚠️  Database: Not configured (using fixtures)")
        
        # Storage status
        try:
            storage_client._verify_settings()
            print(f"✅ Storage: Cloudflare R2 ({storage_client.settings.r2_bucket_name})")
        except RuntimeError:
            print("⚠️  Storage: Cloudflare R2 not configured")
        
        print("=" * 60)

    return app


app = create_app()


