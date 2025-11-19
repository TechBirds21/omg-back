import asyncio
import base64
import hashlib
import json
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote, quote_plus

import httpx
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..config import Settings, get_settings

logger = logging.getLogger(__name__)


def mask_middle(value: Optional[str], visible: int = 6) -> str:
    if not value:
        return ""
    v = str(value)
    if len(v) <= visible * 2:
        return "".join("*" if i < len(v) - 2 else ch for i, ch in enumerate(v))
    return f"{v[:visible]}…{v[-visible:]}"


def form_encode(data: Dict[str, str]) -> str:
    return "&".join(f"{quote_plus(str(k))}={quote_plus(str(v))}" for k, v in data.items())


def sha256_hex(message: str) -> str:
    return hashlib.sha256(message.encode("utf-8")).hexdigest()


class PhonePeInitRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    amount: float
    order_id: str = Field(..., alias="orderId")
    redirect_url: Optional[str] = Field(None, alias="redirectUrl")
    callback_url: Optional[str] = Field(None, alias="callbackUrl")
    merchant_user_id: Optional[str] = Field(None, alias="merchantUserId")
    customer_email: Optional[str] = Field(None, alias="customerEmail")
    customer_phone: Optional[str] = Field(None, alias="customerPhone")
    customer_name: Optional[str] = Field(None, alias="customerName")
    allow_insecure_credentials: Optional[bool] = Field(False, alias="allow_insecure_credentials")
    merchant_id_override: Optional[str] = Field(None, alias="merchantId")
    merchant_secret_override: Optional[str] = Field(None, alias="merchantSecret")
    salt_index_override: Optional[str] = Field(None, alias="saltIndex")
    client_id_override: Optional[str] = Field(None, alias="clientId")
    client_secret_override: Optional[str] = Field(None, alias="clientSecret")
    client_version_override: Optional[str] = Field(None, alias="clientVersion")
    product_info: Optional[str] = Field(None, alias="productInfo")
    redirect_mode: Optional[str] = Field(None, alias="redirectMode")
    meta_info: Optional[Dict[str, Any]] = Field(None, alias="metaInfo")
    udf1: Optional[str] = None
    udf2: Optional[str] = None
    udf3: Optional[str] = None
    udf4: Optional[str] = None
    udf5: Optional[str] = None
    expire_after: Optional[int] = Field(1200, alias="expireAfter")

    @field_validator("amount", mode="after")
    @classmethod
    def ensure_amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v


class PhonePeStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    merchant_order_id: str = Field(..., alias="merchantOrderId")
    details: bool = False


@dataclass(slots=True)
class OAuthCache:
    token: str
    expires_at: int


