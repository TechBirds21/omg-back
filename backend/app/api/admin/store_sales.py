"""
Store Sales Analytics API
Provides comprehensive store sales data, reports, and analytics
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Query

from ...services.db_service import db_service

router = APIRouter(prefix="/store-sales", tags=["admin-store-sales"])


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse date string in various formats."""
    if not date_str:
        return None
    
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        pass
    
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%d',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except:
            continue
    
    return None


@router.get("/analytics")
async def get_store_sales_analytics(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get comprehensive store sales analytics."""
    if not db_service.is_available():
        return {
            "total_bills": 0,
            "total_revenue": 0,
            "total_customers": 0,
            "average_bill_value": 0,
            "today_bills": 0,
            "today_revenue": 0,
            "week_bills": 0,
            "week_revenue": 0,
            "month_bills": 0,
            "month_revenue": 0,
            "top_products": [],
            "top_customers": [],
            "daily_sales": [],
        }
    
    try:
        # Get all store bills
        all_bills = db_service.admin_get_all("store_bills", order_by="created_at", desc=True)
        
        # Apply date filters
        filtered_bills = all_bills
        if year is not None or month is not None or start_date or end_date:
            filtered_bills = []
            for bill in all_bills:
                created_at = bill.get("created_at")
                if not created_at:
                    continue
                
                bill_date = parse_date(created_at) if isinstance(created_at, str) else created_at
                if not bill_date:
                    continue
                
                # Apply filters
                if year is not None and bill_date.year != year:
                    continue
                if month is not None and bill_date.month != month:
                    continue
                if start_date:
                    start_dt = parse_date(start_date)
                    if start_dt and bill_date < start_dt:
                        continue
                if end_date:
                    end_dt = parse_date(end_date)
                    if end_dt and bill_date > end_dt:
                        continue
                
                filtered_bills.append(bill)
        
        # Calculate totals
        total_bills = len(filtered_bills)
        total_revenue = sum(float(b.get("total_amount", 0) or b.get("final_amount", 0)) for b in filtered_bills)
        unique_customers = len(set(b.get("customer_phone") or b.get("customer_email") or "" for b in filtered_bills if b.get("customer_phone") or b.get("customer_email")))
        average_bill_value = total_revenue / total_bills if total_bills > 0 else 0
        
        # Today's stats
        today = datetime.utcnow().date()
        today_bills = [b for b in filtered_bills if parse_date(b.get("created_at", "")) and parse_date(b.get("created_at", "")).date() == today]
        today_bills_count = len(today_bills)
        today_revenue = sum(float(b.get("total_amount", 0) or b.get("final_amount", 0)) for b in today_bills)
        
        # This week's stats (last 7 days)
        week_start = (datetime.utcnow() - timedelta(days=7)).date()
        week_bills = [b for b in filtered_bills if parse_date(b.get("created_at", "")) and parse_date(b.get("created_at", "")).date() >= week_start]
        week_bills_count = len(week_bills)
        week_revenue = sum(float(b.get("total_amount", 0) or b.get("final_amount", 0)) for b in week_bills)
        
        # This month's stats
        month_start = datetime.utcnow().replace(day=1).date()
        month_bills = [b for b in filtered_bills if parse_date(b.get("created_at", "")) and parse_date(b.get("created_at", "")).date() >= month_start]
        month_bills_count = len(month_bills)
        month_revenue = sum(float(b.get("total_amount", 0) or b.get("final_amount", 0)) for b in month_bills)
        
        # Get all bill items for product analysis
        all_items = []
        for bill in filtered_bills:
            items = db_service.admin_get_all("store_bill_items", filters={"bill_id": bill.get("id")})
            all_items.extend(items)
        
        # Top products by revenue
        product_revenue = {}
        product_quantity = {}
        for item in all_items:
            product_name = item.get("product_name", "Unknown")
            quantity = int(item.get("quantity", 0))
            unit_price = float(item.get("unit_price", 0))
            discount = float(item.get("discount_amount", 0))
            revenue = (unit_price * quantity) - discount
            
            if product_name not in product_revenue:
                product_revenue[product_name] = 0
                product_quantity[product_name] = 0
            
            product_revenue[product_name] += revenue
            product_quantity[product_name] += quantity
        
        top_products = [
            {
                "product_name": name,
                "revenue": revenue,
                "quantity": product_quantity[name],
                "average_price": revenue / product_quantity[name] if product_quantity[name] > 0 else 0
            }
            for name, revenue in sorted(product_revenue.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # Top customers by spending
        customer_spending = {}
        customer_bills = {}
        for bill in filtered_bills:
            customer_key = bill.get("customer_phone") or bill.get("customer_email") or ""
            if not customer_key:
                continue
            
            customer_name = bill.get("customer_name", "Unknown")
            amount = float(bill.get("total_amount", 0) or bill.get("final_amount", 0))
            
            if customer_key not in customer_spending:
                customer_spending[customer_key] = 0
                customer_bills[customer_key] = {"name": customer_name, "count": 0}
            
            customer_spending[customer_key] += amount
            customer_bills[customer_key]["count"] += 1
        
        top_customers = [
            {
                "customer_name": customer_bills[key]["name"],
                "customer_phone": key if "@" not in key else None,
                "customer_email": key if "@" in key else None,
                "total_spent": spending,
                "bill_count": customer_bills[key]["count"],
                "average_bill": spending / customer_bills[key]["count"] if customer_bills[key]["count"] > 0 else 0
            }
            for key, spending in sorted(customer_spending.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # Daily sales breakdown
        daily_sales = {}
        for bill in filtered_bills:
            created_at = bill.get("created_at")
            if not created_at:
                continue
            
            bill_date = parse_date(created_at) if isinstance(created_at, str) else created_at
            if not bill_date:
                continue
            
            date_key = bill_date.date().isoformat()
            amount = float(bill.get("total_amount", 0) or bill.get("final_amount", 0))
            
            if date_key not in daily_sales:
                daily_sales[date_key] = {"date": date_key, "bills": 0, "revenue": 0, "customers": set()}
            
            daily_sales[date_key]["bills"] += 1
            daily_sales[date_key]["revenue"] += amount
            customer_key = bill.get("customer_phone") or bill.get("customer_email") or ""
            if customer_key:
                daily_sales[date_key]["customers"].add(customer_key)
        
        # Convert daily sales to list
        daily_sales_list = [
            {
                "date": data["date"],
                "bills": data["bills"],
                "revenue": data["revenue"],
                "customers": len(data["customers"]),
                "average_bill": data["revenue"] / data["bills"] if data["bills"] > 0 else 0
            }
            for data in sorted(daily_sales.values(), key=lambda x: x["date"], reverse=True)[:30]  # Last 30 days
        ]
        
        print(f"✅ Store Sales Analytics: {total_bills} bills, ₹{total_revenue:.2f} revenue")
        
        return {
            "total_bills": total_bills,
            "total_revenue": total_revenue,
            "total_customers": unique_customers,
            "average_bill_value": average_bill_value,
            "today_bills": today_bills_count,
            "today_revenue": today_revenue,
            "week_bills": week_bills_count,
            "week_revenue": week_revenue,
            "month_bills": month_bills_count,
            "month_revenue": month_revenue,
            "top_products": top_products,
            "top_customers": top_customers,
            "daily_sales": daily_sales_list,
        }
    except Exception as e:
        print(f"❌ Error fetching store sales analytics: {e}")
        import traceback
        traceback.print_exc()
        return {
            "total_bills": 0,
            "total_revenue": 0,
            "total_customers": 0,
            "average_bill_value": 0,
            "today_bills": 0,
            "today_revenue": 0,
            "week_bills": 0,
            "week_revenue": 0,
            "month_bills": 0,
            "month_revenue": 0,
            "top_products": [],
            "top_customers": [],
            "daily_sales": [],
        }


@router.get("/reports")
async def get_store_sales_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
) -> Dict[str, Any]:
    """Get day-wise store sales report (aggregated by date)."""
    if not db_service.is_available():
        return {"daily_sales": [], "total": 0, "page": page, "size": size, "pages": 0}
    
    try:
        all_bills = db_service.admin_get_all("store_bills", order_by="created_at", desc=True)
        
        # Apply date filters
        filtered_bills = all_bills
        if start_date or end_date:
            filtered_bills = []
            for bill in all_bills:
                created_at = bill.get("created_at")
                if not created_at:
                    continue
                
                bill_date = parse_date(created_at) if isinstance(created_at, str) else created_at
                if not bill_date:
                    continue
                
                if start_date:
                    start_dt = parse_date(start_date)
                    if start_dt and bill_date < start_dt:
                        continue
                if end_date:
                    end_dt = parse_date(end_date)
                    if end_dt and bill_date > end_dt:
                        continue
                
                filtered_bills.append(bill)
        
        # Aggregate by day
        daily_sales = {}
        for bill in filtered_bills:
            created_at = bill.get("created_at")
            if not created_at:
                continue
            
            bill_date = parse_date(created_at) if isinstance(created_at, str) else created_at
            if not bill_date:
                continue
            
            date_key = bill_date.date().isoformat()
            amount = float(bill.get("total_amount", 0) or bill.get("final_amount", 0))
            
            if date_key not in daily_sales:
                daily_sales[date_key] = {
                    "date": date_key,
                    "bills": 0,
                    "revenue": 0,
                    "customers": set(),
                }
            
            daily_sales[date_key]["bills"] += 1
            daily_sales[date_key]["revenue"] += amount
            customer_key = bill.get("customer_phone") or bill.get("customer_email") or ""
            if customer_key:
                daily_sales[date_key]["customers"].add(customer_key)
        
        # Convert to list and sort by date (descending)
        daily_sales_list = [
            {
                "date": data["date"],
                "bills": data["bills"],
                "revenue": data["revenue"],
                "customers": len(data["customers"]),
                "average_bill": data["revenue"] / data["bills"] if data["bills"] > 0 else 0
            }
            for data in sorted(daily_sales.values(), key=lambda x: x["date"], reverse=True)
        ]
        
        # Paginate the daily sales
        total = len(daily_sales_list)
        start = (page - 1) * size
        paginated_daily_sales = daily_sales_list[start:start + size]
        
        return {
            "daily_sales": paginated_daily_sales,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size,
        }
    except Exception as e:
        print(f"❌ Error fetching store sales report: {e}")
        import traceback
        traceback.print_exc()
        return {"daily_sales": [], "total": 0, "page": page, "size": size, "pages": 0}


@router.get("/top-products")
async def get_top_store_products(
    limit: int = Query(10, ge=1, le=50),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    """Get top selling products in store."""
    if not db_service.is_available():
        return []
    
    try:
        # Get all bills in date range
        all_bills = db_service.admin_get_all("store_bills", order_by="created_at", desc=True)
        
        if start_date or end_date:
            filtered_bills = []
            for bill in all_bills:
                created_at = bill.get("created_at")
                if not created_at:
                    continue
                
                bill_date = parse_date(created_at) if isinstance(created_at, str) else created_at
                if not bill_date:
                    continue
                
                if start_date:
                    start_dt = parse_date(start_date)
                    if start_dt and bill_date < start_dt:
                        continue
                if end_date:
                    end_dt = parse_date(end_date)
                    if end_dt and bill_date > end_dt:
                        continue
                
                filtered_bills.append(bill)
            all_bills = filtered_bills
        
        # Get all items
        all_items = []
        for bill in all_bills:
            items = db_service.admin_get_all("store_bill_items", filters={"bill_id": bill.get("id")})
            all_items.extend(items)
        
        # Calculate product stats
        product_stats = {}
        for item in all_items:
            product_name = item.get("product_name", "Unknown")
            quantity = int(item.get("quantity", 0))
            unit_price = float(item.get("unit_price", 0))
            discount = float(item.get("discount_amount", 0))
            revenue = (unit_price * quantity) - discount
            
            if product_name not in product_stats:
                product_stats[product_name] = {
                    "product_name": product_name,
                    "total_quantity": 0,
                    "total_revenue": 0,
                    "bill_count": 0,
                }
            
            product_stats[product_name]["total_quantity"] += quantity
            product_stats[product_name]["total_revenue"] += revenue
            product_stats[product_name]["bill_count"] += 1
        
        # Sort by revenue and return top N
        top_products = sorted(
            product_stats.values(),
            key=lambda x: x["total_revenue"],
            reverse=True
        )[:limit]
        
        # Add average price
        for product in top_products:
            product["average_price"] = product["total_revenue"] / product["total_quantity"] if product["total_quantity"] > 0 else 0
        
        return top_products
    except Exception as e:
        print(f"❌ Error fetching top store products: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.get("/customer-purchases")
async def get_customer_purchases(
    customer_phone: Optional[str] = Query(None),
    customer_email: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> Dict[str, Any]:
    """Get purchase history for a specific customer."""
    if not db_service.is_available():
        return {"bills": [], "total": 0, "page": page, "size": size, "pages": 0, "customer_info": None}
    
    if not customer_phone and not customer_email:
        return {"bills": [], "total": 0, "page": page, "size": size, "pages": 0, "customer_info": None}
    
    try:
        # Get all bills for this customer
        filters = {}
        if customer_phone:
            filters["customer_phone"] = customer_phone
        if customer_email:
            filters["customer_email"] = customer_email
        
        all_bills = db_service.admin_get_all("store_bills", filters=filters, order_by="created_at", desc=True)
        
        # Get customer info from first bill
        customer_info = None
        if all_bills:
            first_bill = all_bills[0]
            customer_info = {
                "name": first_bill.get("customer_name", "Unknown"),
                "phone": first_bill.get("customer_phone"),
                "email": first_bill.get("customer_email"),
                "address": first_bill.get("customer_address"),
            }
        
        # Paginate
        total = len(all_bills)
        start = (page - 1) * size
        paginated_bills = all_bills[start:start + size]
        
        # Get items for each bill
        for bill in paginated_bills:
            items = db_service.admin_get_all(
                "store_bill_items",
                filters={"bill_id": bill["id"]}
            )
            bill["items"] = items
        
        return {
            "bills": paginated_bills,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size,
            "customer_info": customer_info,
        }
    except Exception as e:
        print(f"❌ Error fetching customer purchases: {e}")
        import traceback
        traceback.print_exc()
        return {"bills": [], "total": 0, "page": page, "size": size, "pages": 0, "customer_info": None}

