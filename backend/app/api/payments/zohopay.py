"""
ZohoPay Payment Gateway API
Handles payment initiation and webhooks
"""

from __future__ import annotations

import hmac
import hashlib
import traceback
from typing import Any, Dict, Optional
from datetime import datetime, timedelta
import requests

from fastapi import APIRouter, HTTPException, Request, Body, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ...services.db_service import db_service
from ...config import get_settings

router = APIRouter(prefix="/payments/zohopay", tags=["zohopay"])

settings = get_settings()


class ZohoOAuthExchangeRequest(BaseModel):
    auth_code: str
    client_id: str
    client_secret: str
    redirect_uri: str


class ZohoOAuthRefreshRequest(BaseModel):
    refresh_token: str
    client_id: str
    client_secret: str


class ZohoPayInitiateRequest(BaseModel):
    order_id: str
    amount: float
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    product_info: Optional[str] = "Order Payment"
    callback_url: Optional[str] = None
    failure_url: Optional[str] = None
    currency: str = "INR"


def get_zohopay_config() -> Optional[Dict[str, Any]]:
    """Get ZohoPay configuration from database."""
    if not db_service.is_available():
        print("[get_zohopay_config] Database service not available")
        return None
    
    try:
        # Get payment config
        print("[get_zohopay_config] Fetching payment_config...")
        configs = db_service.admin_get_all("payment_config", filters={"payment_method": "zohopay"})
        print(f"[get_zohopay_config] Found {len(configs) if configs else 0} config(s)")
        
        if configs and len(configs) > 0:
            config = configs[0]
            print(f"[get_zohopay_config] Config keys: {list(config.keys())}")
            encrypted_keys = config.get("encrypted_keys", {})
            print(f"[get_zohopay_config] encrypted_keys type: {type(encrypted_keys).__name__}")
            
            encrypted_data = None
            if isinstance(encrypted_keys, dict):
                if "encrypted_data" in encrypted_keys:
                    encrypted_data = encrypted_keys["encrypted_data"]
                    print(f"[get_zohopay_config] encrypted_data keys: {list(encrypted_data.keys()) if isinstance(encrypted_data, dict) else 'not a dict'}")
                else:
                    # encrypted_keys itself might be the data
                    encrypted_data = encrypted_keys
                    print(f"[get_zohopay_config] Using encrypted_keys directly, keys: {list(encrypted_keys.keys())}")
            
            if isinstance(encrypted_data, dict):
                # Normalize keys: handle both camelCase and snake_case
                normalized_config = {}
                
                # Map camelCase to snake_case
                key_mapping = {
                    "accountId": "account_id",
                    "account_id": "account_id",
                    "accessToken": "access_token",
                    "access_token": "access_token",
                    "apiKey": "api_key",
                    "api_key": "api_key",
                    "refreshToken": "refresh_token",
                    "refresh_token": "refresh_token",
                    "clientId": "client_id",
                    "client_id": "client_id",
                    "clientSecret": "client_secret",
                    "client_secret": "client_secret",
                    "domain": "domain",
                    "environment": "environment",
                }
                
                for key, value in encrypted_data.items():
                    # Map to normalized key
                    normalized_key = key_mapping.get(key, key)
                    normalized_config[normalized_key] = value
                    # Also keep original key for backward compatibility
                    if normalized_key != key:
                        normalized_config[key] = value
                
                # Ensure we have account_id (from accountId)
                if "account_id" not in normalized_config and "accountId" in encrypted_data:
                    normalized_config["account_id"] = encrypted_data["accountId"]
                
                # Ensure we have access_token (from accessToken or access_token)
                if "access_token" not in normalized_config:
                    if "accessToken" in encrypted_data:
                        normalized_config["access_token"] = encrypted_data["accessToken"]
                    elif "access_token" in encrypted_data:
                        normalized_config["access_token"] = encrypted_data["access_token"]
                
                # Ensure we have api_key (from apiKey or access_token)
                if "api_key" not in normalized_config:
                    if "apiKey" in encrypted_data:
                        normalized_config["api_key"] = encrypted_data["apiKey"]
                    elif "access_token" in normalized_config:
                        normalized_config["api_key"] = normalized_config["access_token"]
                
                # Set domain (default to IN for India)
                if "domain" not in normalized_config:
                    normalized_config["domain"] = "IN"
                
                print(f"[get_zohopay_config] Normalized config keys: {list(normalized_config.keys())}")
                return normalized_config
        
        # Try to get from zoho_oauth_tokens (without limit parameter)
        print("[get_zohopay_config] Trying zoho_oauth_tokens...")
        try:
            tokens = db_service.admin_get_all("zoho_oauth_tokens")
            if tokens and len(tokens) > 0:
                token = tokens[0]
                print(f"[get_zohopay_config] Found token in zoho_oauth_tokens")
                return {
                    "access_token": token.get("access_token"),
                    "api_domain": token.get("api_domain"),
                }
        except Exception as e:
            print(f"[get_zohopay_config] Error fetching zoho_oauth_tokens: {e}")
        
        print("[get_zohopay_config] No config found")
    except Exception as e:
        print(f"[get_zohopay_config] Error: {e}")
        traceback.print_exc()
    
    return None


