import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
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

async function fetchPhonePeStatus(merchantOrderId: string): Promise<any> {
  const OAUTH_BASE_URL = DGET('PHONEPE_OAUTH_BASE_URL') || 'https://api.phonepe.com/apis/identity-manager';
  const PAY_BASE_URL = DGET('PHONEPE_PAY_BASE_URL') || 'https://api.phonepe.com/apis/pg';
  const CLIENT_ID = DGET('PHONEPE_CLIENT_ID');
  const CLIENT_SECRET = DGET('PHONEPE_CLIENT_SECRET');
  const CLIENT_VERSION = DGET('PHONEPE_CLIENT_VERSION') || '1';
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('PhonePe credentials not configured');
  }

  // Get OAuth token
  const tokenUrl = `${OAUTH_BASE_URL.replace(/\/$/, '')}/v1/oauth/token`;
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
  
  const tokenJson = await tokenResp.json();
  if (!tokenResp.ok || !tokenJson?.access_token) {
    throw new Error('Failed to get OAuth token');
  }

  // Check order status
  const statusUrl = `${PAY_BASE_URL.replace(/\/$/, '')}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=true`;
  const statusResp = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `O-Bearer ${tokenJson.access_token}`
    }
  });

  const statusData = await statusResp.json();
  return { statusResp: statusResp.status, data: statusData };
}

async function updateOrderStatus(orderId: string, paymentStatus: string, orderStatus: string, txnId?: string): Promise<void> {
  const SUPABASE_URL = DGET('SUPABASE_URL');
  const SERVICE_ROLE_KEY = DGET('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Supabase credentials not configured');

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}`;
  const body: any = {
    payment_status: paymentStatus,
    status: orderStatus
  };
  
  if (txnId) {
    body.transaction_id = txnId;
  }

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Failed to update order: ${resp.status} ${txt}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { orderId, merchantOrderId } = body;

    if (!orderId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'orderId is required' 
      }), { headers: corsHeaders, status: 400 });
    }

    

    // Use merchantOrderId if provided, otherwise use orderId
    const idToCheck = merchantOrderId || orderId;
    
    // Fetch PhonePe status
    const phonePeResult = await fetchPhonePeStatus(idToCheck);
    const state = phonePeResult.data?.state?.toUpperCase();
    const txnId = phonePeResult.data?.paymentDetails?.[0]?.transactionId || phonePeResult.data?.transactionId;

    

    let updated = false;
    let newPaymentStatus = 'pending';
    let newOrderStatus = 'pending';

    // Update based on PhonePe response
    if (state === 'COMPLETED' || state === 'SUCCESS') {
      newPaymentStatus = 'paid';
      newOrderStatus = 'confirmed';
      await updateOrderStatus(orderId, newPaymentStatus, newOrderStatus, txnId);
      updated = true;
    } else if (state === 'FAILED' || state === 'DECLINED' || state === 'CANCELLED') {
      newPaymentStatus = 'failed';
      newOrderStatus = 'cancelled';
      await updateOrderStatus(orderId, newPaymentStatus, newOrderStatus, txnId);
      updated = true;
    }

    return new Response(JSON.stringify({
      success: true,
      orderId,
      merchantOrderId: idToCheck,
      phonePeState: state,
      transactionId: txnId,
      updated,
      newPaymentStatus,
      newOrderStatus,
      phonePeResponse: phonePeResult.data
    }), { headers: corsHeaders });

  } catch (error) {
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error) 
    }), { headers: corsHeaders, status: 500 });
  }
});
