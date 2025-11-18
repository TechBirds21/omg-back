import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

function formEncode(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
    .join('&');
}

async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const msgData = enc.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgData);
  const arr = new Uint8Array(hashBuffer);
  let hex = '';
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, '0');
  return hex;
}

function maskMiddle(value: string | undefined | null, visible = 6): string {
  const v = String(value || '');
  if (v.length <= visible * 2) return v.replace(/.(?=.{2})/g, '*');
  return `${v.slice(0, visible)}…${v.slice(-visible)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null) || {};

    // Allow insecure credentials for local testing
    const allowBody = DGET('PHONEPE_ALLOW_BODY_CREDENTIALS') === 'true' || body?.allow_insecure_credentials === true;
    const MERCHANT_ID = DGET('PHONEPE_MERCHANT_ID') || (allowBody ? body?.merchantId : undefined);
    // Support both OAuth and optional salt-key X-VERIFY
    const MERCHANT_SECRET = DGET('PHONEPE_MERCHANT_SECRET') || (allowBody ? body?.merchantSecret : undefined);
    const SALT_INDEX = DGET('PHONEPE_SALT_INDEX') || (allowBody ? body?.saltIndex : undefined) || '1';

    // OAuth credentials (new auth model). Used when salt key is not configured.
    // Use credentials from request body if available (from database)
    const CLIENT_ID = body?.clientId || DGET('PHONEPE_CLIENT_ID') || (allowBody ? body?.clientId : undefined);
    const CLIENT_SECRET = body?.clientSecret || DGET('PHONEPE_CLIENT_SECRET') || (allowBody ? body?.clientSecret : undefined);
    const CLIENT_VERSION = DGET('PHONEPE_CLIENT_VERSION') || (allowBody ? String(body?.clientVersion ?? '') : undefined) || '1';
    // Default to PRODUCTION unless explicitly set to sandbox via secrets
    const PAY_BASE_URL = DGET('PHONEPE_PAY_BASE_URL') || 'https://api.phonepe.com/apis/pg';
    const BASE_URL = PAY_BASE_URL;
    const OAUTH_BASE_URL = DGET('PHONEPE_OAUTH_BASE_URL') || 'https://api.phonepe.com/apis/identity-manager';
    // Default to Checkout v2 unless explicitly disabled via env
    const USE_CHECKOUT_V2 = DGET('PHONEPE_CHECKOUT_V2') !== 'false';
    const ENABLED = DGET('PHONEPE_ENABLED') === 'true';

    // Basic validation
    if (!body.amount || !body.orderId) {
      return new Response(JSON.stringify({ status: 0, message: 'Missing amount or orderId' }), { headers: corsHeaders, status: 400 });
    }

    // Build PhonePe Standard Checkout payload
    // Amount handling
    // - v1 (/pg/v1/pay) expects integer paise
    // - v2 (/checkout/v2/pay) can accept rupees with two decimals (as string)
    const amountRupees = Number(body.amount);
    const amountPaise = Math.round(amountRupees * 100);
    // Use the same, explicitly configured, production callback/redirect URL
    const CALLBACK_URL = (DGET('PAYMENT_CALLBACK_URL') || String(body.redirectUrl || body.callbackUrl || '')).toString();
    const diagnosticsBase: Record<string, any> = {
      enabled: ENABLED,
      baseUrl: BASE_URL,
      payBaseUrl: PAY_BASE_URL,
      oauthBaseUrl: OAUTH_BASE_URL,
      checkoutV2: USE_CHECKOUT_V2,
      hasMerchantId: Boolean(MERCHANT_ID),
      hasMerchantSecret: Boolean(MERCHANT_SECRET),
      hasClientId: Boolean(CLIENT_ID),
      hasClientSecret: Boolean(CLIENT_SECRET),
      clientVersion: CLIENT_VERSION,
      callbackUrl: CALLBACK_URL,
      merchantTransactionId: String(body.orderId)
    };
    // Normalize mobile number to last 10 digits as required by PG
    const normalizedMobile = String(body.customerPhone || '')
      .replace(/\D/g, '')
      .slice(-10);
    const trimmedMessage = String(body.productInfo || 'Order Payment').slice(0, 100);

    // Build a gateway-safe order id (alphanumeric+_-) and ensure uniqueness while preserving original via udf2
    const originalOrderId = String(body.orderId);
    const sanitizedBaseId = originalOrderId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30) || `ORD_${Date.now()}`;
    const gatewayOrderId = `${sanitizedBaseId}_${Date.now()}`.slice(0, 40);

    const commonPayload: Record<string, any> = {
      merchantId: MERCHANT_ID || '',
      merchantTransactionId: gatewayOrderId,
      amount: amountPaise,
      redirectUrl: CALLBACK_URL,
      callbackUrl: CALLBACK_URL,
      merchantUserId: body.merchantUserId || body.customerEmail || body.customerPhone || '',
      // Explicitly request a full-page redirect per PhonePe docs
      // https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/invoke-iframe-paypage
      redirectMode: body.redirectMode || 'REDIRECT',
      mobileNumber: normalizedMobile,
      message: trimmedMessage,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Checkout v2 requires a different shape and uses orderId + paymentFlow
    const checkoutV2Payload: Record<string, any> = {
      merchantOrderId: gatewayOrderId,
      amount: amountPaise,
      expireAfter: Number(body.expireAfter ?? 1200),
      metaInfo: {
        ...(body.metaInfo ?? {}),
        udf1: body.udf1 ?? (body.customerName || undefined),
        udf2: body.udf2 ?? originalOrderId,
        udf3: body.udf3 ?? undefined,
        udf4: body.udf4 ?? undefined,
        udf5: body.udf5 ?? undefined,
      },
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: trimmedMessage,
        merchantUrls: {
          redirectUrl: CALLBACK_URL
        }
      }
    };

    // Per docs, request body format is { request: base64(JSON.stringify(payload)) }
    const rawJson = JSON.stringify(commonPayload);
    const payloadB64 = btoa(rawJson);

    // Get OAuth token if configured; also compute X-VERIFY when salt is available
    let xverify: string | null = null;
    let oAuthToken: string | null = null;
    let authMode: 'salt' | 'oauth' | 'none' = 'none';
    const path = '/pg/v1/pay';

    if (MERCHANT_SECRET) {
      // will compute per-endpoint below
      authMode = 'salt';
    }
    if (CLIENT_ID && CLIENT_SECRET) {
      // OAuth token caching (per function instance) to avoid rate limits under high concurrency
      const now = Math.floor(Date.now() / 1000);
      const cache = (globalThis as any).__PP_OAUTH_CACHE || {};
      const cached = cache.token && cache.expires_at && (cache.expires_at - 60) > now ? cache : null;
      if (cached) {
        oAuthToken = cached.token;
        authMode = 'oauth';
      } else {
        const tokenUrl = `${(OAUTH_BASE_URL || '').replace(/\/$/, '')}/v1/oauth/token`;
        const tokenResp = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formEncode({
            client_id: CLIENT_ID,
            client_version: CLIENT_VERSION,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials'
          })
        });
        const tokenText = await tokenResp.text();
        let tokenJson: any = null;
        try { tokenJson = JSON.parse(tokenText); } catch { tokenJson = null; }
        if (tokenResp.ok && tokenJson?.access_token) {
          oAuthToken = tokenJson.access_token;
          authMode = 'oauth';
          (globalThis as any).__PP_OAUTH_CACHE = {
            token: oAuthToken,
            expires_at: Number(tokenJson?.expires_at || now + 3300)
          };
          try {
            console.log('[phonepe-init] oauth token acquired', {
              tokenStatus: tokenResp.status,
              tokenType: tokenJson?.token_type,
              issued_at: tokenJson?.issued_at,
              expires_at: tokenJson?.expires_at,
              clientIdPreview: maskMiddle(CLIENT_ID),
              tokenPreview: maskMiddle(oAuthToken)
            });
          } catch {}
        } else {
          return new Response(JSON.stringify({ status: 0, message: 'OAuth token request failed', remoteStatus: tokenResp.status, remoteBody: tokenJson || tokenText }), { headers: corsHeaders, status: 200 });
        }
      }
    }

    const base = (PAY_BASE_URL || '').replace(/\/$/, '');
    const endpointV1 = `${base}/pg/v1/pay`;
    const endpointV2 = `${base}/checkout/v2/pay`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (MERCHANT_ID) headers['X-MERCHANT-ID'] = MERCHANT_ID;
    if (xverify) headers['X-VERIFY'] = xverify;
    if (oAuthToken) headers['Authorization'] = `O-Bearer ${oAuthToken}`;

    // If enabled and credentials present, call PhonePe API
    const canCall = ENABLED && MERCHANT_ID && (authMode === 'oauth' && oAuthToken);
    if (canCall) {
      // Attach a unique request id for PhonePe support/tracing
      const reqId = (globalThis as any).crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
      headers['X-REQUEST-ID'] = reqId;
      const diagnostics = { ...diagnosticsBase, authMode };
      try {
        console.log('[phonepe-init] calling PhonePe', {
          ...diagnostics,
          merchantId: MERCHANT_ID,
          clientIdPreview: maskMiddle(CLIENT_ID),
          tokenPreview: maskMiddle(oAuthToken)
        });
      } catch {}

      // Choose API version
      const endpoint = USE_CHECKOUT_V2 ? endpointV2 : endpointV1;
      // Compute X-VERIFY if salt key present (payload base64 + path + secret)
      if (MERCHANT_SECRET) {
        const pathForSig = USE_CHECKOUT_V2 ? '/checkout/v2/pay' : '/pg/v1/pay';
        const rawForSig = USE_CHECKOUT_V2 ? JSON.stringify(checkoutV2Payload) : JSON.stringify({ request: payloadB64 });
        const b64ForSig = btoa(rawForSig);
        const checksum = await sha256Hex(b64ForSig + pathForSig + MERCHANT_SECRET);
        xverify = `${checksum}###${SALT_INDEX}`;
        headers['X-VERIFY'] = xverify;
      }

      const bodyJson = USE_CHECKOUT_V2 ? JSON.stringify(checkoutV2Payload) : JSON.stringify({ request: payloadB64 });

      let resp = await fetch(endpoint, { method: 'POST', headers, body: bodyJson });

      let text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { json = null; }

      // If PhonePe complains about INVALID_TRANSACTION_ID, retry ONCE with a fresh gatewayOrderId
      if (USE_CHECKOUT_V2 && resp.status === 417 && (json?.code === 'INVALID_TRANSACTION_ID' || json?.message?.toString().includes('INVALID_TRANSACTION_ID'))) {
        try {
          const newGatewayOrderId = `${sanitizedBaseId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`.slice(0, 40);
          const retryPayload = {
            ...checkoutV2Payload,
            merchantOrderId: newGatewayOrderId
          };
          const retryHeaders: Record<string, string> = { ...headers };
          if (MERCHANT_SECRET) {
            const rawForSig = JSON.stringify(retryPayload);
            const b64ForSig = btoa(rawForSig);
            const checksum = await sha256Hex(b64ForSig + '/checkout/v2/pay' + MERCHANT_SECRET);
            retryHeaders['X-VERIFY'] = `${checksum}###${SALT_INDEX}`;
          }
          resp = await fetch(endpointV2, { method: 'POST', headers: retryHeaders, body: JSON.stringify(retryPayload) });
          text = await resp.text();
          try { json = JSON.parse(text); } catch { json = null; }
        } catch {}
      }

      // The response contains redirectUrl or instrumentResponse.redirectUrl
      let redirectUrl = USE_CHECKOUT_V2
        ? (json?.redirectUrl || json?.data?.redirectUrl || null)
        : (json?.data?.instrumentResponse?.redirectInfo?.url || json?.data?.redirectUrl || null);
      let requestId = resp.headers.get('x-request-id') || resp.headers.get('X-Request-Id');
      let errorCode = resp.headers.get('x-error-code');
      let errorMessage = resp.headers.get('x-error-message');

      // Fallback: if v2 returned no URL, try v1 automatically
      let fallback: any = null;
      if (USE_CHECKOUT_V2 && !redirectUrl) {
        try {
          const v1Body = JSON.stringify({ request: payloadB64 });
          const v1Headers: Record<string, string> = { ...headers };
          // Recompute X-VERIFY for v1 if secret present
          if (MERCHANT_SECRET) {
            const checksum = await sha256Hex(btoa(v1Body) + '/pg/v1/pay' + MERCHANT_SECRET);
            v1Headers['X-VERIFY'] = `${checksum}###${SALT_INDEX}`;
          }
          const resp1 = await fetch(endpointV1, { method: 'POST', headers: v1Headers, body: v1Body });
          const t1 = await resp1.text();
          let j1: any = null; try { j1 = JSON.parse(t1); } catch { j1 = null; }
          const url1 = j1?.data?.instrumentResponse?.redirectInfo?.url || j1?.data?.redirectUrl || null;
          fallback = {
            remoteStatus: resp1.status,
            remoteBody: j1 || t1,
            endpoint: endpointV1,
            paymentUrl: url1,
            requestId: resp1.headers.get('x-request-id') || resp1.headers.get('X-Request-Id'),
            errorCode: resp1.headers.get('x-error-code'),
            errorMessage: resp1.headers.get('x-error-message')
          };
          if (!redirectUrl && url1) redirectUrl = url1;
        } catch {}
      }

      return new Response(
        JSON.stringify({
          status: 1,
          remoteStatus: resp.status,
          remoteBody: json || text,
          remoteHeaders: { requestId, errorCode, errorMessage },
          sent: {
            endpoint,
            headers: { hasAuthorization: Boolean(headers['Authorization']), hasXVerify: Boolean(headers['X-VERIFY']), merchantId: headers['X-MERCHANT-ID'] || '' },
            payload: USE_CHECKOUT_V2 ? checkoutV2Payload : commonPayload,
          },
          fallbackV1: fallback,
          paymentUrl: redirectUrl,
          authMode,
          diagnostics,
          tokenDiagnostics: {
            clientIdPreview: maskMiddle(CLIENT_ID),
            tokenPreview: maskMiddle(oAuthToken)
          }
        }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // Diagnostics response for missing credentials or disabled mode
    const diagnostics = { ...diagnosticsBase, authMode };
    try {  } catch {}
    return new Response(JSON.stringify({
      status: 1,
      message: 'Diagnostics: PhonePe call not made (disabled or no credentials)',
      endpoint: (USE_CHECKOUT_V2 ? endpointV2 : endpointV1),
      headers,
      payload: commonPayload,
      requestBody: { request: payloadB64 },
      authMode,
      diagnostics,
      note: 'Provide either Salt credentials (PHONEPE_MERCHANT_SECRET + PHONEPE_SALT_INDEX) or OAuth (PHONEPE_CLIENT_ID/SECRET/VERSION). Also set PHONEPE_ENABLED=true.'
    }), { headers: corsHeaders, status: 200 });

  } catch (error) {
    // Return 200 with diagnostics to avoid CORS/tooling issues masking the error
    return new Response(JSON.stringify({ status: 0, message: 'Server error', error: String(error) }), { headers: corsHeaders, status: 200 });
  }
});
