import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-verify, X-VERIFY",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = new Uint8Array(hash);
  let hex = '';
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, '0');
  return hex;
}

async function hmacSha256Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const msgData = enc.encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const arr = new Uint8Array(sig);
  const b64 = btoa(String.fromCharCode(...arr));
  return b64;
}

async function getActivePaymentMethod(): Promise<string> {
  const SUPABASE_URL = DGET('SUPABASE_URL');
  const SERVICE_ROLE_KEY = DGET('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Supabase credentials not configured');

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/payment_config?is_enabled=eq.true&is_primary=eq.true&select=payment_method`;
  const resp = await fetch(url, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (!resp.ok) {
    
    return 'phonepe';
  }

  const data = await resp.json().catch(() => []);
  const activeMethod = data?.[0]?.payment_method || 'phonepe';
  
  return activeMethod;
}

async function updateOrderInSupabase(orderId: string, paymentDetails: any, paymentStatus: string, orderStatus: string, paymentMethod: string) {
  const SUPABASE_URL = DGET('SUPABASE_URL');
  const SERVICE_ROLE_KEY = DGET('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Supabase credentials not configured');

  

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}`;
  const body = {
    payment_status: paymentStatus,
    status: orderStatus,
    payment_method: paymentMethod,
    transaction_id: paymentDetails.transactionId || paymentDetails.txnId || paymentDetails.txnid || paymentDetails.payload?.paymentDetails?.[0]?.transactionId || null,
    payment_gateway_response: JSON.stringify(paymentDetails),
    updated_at: new Date().toISOString()
  };

  

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
    throw new Error(`Supabase update failed: ${resp.status} ${txt}`);
  }

  const result = await resp.json().catch(() => null);
  
  
  return result;
}

