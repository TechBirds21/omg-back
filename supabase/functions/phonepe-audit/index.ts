import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

function formEncode(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
    .join('&');
}

function maskMiddle(value: string | undefined | null, visible = 6): string {
  const v = String(value || '');
  if (v.length <= visible * 2) return v.replace(/.(?=.{2})/g, '*');
  return `${v.slice(0, visible)}…${v.slice(-visible)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 200 });

  try {
    const body = await req.json().catch(() => ({} as any));
    const fromDate: string = String(body?.fromDate || '').trim();
    const toDate: string = String(body?.toDate || '').trim();
    const merchantOrderId: string = String(body?.merchantOrderId || body?.orderId || '').trim();

    // Validate required parameters for audit API
    if (!fromDate || !toDate) {
      return new Response(JSON.stringify({ 
        status: 0, 
        message: 'fromDate and toDate are required for audit status API (format: YYYY-MM-DD)' 
      }), { headers: corsHeaders, status: 400 });
    }

    const OAUTH_BASE_URL = DGET('PHONEPE_OAUTH_BASE_URL') || 'https://api.phonepe.com/apis/identity-manager';
    const PAY_BASE_URL = DGET('PHONEPE_PAY_BASE_URL') || 'https://api.phonepe.com/apis/pg';
    const CLIENT_ID = DGET('PHONEPE_CLIENT_ID');
    const CLIENT_SECRET = DGET('PHONEPE_CLIENT_SECRET');
    const CLIENT_VERSION = DGET('PHONEPE_CLIENT_VERSION') || '1';
    const ENABLED = DGET('PHONEPE_ENABLED') === 'true';

    if (!ENABLED || !CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ 
        status: 0, 
        message: 'PhonePe not enabled or OAuth not configured' 
      }), { headers: corsHeaders, status: 200 });
    }

    // Fetch OAuth token with simple cache for scale
    const now = Math.floor(Date.now() / 1000);
    const cache = (globalThis as any).__PP_OAUTH_CACHE || {};
    let accessToken = cache.token && cache.expires_at && (cache.expires_at - 60) > now ? cache.token : null;
    
    if (!accessToken) {
      const tokenUrl = `${(OAUTH_BASE_URL || '').replace(/\/$/, '')}/v1/oauth/token`;
      const tokenResp = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formEncode({
          client_id: CLIENT_ID,
          client_version: String(CLIENT_VERSION),
          client_secret: CLIENT_SECRET,
          grant_type: 'client_credentials'
        })
      });
      
      const tokenText = await tokenResp.text();
      let tokenJson: any = null; 
      try { tokenJson = JSON.parse(tokenText); } catch { tokenJson = null; }
      
      if (!tokenResp.ok || !tokenJson?.access_token) {
        return new Response(JSON.stringify({ 
          status: 0, 
          message: 'OAuth token request failed', 
          remoteStatus: tokenResp.status, 
          remoteBody: tokenJson || tokenText 
        }), { headers: corsHeaders, status: 200 });
      }
      
      accessToken = tokenJson.access_token as string;
      (globalThis as any).__PP_OAUTH_CACHE = { 
        token: accessToken, 
        expires_at: Number(tokenJson?.expires_at || now + 3300) 
      };
    }

    // Call audit status API
    const base = (PAY_BASE_URL || '').replace(/\/$/, '');
    let url = `${base}/checkout/v2/audit/status?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
    
    // Add optional merchantOrderId filter if provided
    if (merchantOrderId) {
      url += `&merchantOrderId=${encodeURIComponent(merchantOrderId)}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `O-Bearer ${accessToken}`
    };

    const resp = await fetch(url, { method: 'GET', headers });
    const text = await resp.text();
    let json: any = null; 
    try { json = JSON.parse(text); } catch { json = null; }

    // Parse audit response structure
    const transactions = Array.isArray(json?.data) ? json.data : [];
    const normalized = {
      status: 1,
      remoteStatus: resp.status,
      fromDate,
      toDate,
      totalTransactions: transactions.length,
      transactions: transactions.map((txn: any) => ({
        merchantOrderId: txn?.merchantOrderId || null,
        transactionId: txn?.transactionId || null,
        amount: txn?.amount || null,
        state: txn?.state || null,
        createdAt: txn?.createdAt || null,
        completedAt: txn?.completedAt || null,
        paymentMode: txn?.paymentMode || null,
        rail: txn?.rail || null,
        instrument: txn?.instrument || null
      })),
      raw: json || text,
      diagnostics: {
        enabled: ENABLED,
        oauthBaseUrl: OAUTH_BASE_URL,
        payBaseUrl: PAY_BASE_URL,
        clientIdPreview: maskMiddle(CLIENT_ID),
        tokenPreview: maskMiddle(accessToken),
        requestUrl: url
      }
    };

    return new Response(JSON.stringify(normalized), { headers: corsHeaders, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 0, 
      message: 'Error', 
      error: String(error) 
    }), { headers: corsHeaders, status: 200 });
  }
});
