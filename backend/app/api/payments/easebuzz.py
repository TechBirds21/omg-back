"""
Easebuzz Payment Gateway API
Handles payment initiation and webhooks using official Easebuzz Python SDK
Reference: https://docs.easebuzz.in/docs/payment-gateway/jl5acj6genz7q-python
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Any, Dict, Optional
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Body, Query, Header
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel

try:
    from Easebuzz import EasebuzzAPIs
    EASEBUZZ_SDK_AVAILABLE = True
except ImportError:
    EASEBUZZ_SDK_AVAILABLE = False
    print("Warning: Easebuzz SDK not installed. Install with: pip install easebuzz")

from ...services.db_service import db_service
from ...config import get_settings

router = APIRouter(prefix="/payments/easebuzz", tags=["easebuzz"])

settings = get_settings()


class EasebuzzInitiateRequest(BaseModel):
    order_id: str
    amount: float
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    product_info: str = "Order Payment"
    success_url: Optional[str] = None
    failure_url: Optional[str] = None


def get_easebuzz_config() -> Optional[Dict[str, Any]]:
    """Get Easebuzz configuration from database."""
    if not db_service.is_available():
        return None
    
    try:
        # Get payment config from database
        configs = db_service.admin_get_all("payment_config", filters={"payment_method": "easebuzz"})
        if configs and len(configs) > 0:
            config = configs[0]
            encrypted_keys = config.get("encrypted_keys", {})
            configuration = config.get("configuration", {})
            
            # Merge encrypted_keys and configuration
            merged_config = {}
            if isinstance(encrypted_keys, dict):
                if "encrypted_data" in encrypted_keys:
                    merged_config.update(encrypted_keys["encrypted_data"])
                else:
                    merged_config.update(encrypted_keys)
            if isinstance(configuration, dict):
                merged_config.update(configuration)
            
            return merged_config if merged_config else None
    except Exception as e:
        print(f"Error getting Easebuzz config: {e}")
    
    return None


def get_easebuzz_api() -> Optional[Any]:
    """Initialize and return Easebuzz API instance using official SDK."""
    if not EASEBUZZ_SDK_AVAILABLE:
        return None
    
    config = get_easebuzz_config()
    if not config:
        return None
    
    merchant_key = config.get("merchantKey") or config.get("merchant_key") or config.get("merchantKey")
    salt = config.get("salt") or config.get("saltKey")
    environment = config.get("environment", "test")  # 'test' or 'prod'
    
    if not merchant_key or not salt:
        return None
    
    try:
        return EasebuzzAPIs(merchant_key, salt, environment)
    except Exception as e:
        print(f"Error initializing Easebuzz API: {e}")
        return None


def generate_easebuzz_hash(data: Dict[str, Any], salt: str) -> str:
    """Generate Easebuzz hash for payment initiation."""
    # Easebuzz hash format: hash(merchant_key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|salt)
    hash_string = (
        f"{data.get('key', '')}|"
        f"{data.get('txnid', '')}|"
        f"{data.get('amount', '')}|"
        f"{data.get('productinfo', '')}|"
        f"{data.get('firstname', '')}|"
        f"{data.get('email', '')}|"
        f"{data.get('udf1', '')}|"
        f"{data.get('udf2', '')}|"
        f"{data.get('udf3', '')}|"
        f"{data.get('udf4', '')}|"
        f"{data.get('udf5', '')}|"
        f"{data.get('udf6', '')}|"
        f"{data.get('udf7', '')}|"
        f"{data.get('udf8', '')}|"
        f"{data.get('udf9', '')}|"
        f"{salt}"
    )
    return hashlib.sha512(hash_string.encode()).hexdigest()


@router.post("/initiate")
async def initiate_easebuzz_payment(request: EasebuzzInitiateRequest) -> Dict[str, Any]:
    """
    Initiate Easebuzz payment using official Python SDK.
    Reference: https://docs.easebuzz.in/docs/payment-gateway/jl5acj6genz7q-python
    """
    try:
        # Try to use official SDK first
        if EASEBUZZ_SDK_AVAILABLE:
            easebuzz_api = get_easebuzz_api()
            if easebuzz_api:
                # Prepare payment parameters as per official SDK
                payment_params = {
                    'amount': str(request.amount),
                    'firstname': request.customer_name.split()[0] if request.customer_name else "Customer",
                    'email': request.customer_email,
                    'phone': request.customer_phone or "9999999999",
                    'productinfo': request.product_info,
                    'surl': request.success_url or f"{settings.phonepe_payment_callback_url or 'http://localhost:5173'}/payment-success?orderId={request.order_id}",
                    'furl': request.failure_url or f"{settings.phonepe_payment_callback_url or 'http://localhost:5173'}/payment-failure?orderId={request.order_id}",
                    'udf1': request.order_id,  # Store order ID
                    'udf2': request.order_id,
                }
                
                # Use official SDK method
                response = easebuzz_api.initiate_payment_api(payment_params)
                
                if isinstance(response, dict) and response.get("status") == 1:
                    access_key = response.get("data", "")
                    if access_key:
                        payment_url = f"https://pay.easebuzz.in/pay/{access_key}"
                        txnid = payment_params.get('txnid', f"{request.order_id}_{int(datetime.utcnow().timestamp())}")
                        
                        # Store payment session
                        if db_service.is_available():
                            try:
                                session_data = {
                                    "order_id": request.order_id,
                                    "gateway": "easebuzz",
                                    "transaction_id": txnid,
                                    "access_key": access_key,
                                    "payment_url": payment_url,
                                    "amount": request.amount,
                                    "customer_name": request.customer_name,
                                    "customer_email": request.customer_email,
                                    "customer_phone": request.customer_phone,
                                    "status": "initiated",
                                    "payment_status": "pending",
                                    "metadata": payment_params,
                                    "created_at": datetime.utcnow().isoformat(),
                                }
                                db_service.admin_create("payment_sessions", session_data)
                            except Exception as e:
                                print(f"Error storing payment session: {e}")
                        
                        return {
                            "status": 1,
                            "access_key": access_key,
                            "payment_url": payment_url,
                            "redirectUrl": payment_url,
                            "txnid": txnid,
                            "message": "Payment initiated successfully"
                        }
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=response.get("message", "Payment initiation failed - no access key returned")
                        )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=response.get("message", "Payment initiation failed") if isinstance(response, dict) else str(response)
                    )
        
        # Fallback to manual implementation if SDK not available
        config = get_easebuzz_config()
        if not config:
            raise HTTPException(
                status_code=400,
                detail="Easebuzz not configured. Please configure in admin settings."
            )
        
        merchant_key = config.get("merchantKey") or config.get("merchant_key")
        salt = config.get("salt")
        
        if not merchant_key or not salt:
            raise HTTPException(
                status_code=400,
                detail="Easebuzz credentials incomplete. Missing merchant_key or salt."
            )
        
        # Generate transaction ID
        txnid = f"{request.order_id}_{int(datetime.utcnow().timestamp())}"
        
        # Prepare payment data
        payment_data = {
            "key": merchant_key,
            "txnid": txnid,
            "amount": str(request.amount),
            "productinfo": request.product_info,
            "firstname": request.customer_name.split()[0] if request.customer_name else "Customer",
            "email": request.customer_email,
            "phone": request.customer_phone or "",
            "surl": request.success_url or f"{settings.phonepe_payment_callback_url or 'http://localhost:5173'}/payment-success?orderId={request.order_id}",
            "furl": request.failure_url or f"{settings.phonepe_payment_callback_url or 'http://localhost:5173'}/payment-failure?orderId={request.order_id}",
            "udf1": request.order_id,
            "udf2": request.order_id,
            "udf3": "",
            "udf4": "",
            "udf5": "",
            "udf6": "",
            "udf7": "",
            "udf8": "",
            "udf9": "",
        }
        
        # Generate hash
        hash_value = generate_easebuzz_hash(payment_data, salt)
        payment_data["hash"] = hash_value
        
        # Call Easebuzz API manually
        import requests
        easebuzz_url = "https://pay.easebuzz.in/payment/initiate"
        
        response = requests.post(
            easebuzz_url,
            data=payment_data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Easebuzz API error: {response.text[:200]}"
            )
        
        result = response.json()
        
        if result.get("status") == 1 and result.get("data"):
            access_key = result["data"]
            payment_url = f"https://pay.easebuzz.in/pay/{access_key}"
            
            # Store payment session
            if db_service.is_available():
                try:
                    session_data = {
                        "order_id": request.order_id,
                        "gateway": "easebuzz",
                        "transaction_id": txnid,
                        "access_key": access_key,
                        "payment_url": payment_url,
                        "amount": request.amount,
                        "customer_name": request.customer_name,
                        "customer_email": request.customer_email,
                        "customer_phone": request.customer_phone,
                        "status": "initiated",
                        "payment_status": "pending",
                        "metadata": payment_data,
                        "created_at": datetime.utcnow().isoformat(),
                    }
                    db_service.admin_create("payment_sessions", session_data)
                except Exception as e:
                    print(f"Error storing payment session: {e}")
            
            return {
                "status": 1,
                "access_key": access_key,
                "payment_url": payment_url,
                "redirectUrl": payment_url,
                "txnid": txnid,
                "message": "Payment initiated successfully"
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "Payment initiation failed")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Payment initiation failed: {str(e)}"
        )


@router.post("/webhook")
async def easebuzz_webhook(
    request: Request,
    content_type: Optional[str] = Header(None)
) -> JSONResponse:
    """Handle Easebuzz webhook."""
    try:
        # Get raw body
        body_bytes = await request.body()
        body_text = body_bytes.decode('utf-8')
        
        # Parse form-url-encoded or JSON
        webhook_data = {}
        headers_dict = dict(request.headers)
        
        if content_type and "application/x-www-form-urlencoded" in content_type:
            from urllib.parse import parse_qs
            parsed = parse_qs(body_text)
            webhook_data = {k: v[0] if isinstance(v, list) and len(v) > 0 else v for k, v in parsed.items()}
        else:
            try:
                webhook_data = await request.json()
            except:
                # Try URL params
                from urllib.parse import parse_qs
                parsed = parse_qs(body_text)
                webhook_data = {k: v[0] if isinstance(v, list) and len(v) > 0 else v for k, v in parsed.items()}
        
        # Extract order ID
        order_id = webhook_data.get("udf2") or webhook_data.get("udf1") or webhook_data.get("txnid", "").split("_")[0]
        txnid = webhook_data.get("txnid", "")
        mihpayid = webhook_data.get("mihpayid", "")
        status = webhook_data.get("status", "")
        amount = webhook_data.get("amount", "0")
        
        # Determine payment status
        payment_status = "pending"
        order_status = "pending"
        
        if status.lower() == "success":
            payment_status = "paid"
            order_status = "confirmed"
        elif status.lower() == "failure" or webhook_data.get("error"):
            payment_status = "failed"
            order_status = "cancelled"
        
        # Store webhook
        if db_service.is_available():
            try:
                webhook_record = {
                    "gateway": "easebuzz",
                    "order_id": order_id,
                    "transaction_id": mihpayid or txnid,
                    "payment_id": mihpayid,
                    "status": status,
                    "payment_status": payment_status,
                    "amount": float(amount) if amount else 0,
                    "raw_payload": webhook_data,
                    "headers": headers_dict,
                    "signature": webhook_data.get("hash", ""),
                    "processed": False,
                    "created_at": datetime.utcnow().isoformat(),
                }
                db_service.admin_create("payment_webhooks", webhook_record)
            except Exception as e:
                print(f"Error storing webhook: {e}")
        
        # Update order
        if order_id and db_service.is_available():
            try:
                # Get existing order
                orders = db_service.admin_get_all("orders", filters={"order_id": order_id})
                if orders and len(orders) > 0:
                    order = orders[0]
                    update_data = {
                        "payment_status": payment_status,
                        "status": order_status,
                        "transaction_id": mihpayid or txnid,
                        "payment_gateway_response": webhook_data,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    db_service.admin_update("orders", order.get("id"), update_data)
                    
                    # Mark webhook as processed
                    if db_service.is_available():
                        try:
                            webhooks = db_service.admin_get_all(
                                "payment_webhooks",
                                filters={"order_id": order_id, "transaction_id": mihpayid or txnid}
                            )
                            if webhooks:
                                db_service.admin_update(
                                    "payment_webhooks",
                                    webhooks[0].get("id"),
                                    {"processed": True, "order_updated": True, "processed_at": datetime.utcnow().isoformat()}
                                )
                        except:
                            pass
                    
                    # Broadcast WebSocket update
                    try:
                        from .websocket import broadcast_payment_update
                        await broadcast_payment_update(order_id, order_status, payment_status, mihpayid or txnid)
                    except Exception as ws_error:
                        print(f"WebSocket broadcast error: {ws_error}")
            except Exception as e:
                print(f"Error updating order: {e}")
        
        # Always return 200 as per Easebuzz requirements
        return JSONResponse(
            content={
                "success": True,
                "message": "Webhook processed successfully",
                "orderId": order_id,
                "status": payment_status
            },
            status_code=200
        )
        
    except Exception as e:
        print(f"Easebuzz webhook error: {e}")
        # Always return 200
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=200
        )


@router.get("/status/{order_id}")
async def get_payment_status(order_id: str) -> Dict[str, Any]:
    """Get payment status for an order."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Get payment session
        sessions = db_service.admin_get_all("payment_sessions", filters={"order_id": order_id, "gateway": "easebuzz"})
        if sessions:
            session = sessions[0]
            return {
                "order_id": order_id,
                "gateway": "easebuzz",
                "status": session.get("status"),
                "payment_status": session.get("payment_status"),
                "transaction_id": session.get("transaction_id"),
                "amount": session.get("amount"),
            }
        
        # Get from order
        orders = db_service.admin_get_all("orders", filters={"order_id": order_id})
        if orders:
            order = orders[0]
            return {
                "order_id": order_id,
                "gateway": "easebuzz",
                "status": order.get("status"),
                "payment_status": order.get("payment_status"),
                "transaction_id": order.get("transaction_id"),
                "amount": order.get("amount"),
            }
        
        raise HTTPException(status_code=404, detail="Order not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