async function fetchOrderWithProduct(orderId: string) {
  const SUPABASE_URL = DGET('SUPABASE_URL');
  const SERVICE_ROLE_KEY = DGET('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Supabase credentials not configured');

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}&select=*,products:product_id(*),product_id`;
  const resp = await fetch(url, { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
  if (!resp.ok) return null;
  const json = await resp.json().catch(() => null);
  return Array.isArray(json) && json.length > 0 ? json[0] : null;
}

async function decrementInventoryForOrder(order: any) {
  const SUPABASE_URL = DGET('SUPABASE_URL');
  const SERVICE_ROLE_KEY = DGET('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Supabase credentials not configured');

  const product = order?.products;
  if (!product || !order?.product_id) return;

  const quantityToDecrement = Math.max(1, Number(order?.quantity || 1));
  const selectedColors: string[] = Array.isArray(order?.product_colors) ? order.product_colors : [];
  let colorStock: Array<{ color: string; stock: number }> = [];
  try { colorStock = Array.isArray(product?.color_stock) ? product.color_stock : JSON.parse(product?.color_stock || '[]'); } catch { colorStock = []; }

  const decrementOne = (color?: string) => {
    if (!colorStock || colorStock.length === 0) return false;
    if (color) {
      const entry = colorStock.find((c) => (c?.color || '').toLowerCase() === String(color).toLowerCase());
      if (entry) { entry.stock = Math.max(0, Number(entry.stock || 0) - 1); return true; }
    }
    const anyWithStock = colorStock.find((c) => Number(c?.stock || 0) > 0);
    if (anyWithStock) { anyWithStock.stock = Math.max(0, Number(anyWithStock.stock || 0) - 1); return true; }
    return false;
  };

  let remaining = quantityToDecrement;
  for (const col of selectedColors) {
    if (remaining <= 0) break;
    if (decrementOne(col)) remaining -= 1;
  }
  while (remaining > 0 && decrementOne()) remaining -= 1;

  const newTotal = colorStock.length > 0
    ? colorStock.reduce((sum, c) => sum + Math.max(0, Number(c?.stock || 0)), 0)
    : Math.max(0, Number(product?.total_stock || 0) - quantityToDecrement);
  const newStatus = newTotal <= 0 ? 'out_of_stock' : (newTotal <= 5 ? 'low_stock' : 'in_stock');

  const patchBody: any = { total_stock: newTotal, stock_status: newStatus };
  if (colorStock.length > 0) patchBody.color_stock = colorStock;

  const patchUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/products?id=eq.${encodeURIComponent(order.product_id)}`;
  const resp = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(patchBody)
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Inventory update failed: ${resp.status} ${txt}`);
  }
}

function detectPaymentGateway(body: any, headers: Headers): string {
  // Check for PhonePe specific headers/fields
  if (headers.get('x-verify') || headers.get('X-VERIFY') || headers.get('x-phonepe-signature')) {
    return 'phonepe';
  }
  
  // Check for Easebuzz specific fields
  if (body?.status || body?.txnid || body?.amount || body?.firstname) {
    return 'easebuzz';
  }
  
  // Check for PhonePe specific fields
  if (body?.payload || body?.merchantOrderId || body?.merchantTransactionId) {
    return 'phonepe';
  }
  
  // Default to phonepe if uncertain
  return 'phonepe';
}

function extractOrderId(body: any, gateway: string): string {
  if (gateway === 'phonepe') {
    return body?.payload?.metaInfo?.udf2 || 
           body?.udf2 || 
           body?.payload?.merchantOrderId || 
           body?.merchantOrderId || 
           body?.merchantTransactionId || 
           body?.orderId || 
           body?.order_id || 
           body?.payload?.payment?.merchantOrderId || '';
  } else if (gateway === 'easebuzz') {
    return body?.udf2 || 
           body?.orderId || 
           body?.order_id || 
           body?.txnid || '';
  }
  
  return body?.orderId || body?.order_id || body?.merchantOrderId || '';
}

function extractTransactionId(body: any, gateway: string): string {
  if (gateway === 'phonepe') {
    return body?.payload?.paymentDetails?.[0]?.transactionId || 
           body?.payload?.transactionId ||
           body?.transactionId || 
           body?.paymentId || 
           body?.txnId || 
           body?.txnid || 
           body?.payload?.payment?.transactionId || '';
  } else if (gateway === 'easebuzz') {
    return body?.txnid || 
           body?.transactionId || 
           body?.paymentId || '';
  }
  
  return body?.transactionId || body?.txnId || body?.txnid || '';
}

function determinePaymentStatus(body: any, gateway: string): { payment_status: string; order_status: string } {
  if (gateway === 'phonepe') {
    const state = (body?.payload?.state || body?.state || body?.payload?.payment?.state || '').toString().toUpperCase();
    if (state === 'COMPLETED' || state === 'SUCCESS') {
      return { payment_status: 'paid', order_status: 'confirmed' };
    } else if (state === 'FAILED' || state === 'DECLINED') {
      return { payment_status: 'failed', order_status: 'cancelled' };
    }
  } else if (gateway === 'easebuzz') {
    const status = (body?.status || '').toString().toLowerCase();
    if (status === 'success') {
      return { payment_status: 'paid', order_status: 'confirmed' };
    } else if (status === 'autorefunded') {
      // Handle auto refund scenario as per Easebuzz documentation
      return { payment_status: 'refunded', order_status: 'refunded' };
    } else if (status === 'failure' || status === 'failed') {
      return { payment_status: 'failed', order_status: 'cancelled' };
    } else if (status === 'pending') {
      return { payment_status: 'pending', order_status: 'pending' };
    }
  }
  
  return { payment_status: 'pending', order_status: 'pending' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    
    
    
    // Detect payment gateway
    const gateway = detectPaymentGateway(body, req.headers);
    
    
    // Get active payment method from database
    const activePaymentMethod = await getActivePaymentMethod();
    
    // Verify the webhook is for the active payment method
    if (gateway !== activePaymentMethod) {
      
      return new Response(JSON.stringify({ status: 0, message: 'Gateway mismatch' }), { headers: corsHeaders, status: 200 });
    }
    
    // Extract order and transaction details
    const orderId = extractOrderId(body, gateway);
    const txnId = extractTransactionId(body, gateway);
    
    

    if (!orderId) {
      
      return new Response(JSON.stringify({ status: 0, message: 'Order id missing in webhook' }), { headers: corsHeaders, status: 400 });
    }

    // Determine payment status
    const { payment_status, order_status } = determinePaymentStatus(body, gateway);
    

    // Update order in Supabase
    try {
      const existingOrder = await fetchOrderWithProduct(orderId);
      
      
      const wasPaid = (existingOrder?.payment_status || '').toLowerCase() === 'paid';
      
      
      await updateOrderInSupabase(orderId, { ...body, transactionId: txnId }, payment_status, order_status, activePaymentMethod);
      
      // INVENTORY MANAGEMENT DISABLED IN WEBHOOKS (as per user requirement)
      // Inventory is now ONLY managed by order status changes in the main application
      // Payment status changes should NOT trigger any inventory operations
      console.log(`ℹ️ PAYMENT WEBHOOK - Payment status changed to ${payment_status} - NO inventory changes (inventory only managed by order status)`);
      
      // Note: Inventory will be decremented when order status changes to "confirmed" in the main application,
      // regardless of payment status
    } catch (err) {
      console.error('Error updating order:', err);
      // Always return 200 as per Easebuzz requirements
      return new Response(JSON.stringify({ status: 0, message: 'Failed to update order', error: String(err) }), { headers: corsHeaders, status: 200 });
    }

    

    // Return success
    return new Response(JSON.stringify({ status: 1, message: 'Processed' }), { headers: corsHeaders, status: 200 });
  } catch (error) {
    console.error('Payment webhook error:', error);
    // Always return 200 as per Easebuzz requirements
    return new Response(JSON.stringify({ status: 0, message: 'Error', error: String(error) }), { headers: corsHeaders, status: 200 });
  }
});