@router.post("/oauth/exchange")
async def exchange_oauth_token(request: ZohoOAuthExchangeRequest) -> Dict[str, Any]:
    """Exchange authorization code for access token and refresh token."""
    try:
        # Zoho OAuth token exchange endpoint
        token_url = "https://accounts.zoho.in/oauth/v2/token"
        
        payload = {
            "grant_type": "authorization_code",
            "client_id": request.client_id,
            "client_secret": request.client_secret,
            "redirect_uri": request.redirect_uri,
            "code": request.auth_code,
        }
        
        response = requests.post(
            token_url,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30
        )
        
        if response.status_code not in [200, 201]:
            error_text = response.text[:500]
            raise HTTPException(
                status_code=400,
                detail=f"Zoho OAuth error: {error_text}"
            )
        
        result = response.json()
        
        if result.get("error"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error_description") or result.get("error") or "OAuth token exchange failed"
            )
        
        access_token = result.get("access_token")
        refresh_token = result.get("refresh_token")
        expires_in = result.get("expires_in", 3600)  # Default 1 hour
        
        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="No access token in response"
            )
        
        # Calculate expiry time
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
        
        # Store tokens in database if available
        if db_service.is_available():
            try:
                token_data = {
                    "access_token": access_token,
                    "refresh_token": refresh_token or "",
                    "expires_at": expires_at,
                    "expires_in": expires_in,
                    "token_type": result.get("token_type", "Bearer"),
                    "scope": result.get("scope", ""),
                    "api_domain": result.get("api_domain", "https://www.zohoapis.com"),
                    "created_at": datetime.utcnow().isoformat(),
                }
                
                # Check if token exists
                existing_tokens = db_service.admin_get_all("zoho_oauth_tokens", limit=1)
                if existing_tokens:
                    # Update existing token
                    db_service.admin_update("zoho_oauth_tokens", existing_tokens[0].get("id"), token_data)
                else:
                    # Create new token
                    db_service.admin_create("zoho_oauth_tokens", token_data)
            except Exception as e:
                print(f"Error storing OAuth tokens: {e}")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "expires_at": expires_at,
            "token_type": result.get("token_type", "Bearer"),
            "scope": result.get("scope", ""),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token exchange failed: {str(e)}"
        )


