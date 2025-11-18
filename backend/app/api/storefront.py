from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from ..data import CATEGORIES, PINCODE_DETAILS, PRODUCTS, SETTINGS, TESTIMONIALS
from ..services.db_service import db_service
from ..models.responses import sanitize_products, sanitize_product

router = APIRouter(prefix="/store", tags=["storefront"])

_orders: List[Dict[str, Any]] = []


def _filter_products(
    *,
    limit: Optional[int] = None,
    featured: Optional[bool] = None,
    new_collection: Optional[bool] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Filter products from fixture data (fallback)."""
    items = PRODUCTS

    if featured is not None:
        items = [p for p in items if bool(p.get("featured")) is featured]

    if new_collection is not None:
        items = [p for p in items if bool(p.get("new_collection")) is new_collection]

    if category_id:
        items = [p for p in items if p.get("category_id") == category_id]

    if search:
        query = search.lower()
        items = [
            p
            for p in items
            if query in p.get("name", "").lower()
            or query in (p.get("description") or "").lower()
            or any(query in str(color).lower() for color in p.get("colors") or [])
            or query in (p.get("fabric") or "").lower()
        ]

    if limit is not None and limit >= 0:
        items = items[: limit or None]

    return items


@router.get("/products")
async def list_products(
    limit: Optional[int] = Query(None, ge=1),
    featured: Optional[bool] = None,
    new_collection: Optional[bool] = Query(None, alias="newCollection"),
    category_id: Optional[str] = Query(None, alias="categoryId"),
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get products - uses database if available, otherwise falls back to fixtures."""
    if db_service.is_available():
        products = db_service.get_products(
            limit=limit,
            featured=featured,
            new_collection=new_collection,
            category_id=category_id,
            search=search,
        )
        return sanitize_products(products)
    products = _filter_products(
        limit=limit,
        featured=featured,
        new_collection=new_collection,
        category_id=category_id,
        search=search,
    )
    return sanitize_products(products)


@router.get("/products/best-sellers")
async def get_best_sellers(
    limit: Optional[int] = Query(None, ge=1),
) -> List[Dict[str, Any]]:
    """Get best seller products - uses database if available."""
    if db_service.is_available():
        products = db_service.get_best_sellers(limit=limit)
        return sanitize_products(products)
    
    # Fallback to fixtures
    items = [p for p in PRODUCTS if p.get("best_seller") and p.get("is_active")]
    items.sort(key=lambda x: (x.get("best_seller_rank") or 999, x.get("created_at", "")))
    if limit:
        items = items[:limit]
    return sanitize_products(items)


@router.get("/products/new-arrivals")
async def get_new_arrivals(
    limit: Optional[int] = Query(None, ge=1),
) -> List[Dict[str, Any]]:
    """Get new arrival products - uses database if available."""
    if db_service.is_available():
        products = db_service.get_new_arrivals(limit=limit)
        return sanitize_products(products)
    
    # Fallback to fixtures
    from datetime import datetime
    today = datetime.utcnow()
    items = [
        p for p in PRODUCTS
        if p.get("new_collection") and p.get("is_active")
        and (not p.get("new_collection_end_date") or datetime.fromisoformat(p["new_collection_end_date"].replace("Z", "+00:00")) >= today)
    ]
    if limit:
        items = items[:limit]
    return sanitize_products(items)


@router.get("/products/by-name/{product_name}")
async def get_product_by_name(product_name: str) -> Dict[str, Any]:
    """Get product by name - uses database if available."""
    if db_service.is_available():
        product = db_service.get_product_by_name(product_name)
        if product:
            return sanitize_product(product)
    
    decoded = product_name.replace("+", " ")
    product = next(
        (p for p in PRODUCTS if p["name"].lower() == decoded.lower()),
        None,
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return sanitize_product(product)


@router.get("/products/{product_id}/similar")
async def get_similar_products(product_id: str) -> List[Dict[str, Any]]:
    """Get similar products - uses database if available."""
    # First get the current product
    if db_service.is_available():
        current = db_service.get_product_by_id(product_id)
        if current:
            category_id = current.get("category_id")
            # Get products from same category
            related = db_service.get_products(
                category_id=category_id,
                is_active=True,
                limit=10
            )
            # Filter out current product
            related = [p for p in related if p.get("id") != product_id]
            
            # If not enough, supplement with featured products
            if len(related) < 4:
                featured = db_service.get_products(
                    featured=True,
                    is_active=True,
                    limit=10
                )
                ids = {p.get("id") for p in related}
                for item in featured:
                    if item.get("id") != product_id and item.get("id") not in ids:
                        related.append(item)
                        ids.add(item.get("id"))
                    if len(related) >= 4:
                        break
            return sanitize_products(related[:4])
    
    # Fallback to fixtures
    current = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not current:
        raise HTTPException(status_code=404, detail="Product not found")

    category_id = current.get("category_id")
    related = [
        p for p in PRODUCTS if p["id"] != product_id and p.get("category_id") == category_id
    ]
    if len(related) < 4:
        # supplement with featured products
        supplement = [p for p in PRODUCTS if p["id"] != product_id and p.get("featured")]
        ids = {p["id"] for p in related}
        for item in supplement:
            if item["id"] not in ids:
                related.append(item)
                ids.add(item["id"])
            if len(related) >= 4:
                break
    return related[:4]


@router.get("/products/{product_id}")
async def get_product(product_id: str) -> Dict[str, Any]:
    """Get product by ID - uses database if available."""
    if db_service.is_available():
        product = db_service.get_product_by_id(product_id)
        if product:
            return sanitize_product(product)
    
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return sanitize_product(product)


@router.get("/categories")
async def list_categories() -> List[Dict[str, Any]]:
    """Get categories - uses database if available."""
    if db_service.is_available():
        categories = db_service.get_categories()
        print(f"API: Returning {len(categories)} categories from {db_service.get_service_name()}")
        return categories
    print(f"API: Database not available, returning {len(CATEGORIES)} fallback categories")
    return CATEGORIES


@router.get("/testimonials")
async def list_testimonials() -> List[Dict[str, Any]]:
    """Get testimonials - uses database if available."""
    if db_service.is_available():
        return db_service.get_testimonials()
    return [t for t in TESTIMONIALS if t.get("is_active")]


@router.get("/settings")
async def get_settings() -> Dict[str, Any]:
    """Get settings - uses database if available."""
    if db_service.is_available():
        db_settings = db_service.get_settings()
        if db_settings:
            return db_settings
    return SETTINGS


@router.get("/pincodes/{pincode}")
async def get_pincode_details(pincode: str) -> Dict[str, Any]:
    """Get pincode delivery details - uses database if available."""
    if db_service.is_available():
        detail = db_service.get_pincode_details(pincode)
        if detail:
            return detail
    
    # Fallback to fixture data
    detail = next((entry for entry in PINCODE_DETAILS if str(entry.get("pincode")) == str(pincode)), None)
    if not detail:
        raise HTTPException(status_code=404, detail="Pincode not found")
    return detail


@router.post("/orders")
async def create_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """Create an order - saves to database if available."""
    if "order_id" not in order:
        raise HTTPException(status_code=400, detail="order_id is required")
    
    # Save to database if available
    if db_service.is_available():
        from datetime import datetime
        order_data = {
            "order_id": order.get("order_id"),
            "customer_name": order.get("customer_name", ""),
            "customer_email": order.get("customer_email", ""),
            "customer_phone": order.get("customer_phone"),
            "product_id": order.get("product_id"),
            "product_name": order.get("product_name", ""),
            "quantity": order.get("quantity", 1),
            "amount": float(order.get("amount", 0)),
            "status": order.get("status", "pending"),
            "payment_method": order.get("payment_method"),
            "payment_status": order.get("payment_status", "pending"),
            "shipping_address": order.get("shipping_address"),
            "product_colors": order.get("product_colors", []),
            "product_sizes": order.get("product_sizes", []),
            "vendor_id": order.get("vendor_id"),
            "vendor_code": order.get("vendor_code"),
            "saree_id": order.get("saree_id"),
            "transaction_id": order.get("transaction_id"),
            "payment_gateway_response": order.get("payment_gateway_response"),
            "applied_offer": order.get("applied_offer"),
            "inventory_decremented": order.get("inventory_decremented", False),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        created = db_service.create_order(order_data)
        if created:
            return {"status": "success", "order_id": order["order_id"], "id": created.get("id")}
    
    # Fallback to in-memory storage
    _orders.append(order)
    return {"status": "success", "order_id": order["order_id"]}


@router.get("/orders/{order_id}")
async def get_order(order_id: str) -> Dict[str, Any]:
    order = next((o for o in _orders if o.get("order_id") == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("/offers")
async def get_offers() -> List[Dict[str, Any]]:
    """Get active offers - uses database if available."""
    if db_service.is_available():
        return db_service.get_offers(is_active=True)
    
    # Fallback to empty list (no offers in fixtures)
    return []