class PhonePeService:
    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self._oauth_cache: Optional[OAuthCache] = None
        self._cache_lock = asyncio.Lock()

    async def _get_oauth_token(
        self,
        client: httpx.AsyncClient,
        client_id: str,
        client_secret: str,
        client_version: str,
        oauth_base_url: str,
    ) -> Tuple[str, str]:
        now = int(time.time())
        if self._oauth_cache and (self._oauth_cache.expires_at - 60) > now:
            return self._oauth_cache.token, "cache"

        async with self._cache_lock:
            if self._oauth_cache and (self._oauth_cache.expires_at - 60) > int(time.time()):
                return self._oauth_cache.token, "cache"

            token_url = f"{oauth_base_url.rstrip('/')}/v1/oauth/token"
            payload = {
                "client_id": client_id,
                "client_version": client_version,
                "client_secret": client_secret,
                "grant_type": "client_credentials",
            }
            resp = await client.post(token_url, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
            resp.raise_for_status()
            data = resp.json()
            token = data.get("access_token")
            if not token:
                raise RuntimeError("OAuth token missing from response")
            expires_at = int(data.get("expires_at") or (int(time.time()) + 3300))
            self._oauth_cache = OAuthCache(token=token, expires_at=expires_at)
            return token, "fresh"

    async def initiate_payment(self, request: PhonePeInitRequest) -> Dict[str, Any]:
        settings = self.settings
        allow_insecure = settings.phonepe_allow_body_credentials or bool(request.allow_insecure_credentials)

        merchant_id = settings.phonepe_merchant_id or (request.merchant_id_override if allow_insecure else None)
        merchant_secret = settings.phonepe_merchant_secret or (request.merchant_secret_override if allow_insecure else None)
        salt_index = settings.phonepe_salt_index or request.salt_index_override or "1"

        client_id = (
            settings.phonepe_client_id
            or (request.client_id_override if allow_insecure else None)
        )
        client_secret = (
            settings.phonepe_client_secret
            or (request.client_secret_override if allow_insecure else None)
        )
        client_version = settings.phonepe_client_version or request.client_version_override or "1"

        pay_base_url = settings.phonepe_pay_base_url or "https://api.phonepe.com/apis/pg"
        oauth_base_url = settings.phonepe_oauth_base_url or "https://api.phonepe.com/apis/identity-manager"
        checkout_v2 = settings.phonepe_checkout_v2
        enabled = settings.phonepe_enabled
        callback_url = request.redirect_url or request.callback_url or settings.phonepe_payment_callback_url or ""

        if not request.order_id:
            return {"status": 0, "message": "Missing orderId"}

        amount_rupees = float(request.amount)
        amount_paise = round(amount_rupees * 100)

        diagnostics = {
            "enabled": enabled,
            "baseUrl": pay_base_url,
            "oauthBaseUrl": oauth_base_url,
            "checkoutV2": checkout_v2,
            "hasMerchantId": bool(merchant_id),
            "hasMerchantSecret": bool(merchant_secret),
            "hasClientId": bool(client_id),
            "hasClientSecret": bool(client_secret),
            "clientVersion": client_version,
            "callbackUrl": callback_url,
            "merchantTransactionId": request.order_id,
        }

        normalized_mobile = (request.customer_phone or "")
        normalized_mobile = "".join(filter(str.isdigit, normalized_mobile))[-10:]
        message = (request.product_info or "Order Payment")[:100]

        original_order_id = str(request.order_id)
        sanitized_base = "".join(ch for ch in original_order_id if ch.isalnum() or ch in "-_")[:30] or f"ORD_{int(time.time()*1000)}"
        gateway_order_id = f"{sanitized_base}_{int(time.time()*1000)}"[:40]

        common_payload = {
            "merchantId": merchant_id or "",
            "merchantTransactionId": gateway_order_id,
            "amount": amount_paise,
            "redirectUrl": callback_url,
            "callbackUrl": callback_url,
            "merchantUserId": request.merchant_user_id or request.customer_email or request.customer_phone or "",
            "redirectMode": request.redirect_mode or "REDIRECT",
            "mobileNumber": normalized_mobile,
            "message": message,
            "paymentInstrument": {"type": "PAY_PAGE"},
        }

        meta_info = request.meta_info.copy() if request.meta_info else {}
        meta_info.setdefault("udf1", request.udf1 or request.customer_name)
        meta_info.setdefault("udf2", request.udf2 or original_order_id)
        if request.udf3:
            meta_info.setdefault("udf3", request.udf3)
        if request.udf4:
            meta_info.setdefault("udf4", request.udf4)
        if request.udf5:
            meta_info.setdefault("udf5", request.udf5)

        checkout_v2_payload = {
            "merchantOrderId": gateway_order_id,
            "amount": amount_paise,
            "expireAfter": request.expire_after or 1200,
            "metaInfo": meta_info,
            "paymentFlow": {
                "type": "PG_CHECKOUT",
                "message": message,
                "merchantUrls": {"redirectUrl": callback_url},
            },
        }

        raw_json = json.dumps(common_payload, separators=(",", ":"), default=str)
        payload_b64 = base64.b64encode(raw_json.encode("utf-8")).decode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        auth_mode = "none"
        o_auth_token: Optional[str] = None
        token_source: Optional[str] = None
        x_verify: Optional[str] = None

        async with httpx.AsyncClient(timeout=30.0) as client:
            if client_id and client_secret:
                try:
                    o_auth_token, token_source = await self._get_oauth_token(client, client_id, client_secret, client_version, oauth_base_url)
                    headers["Authorization"] = f"O-Bearer {o_auth_token}"
                    auth_mode = "oauth"
                except Exception as exc:  # pragma: no cover - diagnostics path
                    logger.warning("PhonePe OAuth token acquisition failed: %s", exc, exc_info=logger.isEnabledFor(logging.DEBUG))
                    return {
                        "status": 0,
                        "message": "OAuth token request failed",
                        "error": str(exc),
                        "diagnostics": diagnostics,
                    }

            if merchant_id:
                headers["X-MERCHANT-ID"] = merchant_id
            if merchant_secret:
                auth_mode = "salt" if auth_mode == "none" else auth_mode

            base_url = pay_base_url.rstrip("/")
            endpoint_v1 = f"{base_url}/pg/v1/pay"
            endpoint_v2 = f"{base_url}/checkout/v2/pay"

            diagnostics.update({"authMode": auth_mode})
            diagnostics.update({"tokenSource": token_source})

            can_call = enabled and merchant_id and auth_mode == "oauth" and o_auth_token

            if can_call:
                request_id = uuid.uuid4().hex
                headers["X-REQUEST-ID"] = request_id

                if checkout_v2 and merchant_secret:
                    raw_for_sig = json.dumps(checkout_v2_payload, separators=(",", ":"), default=str)
                    b64_for_sig = base64.b64encode(raw_for_sig.encode("utf-8")).decode("utf-8")
                    checksum = sha256_hex(f"{b64_for_sig}/checkout/v2/pay{merchant_secret}")
                    x_verify = f"{checksum}###{salt_index}"
                    headers["X-VERIFY"] = x_verify

                endpoint = endpoint_v2 if checkout_v2 else endpoint_v1
                body_json = json.dumps(checkout_v2_payload if checkout_v2 else {"request": payload_b64}, separators=(",", ":"), default=str)

                try:
                    resp = await client.post(endpoint, headers=headers, content=body_json)
                except httpx.HTTPError as exc:  # pragma: no cover - diagnostics path
                    logger.error("PhonePe API call failed: %s", exc)
                    return {
                        "status": 0,
                        "message": "PhonePe API request failed",
                        "error": str(exc),
                        "diagnostics": diagnostics,
                        "sent": {"endpoint": endpoint, "headers": {"hasAuthorization": bool(headers.get("Authorization")), "hasXVerify": bool(x_verify)}},
                    }

                remote_status = resp.status_code
                try:
                    remote_body = resp.json()
                except ValueError:
                    remote_body = resp.text

                if checkout_v2 and remote_status == 417 and isinstance(remote_body, dict) and remote_body.get("code") == "INVALID_TRANSACTION_ID":
                    fallback_gateway_order = f"{sanitized_base}_{int(time.time()*1000)}_{str(time.time_ns())[-4:]}"[:40]
                    retry_payload = checkout_v2_payload | {"merchantOrderId": fallback_gateway_order}
                    retry_headers = headers.copy()
                    if merchant_secret:
                        raw_for_sig = json.dumps(retry_payload, separators=(",", ":"), default=str)
                        b64_for_sig = base64.b64encode(raw_for_sig.encode("utf-8")).decode("utf-8")
                        checksum = sha256_hex(f"{b64_for_sig}/checkout/v2/pay{merchant_secret}")
                        retry_headers["X-VERIFY"] = f"{checksum}###{salt_index}"

                    resp = await client.post(
                        endpoint_v2,
                        headers=retry_headers,
                        content=json.dumps(retry_payload, separators=(",", ":"), default=str),
                    )
                    remote_status = resp.status_code
                    try:
                        remote_body = resp.json()
                    except ValueError:
                        remote_body = resp.text

                redirect_url = None
                if checkout_v2 and isinstance(remote_body, dict):
                    redirect_url = remote_body.get("redirectUrl") or remote_body.get("data", {}).get("redirectUrl")
                elif isinstance(remote_body, dict):
                    redirect_url = (
                        remote_body.get("data", {})
                        .get("instrumentResponse", {})
                        .get("redirectInfo", {})
                        .get("url")
                    ) or remote_body.get("data", {}).get("redirectUrl")

                fallback_v1 = None
                if checkout_v2 and not redirect_url:
                    v1_body = {"request": payload_b64}
                    v1_headers = headers.copy()
                    if merchant_secret:
                        raw_for_sig = json.dumps(v1_body, separators=(",", ":"), default=str)
                        b64_for_sig = base64.b64encode(raw_for_sig.encode("utf-8")).decode("utf-8")
                        checksum = sha256_hex(f"{b64_for_sig}/pg/v1/pay{merchant_secret}")
                        v1_headers["X-VERIFY"] = f"{checksum}###{salt_index}"
                    resp_v1 = await client.post(
                        endpoint_v1,
                        headers=v1_headers,
                        content=json.dumps(v1_body, separators=(",", ":"), default=str),
                    )
                    try:
                        v1_body_json = resp_v1.json()
                    except ValueError:
                        v1_body_json = resp_v1.text
                    fallback_url = None
                    if isinstance(v1_body_json, dict):
                        fallback_url = (
                            v1_body_json.get("data", {})
                            .get("instrumentResponse", {})
                            .get("redirectInfo", {})
                            .get("url")
                        ) or v1_body_json.get("data", {}).get("redirectUrl")
                    if fallback_url and not redirect_url:
                        redirect_url = fallback_url
                    fallback_v1 = {
                        "remoteStatus": resp_v1.status_code,
                        "remoteBody": v1_body_json,
                        "endpoint": endpoint_v1,
                        "paymentUrl": fallback_url,
                        "requestId": resp_v1.headers.get("x-request-id") or resp_v1.headers.get("X-Request-Id"),
                        "errorCode": resp_v1.headers.get("x-error-code"),
                        "errorMessage": resp_v1.headers.get("x-error-message"),
                    }

                return {
                    "status": 1,
                    "remoteStatus": remote_status,
                    "remoteBody": remote_body,
                    "remoteHeaders": {
                        "requestId": resp.headers.get("x-request-id") or resp.headers.get("X-Request-Id"),
                        "errorCode": resp.headers.get("x-error-code"),
                        "errorMessage": resp.headers.get("x-error-message"),
                    },
                    "sent": {
                        "endpoint": endpoint,
                        "headers": {
                            "hasAuthorization": bool(headers.get("Authorization")),
                            "hasXVerify": bool(headers.get("X-VERIFY")),
                            "merchantId": headers.get("X-MERCHANT-ID", ""),
                        },
                        "payload": checkout_v2_payload if checkout_v2 else common_payload,
                    },
                    "fallbackV1": fallback_v1,
                    "paymentUrl": redirect_url,
                    "authMode": auth_mode,
                    "diagnostics": diagnostics,
                    "tokenDiagnostics": {
                        "clientIdPreview": mask_middle(client_id),
                        "tokenPreview": mask_middle(o_auth_token),
                    },
                }

        # Diagnostics-only response
        return {
            "status": 1,
            "message": "Diagnostics: PhonePe call not made (disabled or missing credentials)",
            "endpoint": endpoint_v2 if checkout_v2 else endpoint_v1,
            "headers": headers,
            "payload": common_payload,
            "requestBody": {"request": payload_b64},
            "authMode": auth_mode,
            "diagnostics": diagnostics,
            "note": "Provide OAuth credentials (PHONEPE_CLIENT_ID/SECRET/VERSION) and set PHONEPE_ENABLED=true. Salt key is optional but recommended.",
        }

    async def get_order_status(self, request: PhonePeStatusRequest) -> Dict[str, Any]:
        settings = self.settings
        if not settings.phonepe_enabled:
            return {"status": 0, "message": "PhonePe not enabled"}

        client_id = settings.phonepe_client_id
        client_secret = settings.phonepe_client_secret
        client_version = settings.phonepe_client_version or "1"
        oauth_base_url = settings.phonepe_oauth_base_url or "https://api.phonepe.com/apis/identity-manager"
        pay_base_url = settings.phonepe_pay_base_url or "https://api.phonepe.com/apis/pg"

        if not client_id or not client_secret:
            return {"status": 0, "message": "PhonePe OAuth credentials missing"}

        merchant_order_id = request.merchant_order_id.strip()
        if not merchant_order_id:
            return {"status": 0, "message": "merchantOrderId is required"}

        diagnostics: Dict[str, Any] = {
            "enabled": settings.phonepe_enabled,
            "oauthBaseUrl": oauth_base_url,
            "payBaseUrl": pay_base_url,
            "clientIdPreview": mask_middle(client_id),
            "details": request.details,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                access_token, token_source = await self._get_oauth_token(
                    client,
                    client_id,
                    client_secret,
                    client_version,
                    oauth_base_url,
                )
            except Exception as exc:  # pragma: no cover - diagnostics path
                logger.warning(
                    "PhonePe OAuth token acquisition failed for status: %s",
                    exc,
                    exc_info=logger.isEnabledFor(logging.DEBUG),
                )
                return {
                    "status": 0,
                    "message": "OAuth token request failed",
                    "error": str(exc),
                    "diagnostics": diagnostics,
                }

            diagnostics["tokenSource"] = token_source

            base_url = pay_base_url.rstrip("/")
            encoded_order_id = quote(merchant_order_id, safe="")
            details_str = "true" if request.details else "false"
            url = f"{base_url}/checkout/v2/order/{encoded_order_id}/status?details={details_str}"

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"O-Bearer {access_token}",
            }

            try:
                resp = await client.get(url, headers=headers)
            except httpx.HTTPError as exc:  # pragma: no cover
                logger.error("PhonePe order status request failed: %s", exc)
                return {
                    "status": 0,
                    "message": "PhonePe status request failed",
                    "error": str(exc),
                    "diagnostics": diagnostics,
                    "requestUrl": url,
                }

            remote_status = resp.status_code
            try:
                remote_body = resp.json()
            except ValueError:
                remote_body = resp.text

            body_dict = remote_body if isinstance(remote_body, dict) else {}
            payment_details = body_dict.get("paymentDetails")
            first_detail = (
                payment_details[0]
                if isinstance(payment_details, list) and payment_details and isinstance(payment_details[0], dict)
                else None
            )

            def safe_get(obj: Optional[Dict[str, Any]], key: str) -> Any:
                return obj.get(key) if isinstance(obj, dict) else None

            normalized = {
                "status": 1,
                "remoteStatus": remote_status,
                "orderId": body_dict.get("orderId"),
                "merchantOrderId": body_dict.get("merchantOrderId") or merchant_order_id,
                "state": body_dict.get("state") or body_dict.get("status"),
                "statusMessage": body_dict.get("statusMessage"),
                "amount": body_dict.get("amount"),
                "expireAt": body_dict.get("expireAt"),
                "transactionId": safe_get(first_detail, "transactionId") or body_dict.get("transactionId"),
                "paymentMode": safe_get(first_detail, "paymentMode"),
                "attemptState": safe_get(first_detail, "state"),
                "rail": safe_get(first_detail, "rail"),
                "instrument": safe_get(first_detail, "instrument"),
                "paymentDetails": payment_details if isinstance(payment_details, list) else None,
                "raw": remote_body,
                "diagnostics": {
                    **diagnostics,
                    "tokenPreview": mask_middle(access_token),
                    "requestUrl": url,
                },
            }

            return normalized


service = PhonePeService()


