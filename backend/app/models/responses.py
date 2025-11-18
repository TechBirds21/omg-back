"""Response models for sanitizing API responses."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProductResponse(BaseModel):
    """Sanitized product response - only includes public fields."""
    id: str
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    sku: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    images: List[str] = Field(default_factory=list)
    colors: List[str] = Field(default_factory=list)
    color_images: Optional[List[List[str]]] = Field(default_factory=list)  # 2D array: color_images[index] = images for colors[index]
    sizes: List[str] = Field(default_factory=list)
    fabric: Optional[str] = None
    care_instructions: Optional[str] = None
    is_active: bool = True
    featured: bool = False
    slug: Optional[str] = None
    cover_image_index: int = 0
    vendor_code: Optional[str] = None
    total_stock: Optional[int] = None
    stock_status: Optional[str] = None
    best_seller: bool = False
    best_seller_rank: Optional[int] = None
    new_collection: bool = False
    new_collection_start_date: Optional[str] = None
    new_collection_end_date: Optional[str] = None
    
    # Exclude internal fields
    class Config:
        exclude = {
            'created_at', 'updated_at', 'vendor_id', 'saree_id',
            'color_stock', 'color_size_stock',
            'stretch_variants', 'meta_title', 'meta_description',
            'sort_order'
        }


class OrderResponse(BaseModel):
    """Sanitized order response - only includes necessary fields."""
    id: Optional[str] = None
    order_id: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    product_name: str
    quantity: int
    amount: float
    status: str
    payment_method: Optional[str] = None
    payment_status: str
    shipping_address: Optional[str] = None
    product_colors: List[str] = Field(default_factory=list)
    product_sizes: List[str] = Field(default_factory=list)
    transaction_id: Optional[str] = None
    created_at: Optional[str] = None
    
    # Exclude internal fields
    class Config:
        exclude = {
            'product_id', 'customer_id', 'vendor_id', 'vendor_code',
            'saree_id', 'payment_gateway_response', 'applied_offer',
            'inventory_decremented', 'updated_at'
        }


def sanitize_product(product: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize product data to only include public fields."""
    # Handle color_images - it might be JSONB from Supabase
    color_images = product.get('color_images', [])
    if color_images:
        # If it's a string (JSONB from Supabase), parse it
        if isinstance(color_images, str):
            try:
                import json
                color_images = json.loads(color_images)
            except (json.JSONDecodeError, TypeError):
                color_images = []
        # Ensure it's a list
        if not isinstance(color_images, list):
            color_images = []
    
    # Handle images - ensure it's a list
    images = product.get('images', [])
    if images and not isinstance(images, list):
        images = []
    
    # Debug logging
    print(f"🔍 sanitize_product - Product: {product.get('name', 'Unknown')}")
    print(f"   images: {images} (type: {type(images)}, count: {len(images) if isinstance(images, list) else 0})")
    print(f"   color_images: {color_images} (type: {type(color_images)}, count: {len(color_images) if isinstance(color_images, list) else 0})")
    
    return {
        'id': product.get('id'),
        'name': product.get('name'),
        'description': product.get('description'),
        'category_id': product.get('category_id'),
        'sku': product.get('sku'),
        'price': product.get('price'),
        'original_price': product.get('original_price'),
        'images': images,
        'video_url': product.get('video_url'),  # Video URL for product showcase
        'colors': product.get('colors', []),
        'color_images': color_images,  # Include color_images for gallery display
        'sizes': product.get('sizes', []),
        'fabric': product.get('fabric'),
        'care_instructions': product.get('care_instructions'),
        'is_active': product.get('is_active', True),
        'featured': product.get('featured', False),
        'slug': product.get('slug'),
        'cover_image_index': product.get('cover_image_index', 0),
        'vendor_code': product.get('vendor_code'),
        'total_stock': product.get('total_stock'),
        'stock_status': product.get('stock_status'),
        'best_seller': product.get('best_seller', False),
        'best_seller_rank': product.get('best_seller_rank'),
        'new_collection': product.get('new_collection', False),
        'new_collection_start_date': product.get('new_collection_start_date'),
        'new_collection_end_date': product.get('new_collection_end_date'),
    }


def sanitize_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize order data to only include necessary fields."""
    return {
        'id': order.get('id'),
        'order_id': order.get('order_id'),
        'customer_name': order.get('customer_name'),
        'customer_email': order.get('customer_email'),
        'customer_phone': order.get('customer_phone'),
        'product_name': order.get('product_name'),
        'quantity': order.get('quantity', 1),
        'amount': order.get('amount', 0),
        'status': order.get('status', 'pending'),
        'payment_method': order.get('payment_method'),
        'payment_status': order.get('payment_status', 'pending'),
        'shipping_address': order.get('shipping_address'),
        'product_colors': order.get('product_colors', []),
        'product_sizes': order.get('product_sizes', []),
        'transaction_id': order.get('transaction_id'),
        'created_at': order.get('created_at'),
    }


def sanitize_products(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sanitize a list of products."""
    return [sanitize_product(p) for p in products]


def sanitize_orders(orders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sanitize a list of orders."""
    return [sanitize_order(o) for o in orders]