@router.post("/oauth/refresh")
async def refresh_oauth_token(request: ZohoOAuthRefreshRequest) -> Dict[str, Any]:
    """Refresh access token using refresh token."""
    try:
        # Zoho OAuth token refresh endpoint
        token_url = "https://accounts.zoho.in/oauth/v2/token"
        
        payload = {
            "grant_type": "refresh_token",
            "client_id": request.client_id,
            "client_secret": request.client_secret,
            "refresh_token": request.refresh_token,
        }
        
        response = requests.post(
            token_url,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30
        )
        
        if response.status_code not in [200, 201]:
            error_text = response.text[:500]
            raise HTTPException(
                status_code=400,
                detail=f"Zoho OAuth error: {error_text}"
            )
        
        result = response.json()
        
        if result.get("error"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error_description") or result.get("error") or "Token refresh failed"
            )
        
        access_token = result.get("access_token")
        expires_in = result.get("expires_in", 3600)
        
        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="No access token in response"
            )
        
        # Calculate expiry time
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
        
        # Store updated token in database if available
        if db_service.is_available():
            try:
                token_data = {
                    "access_token": access_token,
                    "refresh_token": request.refresh_token,  # Keep existing refresh token
                    "expires_at": expires_at,
                    "expires_in": expires_in,
                    "token_type": result.get("token_type", "Bearer"),
                    "scope": result.get("scope", ""),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                
                # Update existing token
                existing_tokens = db_service.admin_get_all("zoho_oauth_tokens", limit=1)
                if existing_tokens:
                    db_service.admin_update("zoho_oauth_tokens", existing_tokens[0].get("id"), token_data)
                else:
                    # Create new token if none exists
                    token_data["created_at"] = datetime.utcnow().isoformat()
                    db_service.admin_create("zoho_oauth_tokens", token_data)
            except Exception as e:
                print(f"Error storing refreshed token: {e}")
        
        return {
            "access_token": access_token,
            "refresh_token": request.refresh_token,  # Return existing refresh token
            "expires_in": expires_in,
            "expires_at": expires_at,
            "token_type": result.get("token_type", "Bearer"),
            "scope": result.get("scope", ""),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token refresh failed: {str(e)}"
        )


def verify_webhook_signature(payload: str, signature: str, signing_key: str) -> bool:
    """Verify ZohoPay webhook signature."""
    try:
        expected_signature = hmac.new(
            signing_key.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature)
    except:
        return False


@router.post("/initiate")
async def initiate_zohopay_payment(request: ZohoPayInitiateRequest) -> Dict[str, Any]:
    """Initiate ZohoPay payment."""
    try:
        # Get ZohoPay configuration
        config = get_zohopay_config()
        if not config:
            raise HTTPException(
                status_code=400,
                detail="ZohoPay not configured. Please configure in admin settings."
            )
        
        access_token = config.get("access_token")
        api_domain = config.get("api_domain") or "https://www.zohoapis.com"
        account_id = config.get("account_id")
        
        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="ZohoPay access token not configured."
            )
        
        # Convert amount to paise (smallest currency unit)
        amount_in_paise = int(request.amount * 100)
        
        # Create payment session using Zoho Payments API
        # API endpoint: https://payments.zoho.in/api/v1/paymentsessions
        session_url = f"https://payments.zoho.in/api/v1/paymentsessions"
        if account_id:
            session_url += f"?account_id={account_id}"
        
        # ZohoPay expects currency in uppercase (e.g., "INR" not "inr")
        # Reference: https://www.zoho.com/in/payments/api/v1/widget/#integrate-widget
        currency_code = request.currency.upper() if request.currency else "INR"
        
        # ZohoPay expects amount as a string (can be any non-negative value)
        # According to docs: "amount": "100.5" (string format)
        # Format: remove trailing .0 for whole numbers, keep decimals for fractional amounts
        if request.amount == int(request.amount):
            amount_str = str(int(request.amount))  # "1420" instead of "1420.0"
        else:
            amount_str = str(request.amount)  # "100.5" for decimal amounts
        
        # Payment Session API payload format
        # Reference: https://www.zoho.com/in/payments/api/v1/payment-session/#create-payment-session
        # Reference: https://www.zoho.com/in/payments/developerdocs/web-integration/integrate-widget/
        # The payment session is created first, then widget uses payments_session_id
        # According to docs, required fields: amount, currency_code, reference_id, description
        payment_payload = {
            "amount": amount_str,  # Amount as string (e.g., "100.5" or "1420")
            "currency_code": currency_code,  # 3-letter currency code (e.g., "INR")
            "reference_id": request.order_id,  # Reference/Order ID (required)
            "description": request.product_info or "Order Payment",  # Description (required)
        }
        
        # Log the full payload for debugging
        import json
        print(f"[ZohoPay Initiate] Full Payload JSON:")
        print(json.dumps(payment_payload, indent=2))
        print(f"[ZohoPay Initiate] URL: {session_url}")
        print(f"[ZohoPay Initiate] Account ID: {account_id}")
        print(f"[ZohoPay Initiate] Access Token (first 20 chars): {access_token[:20]}...")
        
        # Add customer info if available
        # ZohoPay expects customer details in the root payload, not just in address
        if request.customer_name:
            payment_payload["customer_name"] = request.customer_name
        if request.customer_email:
            payment_payload["customer_email"] = request.customer_email
        if request.customer_phone:
            # Format phone number: ensure it's a string and has country code if needed
            phone = str(request.customer_phone).strip()
            # If phone doesn't start with +, assume it's Indian number and add +91
            if phone and not phone.startswith('+'):
                # Remove any leading zeros
                phone = phone.lstrip('0')
                # Add +91 for India if not present
                if not phone.startswith('91'):
                    phone = f"+91{phone}"
            payment_payload["customer_phone"] = phone
        
        # Also add address object for compatibility
        if request.customer_name or request.customer_email or request.customer_phone:
            address_obj = {}
            if request.customer_name:
                address_obj["name"] = request.customer_name
            if request.customer_email:
                address_obj["email"] = request.customer_email
            if request.customer_phone:
                phone = str(request.customer_phone).strip()
                if phone and not phone.startswith('+'):
                    phone = phone.lstrip('0')
                    if not phone.startswith('91'):
                        phone = f"+91{phone}"
                address_obj["phone"] = phone
            if address_obj:
                payment_payload["address"] = address_obj
        
        headers = {
            "Authorization": f"Zoho-oauthtoken {access_token}",
            "Content-Type": "application/json",
        }
        
        response = requests.post(
            session_url,
            json=payment_payload,
            headers=headers,
            timeout=30
        )
        
        print(f"[ZohoPay Initiate] Response Status: {response.status_code}")
        print(f"[ZohoPay Initiate] Response Headers: {dict(response.headers)}")
        
        if response.status_code not in [200, 201]:
            error_text = response.text[:2000]  # Get more error details
            print(f"[ZohoPay Initiate] Full Error Response: {error_text}")
            
            # Try to parse error JSON
            try:
                error_json = response.json()
                print(f"[ZohoPay Initiate] Parsed Error JSON: {json.dumps(error_json, indent=2)}")
                error_message = error_json.get("message") or error_json.get("error") or error_json.get("detail") or error_text
                error_code = error_json.get("code")
                if error_code:
                    error_message = f"{error_code}: {error_message}"
            except Exception as parse_err:
                print(f"[ZohoPay Initiate] Error parsing JSON: {parse_err}")
                error_message = error_text
            
            raise HTTPException(
                status_code=500,
                detail=f"ZohoPay API error: {error_message}"
            )
        
        # Log successful response
        print(f"[ZohoPay Initiate] Success! Response received")
        
        result = response.json()
        
        # ZohoPay response structure - check for payments_session_id
        payments_session_id = None
        
        # Try different response formats
        if result.get("payments_session_id"):
            payments_session_id = result["payments_session_id"]
        elif result.get("payment_session") and isinstance(result["payment_session"], dict):
            payments_session_id = result["payment_session"].get("payments_session_id") or result["payment_session"].get("id")
        elif result.get("session_id"):
            payments_session_id = result["session_id"]
        elif isinstance(result, dict) and "id" in result:
            payments_session_id = result["id"]
        
        if not payments_session_id:
            error_msg = result.get("message") or result.get("error") or f"Invalid response: {str(result)[:200]}"
            raise HTTPException(
                status_code=500,
                detail=f"No payments_session_id in ZohoPay response: {error_msg}"
            )
        
        # Store payment session
        if db_service.is_available():
            try:
                session_data = {
                    "order_id": request.order_id,
                    "gateway": "zohopay",
                    "session_id": payments_session_id,
                    "amount": request.amount,
                    "currency": request.currency,
                    "customer_name": request.customer_name,
                    "customer_email": request.customer_email,
                    "customer_phone": request.customer_phone,
                    "status": "initiated",
                    "payment_status": "pending",
                    "metadata": result,
                    "created_at": datetime.utcnow().isoformat(),
                }
                db_service.admin_create("payment_sessions", session_data)
            except Exception as e:
                print(f"Error storing payment session: {e}")
        
        # Return widget-compatible response
        return {
            "status": 1,
            "payments_session_id": payments_session_id,
            "session_id": payments_session_id,  # For backward compatibility
            "amount": str(request.amount),
            "currency_code": request.currency,
            "message": "Payment session created successfully"
        }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Payment initiation failed: {str(e)}"
        )


