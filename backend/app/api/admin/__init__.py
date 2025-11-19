from fastapi import APIRouter

from . import (
    settings,
    dashboard,
    products,
    orders,
    customers,
    categories,
    testimonials,
    inventory,
    vendors,
    deliveries,
    delivery_areas,
    contact_submissions,
    offers,
    analytics,
    store_sales,
)

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(settings.router, prefix="/settings")
router.include_router(dashboard.router)
router.include_router(products.router)
router.include_router(orders.router)
router.include_router(customers.router)
router.include_router(categories.router)
router.include_router(testimonials.router)
router.include_router(inventory.router)
router.include_router(vendors.router)
router.include_router(deliveries.router)
router.include_router(delivery_areas.router)
router.include_router(contact_submissions.router)
router.include_router(offers.router)
router.include_router(analytics.router)
router.include_router(store_sales.router)