@router.post("/webhook")
async def zohopay_webhook(
    request: Request,
    x_zoho_webhook_signature: Optional[str] = Header(None, alias="x-zoho-webhook-signature"),
    x_zoho_signature: Optional[str] = Header(None, alias="x-zoho-signature"),
) -> JSONResponse:
    """Handle ZohoPay webhook."""
    try:
        # Get raw body
        body_text = await request.text()
        headers_dict = dict(request.headers)
        
        # Parse JSON
        try:
            webhook_data = await request.json()
        except:
            webhook_data = {}
        
        # Get signature
        signature = x_zoho_webhook_signature or x_zoho_signature or ""
        
        # Verify signature if signing key is configured
        signing_key = settings.phonepe_merchant_secret  # Reuse or add zohopay_signing_key
        signature_verified = False
        if signing_key and signature:
            signature_verified = verify_webhook_signature(body_text, signature, signing_key)
        
        # Extract payment information
        event_type = webhook_data.get("event_type", "")
        payment_id = webhook_data.get("payment_id", "")
        session_id = webhook_data.get("payments_session_id", "") or webhook_data.get("session_id", "")
        reference_id = webhook_data.get("reference_id", "") or webhook_data.get("order_id", "")
        status = webhook_data.get("status", "")
        amount = webhook_data.get("amount", 0)
        
        # Convert amount from paise to rupees if needed
        if amount and amount > 10000:  # Likely in paise
            amount = amount / 100
        
        # Determine payment status
        payment_status = "pending"
        order_status = "pending"
        
        if status in ["success", "paid", "completed"]:
            payment_status = "paid"
            order_status = "confirmed"
        elif status in ["failed", "error", "cancelled"]:
            payment_status = "failed"
            order_status = "cancelled"
        
        # Store webhook
        if db_service.is_available():
            try:
                webhook_record = {
                    "gateway": "zohopay",
                    "order_id": reference_id,
                    "transaction_id": payment_id,
                    "payment_id": payment_id,
                    "reference_id": reference_id,
                    "status": status,
                    "payment_status": payment_status,
                    "amount": float(amount) if amount else 0,
                    "raw_payload": webhook_data,
                    "headers": headers_dict,
                    "signature": signature,
                    "signature_verified": signature_verified,
                    "processed": False,
                    "created_at": datetime.utcnow().isoformat(),
                }
                db_service.admin_create("payment_webhooks", webhook_record)
            except Exception as e:
                print(f"Error storing webhook: {e}")
        
        # Update order
        if reference_id and db_service.is_available():
            try:
                orders = db_service.admin_get_all("orders", filters={"order_id": reference_id})
                if orders and len(orders) > 0:
                    order = orders[0]
                    update_data = {
                        "payment_status": payment_status,
                        "status": order_status,
                        "transaction_id": payment_id,
                        "payment_gateway_response": webhook_data,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    db_service.admin_update("orders", order.get("id"), update_data)
                    
                    # Mark webhook as processed
                    if db_service.is_available():
                        try:
                            webhooks = db_service.admin_get_all(
                                "payment_webhooks",
                                filters={"order_id": reference_id, "payment_id": payment_id}
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
                        await broadcast_payment_update(reference_id, order_status, payment_status, payment_id)
                    except Exception as ws_error:
                        print(f"WebSocket broadcast error: {ws_error}")
            except Exception as e:
                print(f"Error updating order: {e}")
        
        return JSONResponse(
            content={
                "status": 1,
                "message": "Webhook processed successfully",
                "orderId": reference_id,
                "paymentId": payment_id,
                "status": payment_status
            },
            status_code=200
        )
        
    except Exception as e:
        print(f"ZohoPay webhook error: {e}")
        return JSONResponse(
            content={"status": 0, "error": str(e)},
            status_code=200
        )


@router.get("/config")
async def get_zohopay_widget_config() -> Dict[str, Any]:
    """Get ZohoPay configuration for frontend widget."""
    try:
        config = get_zohopay_config()
        print(f"[ZohoPay Config] Retrieved config: {bool(config)}")
        if config:
            print(f"[ZohoPay Config] Keys in config: {list(config.keys())}")
            print(f"[ZohoPay Config] account_id: {bool(config.get('account_id'))}")
            print(f"[ZohoPay Config] access_token: {bool(config.get('access_token'))}")
            print(f"[ZohoPay Config] api_key: {bool(config.get('api_key'))}")
        
        if not config:
            # Return empty config instead of 404 - widget will show error message
            return {
                "account_id": "",
                "api_key": "",
                "domain": "IN",
                "debug": "No config found in database",
            }
        
        account_id = config.get("account_id", "")
        api_key = config.get("access_token") or config.get("api_key", "")
        domain = config.get("domain", "IN")
        
        print(f"[ZohoPay Config] Returning - account_id: {bool(account_id)}, api_key: {bool(api_key)}, domain: {domain}")
        
        return {
            "account_id": account_id,
            "api_key": api_key,
            "domain": domain,
        }
    except Exception as e:
        print(f"[ZohoPay Config] Error getting config: {e}")
        import traceback
        traceback.print_exc()
        # Return empty config on error
        return {
            "account_id": "",
            "api_key": "",
            "domain": "IN",
            "debug": f"Error: {str(e)}",
        }


@router.get("/debug/config")
async def debug_zohopay_config() -> Dict[str, Any]:
    """Debug endpoint to check ZohoPay configuration in database."""
    debug_info = {
        "db_available": db_service.is_available(),
        "payment_config": None,
        "zoho_oauth_tokens": None,
        "parsed_config": None,
    }
    
    if not db_service.is_available():
        return {
            **debug_info,
            "error": "Database service not available",
        }
    
    try:
        # Check payment_config table
        try:
            configs = db_service.admin_get_all("payment_config", filters={"payment_method": "zohopay"})
            debug_info["payment_config"] = {
                "count": len(configs) if configs else 0,
                "data": configs[:2] if configs else None,  # Limit to first 2 for debugging
            }
            
            if configs and len(configs) > 0:
                config = configs[0]
                encrypted_keys = config.get("encrypted_keys", {})
                debug_info["encrypted_keys_structure"] = {
                    "type": type(encrypted_keys).__name__,
                    "has_encrypted_data": isinstance(encrypted_keys, dict) and "encrypted_data" in encrypted_keys,
                    "keys": list(encrypted_keys.keys()) if isinstance(encrypted_keys, dict) else None,
                }
                
                if isinstance(encrypted_keys, dict) and "encrypted_data" in encrypted_keys:
                    encrypted_data = encrypted_keys["encrypted_data"]
                    debug_info["encrypted_data_keys"] = list(encrypted_data.keys()) if isinstance(encrypted_data, dict) else None
                    debug_info["has_account_id"] = bool(encrypted_data.get("account_id")) if isinstance(encrypted_data, dict) else False
                    debug_info["has_access_token"] = bool(encrypted_data.get("access_token")) if isinstance(encrypted_data, dict) else False
                    debug_info["has_api_key"] = bool(encrypted_data.get("api_key")) if isinstance(encrypted_data, dict) else False
        except Exception as e:
            debug_info["payment_config_error"] = str(e)
        
        # Check zoho_oauth_tokens table
        try:
            tokens = db_service.admin_get_all("zoho_oauth_tokens")
            debug_info["zoho_oauth_tokens"] = {
                "count": len(tokens) if tokens else 0,
                "has_access_token": bool(tokens[0].get("access_token")) if tokens and len(tokens) > 0 else False,
            }
        except Exception as e:
            debug_info["zoho_oauth_tokens_error"] = str(e)
        
        # Get parsed config
        try:
            parsed_config = get_zohopay_config()
            debug_info["parsed_config"] = {
                "exists": bool(parsed_config),
                "keys": list(parsed_config.keys()) if parsed_config else None,
                "has_account_id": bool(parsed_config.get("account_id")) if parsed_config else False,
                "has_access_token": bool(parsed_config.get("access_token")) if parsed_config else False,
                "has_api_key": bool(parsed_config.get("api_key")) if parsed_config else False,
            }
        except Exception as e:
            debug_info["parsed_config_error"] = str(e)
        
        return debug_info
        
    except Exception as e:
        return {
            **debug_info,
            "error": str(e),
            "traceback": traceback.format_exc() if "traceback" in dir() else None,
        }


@router.get("/status/{order_id}")
async def get_payment_status(order_id: str) -> Dict[str, Any]:
    """Get payment status for an order."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Get payment session
        sessions = db_service.admin_get_all("payment_sessions", filters={"order_id": order_id, "gateway": "zohopay"})
        if sessions:
            session = sessions[0]
            return {
                "order_id": order_id,
                "gateway": "zohopay",
                "status": session.get("status"),
                "payment_status": session.get("payment_status"),
                "transaction_id": session.get("session_id"),
                "amount": session.get("amount"),
            }
        
        # Get from order
        orders = db_service.admin_get_all("orders", filters={"order_id": order_id})
        if orders:
            order = orders[0]
            return {
                "order_id": order_id,
                "gateway": "zohopay",
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

