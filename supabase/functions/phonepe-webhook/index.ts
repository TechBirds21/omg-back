import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Initialize Supabase client
const supabaseUrl = DGET('SUPABASE_URL');
const supabaseServiceKey = DGET('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function updateOrderInSupabase(orderId: string, paymentDetails: any, paymentStatus: string, orderStatus: string) {
  try {
    // First, get the current order status to avoid regression
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, payment_status')
      .eq('order_id', orderId)
      .single();

    if (fetchError) {
      
      throw fetchError;
    }

    // Define status hierarchy (higher number = more advanced)
    const statusHierarchy: { [key: string]: number } = {
      'pending': 0,
      'failed': 0,
      'cancelled': 0,
      'confirmed': 1,
      'processing': 2,
      'ready_to_ship': 3,
      'shipped': 4,
      'delivered': 5,
      'refunded': 6
    };

    const currentStatusLevel = statusHierarchy[currentOrder?.status || 'pending'] || 0;
    const newStatusLevel = statusHierarchy[orderStatus] || 0;

    // Only update order status if:
    // 1. New status is higher in hierarchy, OR
    // 2. Current status is pending/failed and payment is successful, OR
    // 3. Payment failed/refunded (always allow these)
    let finalOrderStatus = currentOrder?.status || 'pending';
    
    if (newStatusLevel > currentStatusLevel) {
      // Allow progression to higher status
      finalOrderStatus = orderStatus;
    } else if ((currentOrder?.status === 'pending' || currentOrder?.status === 'failed') && 
               (orderStatus === 'confirmed' && paymentStatus === 'paid')) {
      // Allow pending/failed -> confirmed when payment succeeds
      finalOrderStatus = orderStatus;
    } else if (paymentStatus === 'failed' || paymentStatus === 'refunded') {
      // Always allow failed/refunded status changes
      finalOrderStatus = orderStatus;
    } else {
      // Don't regress status - keep current status
      console.log(`🚫 PhonePe webhook prevented status regression: ${currentOrder?.status} -> ${orderStatus} for order ${orderId}`);
    }

    const transactionId = paymentDetails.transactionId || paymentDetails.txnId || paymentDetails.txnid || paymentDetails.payload?.paymentDetails?.[0]?.transactionId || null;

    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: finalOrderStatus,
        transaction_id: transactionId,
        payment_gateway_response: JSON.stringify(paymentDetails),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .select('order_id, status, payment_status, transaction_id');

    if (error) {
      
      throw error;
    }

    console.log(`✅ PhonePe Order ${orderId} updated: ${currentOrder?.status} -> ${finalOrderStatus}, payment: ${paymentStatus}`);
    
    return data;
  } catch (error) {
    
    throw error;
  }
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

  // Check if inventory has already been decremented
  if (order.inventory_decremented === true) {
    console.log(`Inventory already decremented for order ${order.order_id}`);
    return;
  }

  const product = order?.products;
  if (!product || !order?.product_id) return;

  const quantityToDecrement = Math.max(1, Number(order?.quantity || 1));
  
  // Handle dress products with color_size_stock
  if (product.color_size_stock && Array.isArray(product.color_size_stock) && product.color_size_stock.length > 0) {
    await decrementDressInventoryPhonePe(order, product, quantityToDecrement);
  } else {
    // Handle regular products with color_stock
    await decrementRegularInventoryPhonePe(order, product, quantityToDecrement);
  }

  // Mark inventory as decremented
  const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  await supabaseClient
    .from('orders')
    .update({ inventory_decremented: true })
    .eq('id', order.id);
}

// Helper function to decrement dress inventory (color_size_stock) for PhonePe
async function decrementDressInventoryPhonePe(order: any, product: any, qty: number) {
  const SUPABASE_URL = DGET('SUPABASE_URL');
  const SERVICE_ROLE_KEY = DGET('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  const selectedColors: string[] = Array.isArray(order?.product_colors) ? order.product_colors : [];
  const selectedSizes: string[] = Array.isArray(order?.product_sizes) ? order.product_sizes : [];
  
  let colorSizeStock = [...product.color_size_stock];
  let remaining = qty;

  // Decrement from selected color and size combinations
  for (const color of selectedColors) {
    if (remaining <= 0) break;
    
    const colorVariant = colorSizeStock.find(v => 
      v.color && v.color.toLowerCase() === color.toLowerCase()
    );
    
    if (colorVariant && colorVariant.sizes) {
      for (const size of selectedSizes) {
        if (remaining <= 0) break;
        
        const sizeVariant = colorVariant.sizes.find((s: any) => 
          s.size && s.size.toLowerCase() === size.toLowerCase()
        );
        
        if (sizeVariant && sizeVariant.stock > 0) {
          sizeVariant.stock = Math.max(0, sizeVariant.stock - 1);
          remaining--;
        }
      }
    }
  }

  // If still have remaining quantity, decrement from any available stock
  while (remaining > 0) {
    let decremented = false;
    
    for (const colorVariant of colorSizeStock) {
      if (remaining <= 0) break;
      
      if (colorVariant.sizes) {
        for (const sizeVariant of colorVariant.sizes) {
          if (remaining <= 0) break;
          
          if (sizeVariant.stock > 0) {
            sizeVariant.stock = Math.max(0, sizeVariant.stock - 1);
            remaining--;
            decremented = true;
            break;
          }
        }
      }
      
      if (decremented) break;
    }
    
    if (!decremented) break; // No more stock available
  }

  // Calculate new total stock
  let newTotal = 0;
  colorSizeStock.forEach(variant => {
    if (variant.sizes) {
      variant.sizes.forEach((sizeVariant: any) => {
        newTotal += sizeVariant.stock || 0;
      });
    }
  });

  const newStatus = newTotal <= 0 ? 'out_of_stock' : (newTotal <= 5 ? 'low_stock' : 'in_stock');

  // Update product
  await supabaseClient
    .from('products')
    .update({
      color_size_stock: colorSizeStock,
      total_stock: newTotal,
      stock_status: newStatus
    })
    .eq('id', product.id);
}

// Helper function to decrement regular inventory (color_stock) for PhonePe
async function decrementRegularInventoryPhonePe(order: any, product: any, qty: number) {
  const SUPABASE_URL = DGET('SUPABASE_URL');
  const SERVICE_ROLE_KEY = DGET('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  const selectedColors: string[] = Array.isArray(order?.product_colors) ? order.product_colors : [];
  // Current color_stock is array of { color, stock }
  let colorStock: Array<{ color: string; stock: number }> = [];
  try { colorStock = Array.isArray(product?.color_stock) ? product.color_stock : JSON.parse(product?.color_stock || '[]'); } catch { colorStock = []; }

  // Helper to decrement stock for a color
  const decrementOne = (color?: string) => {
    if (!colorStock || colorStock.length === 0) return false;
    if (color) {
      const entry = colorStock.find((c) => (c?.color || '').toLowerCase() === String(color).toLowerCase());
      if (entry) { entry.stock = Math.max(0, Number(entry.stock || 0) - 1); return true; }
    }
    // fallback: decrement the first color that has stock
    const anyWithStock = colorStock.find((c) => Number(c?.stock || 0) > 0);
    if (anyWithStock) { anyWithStock.stock = Math.max(0, Number(anyWithStock.stock || 0) - 1); return true; }
    return false;
  };

  // Decrement per quantity across selected colors
  let remaining = qty;
  // First pass: one per selected color
  for (const col of selectedColors) {
    if (remaining <= 0) break;
    if (decrementOne(col)) remaining -= 1;
  }
  // Second pass: any remaining from any color with stock
  while (remaining > 0 && decrementOne()) remaining -= 1;

  // Recompute total_stock and stock_status
  const newTotal = colorStock.length > 0
    ? colorStock.reduce((sum, c) => sum + Math.max(0, Number(c?.stock || 0)), 0)
    : Math.max(0, Number(product?.total_stock || 0) - qty);
  const newStatus = newTotal <= 0 ? 'out_of_stock' : (newTotal <= 5 ? 'low_stock' : 'in_stock');

  const patchBody: any = { total_stock: newTotal, stock_status: newStatus };
  if (colorStock.length > 0) patchBody.color_stock = colorStock;

  await supabaseClient
    .from('products')
    .update(patchBody)
    .eq('id', product.id);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    
    
    
    
    const signature = req.headers.get('x-verify') || req.headers.get('X-VERIFY') || req.headers.get('x-phonepe-signature') || '';
    const MERCHANT_SECRET = DGET('PHONEPE_MERCHANT_SECRET') || '';

    // Preferred auth per docs: Authorization: SHA256(username:password)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const WEBHOOK_USER = DGET('PHONEPE_WEBHOOK_USER') || '';
    const WEBHOOK_PASS = DGET('PHONEPE_WEBHOOK_PASS') || '';
    
    
    
    if (WEBHOOK_USER && WEBHOOK_PASS) {
      const expected = await sha256Hex(`${WEBHOOK_USER}:${WEBHOOK_PASS}`);
      const presented = authHeader?.startsWith('SHA256 ')
        ? authHeader.slice('SHA256 '.length)
        : authHeader || '';
      if (!presented || presented.toLowerCase() !== expected.toLowerCase()) {
        
        return new Response(JSON.stringify({ status: 0, message: 'Unauthorized webhook' }), { headers: corsHeaders, status: 401 });
      }
    } else if (MERCHANT_SECRET) {
      // Fallback: legacy HMAC of raw body using merchant secret
      const expected = await hmacSha256Base64(MERCHANT_SECRET, raw);
      if (expected !== signature) {
        
        return new Response(JSON.stringify({ status: 0, message: 'Invalid signature' }), { headers: corsHeaders, status: 400 });
      }
    } else {
      
    }

    // Extract order id from Custom Field 2 (udf2) as primary source
    const orderId = body?.payload?.metaInfo?.udf2 || 
                   body?.udf2 || 
                   body?.payload?.merchantOrderId || 
                   body?.merchantOrderId || 
                   body?.merchantTransactionId || 
                   body?.orderId || 
                   body?.order_id || 
                   body?.payload?.payment?.merchantOrderId ||
                   '';
                   
    // Extract txn id from Transaction ID
    const txnId = body?.payload?.paymentDetails?.[0]?.transactionId || 
                  body?.payload?.transactionId ||
                  body?.transactionId || 
                  body?.paymentId || 
                  body?.txnId || 
                  body?.txnid || 
                  body?.payload?.payment?.transactionId ||
                  '';

    

    if (!orderId) {
      
      return new Response(JSON.stringify({ status: 0, message: 'Order id missing in webhook' }), { headers: corsHeaders, status: 400 });
    }

    // Determine payment state per docs
    const state = (body?.payload?.state || body?.state || body?.payload?.payment?.state || '').toString().toUpperCase();
    let payment_status = 'pending';
    let order_status = 'pending';
    
    
    
    if (state === 'COMPLETED' || state === 'SUCCESS') { 
      payment_status = 'paid'; 
      order_status = 'confirmed'; 
    } else if (state === 'FAILED' || state === 'DECLINED') { 
      payment_status = 'failed'; 
      order_status = 'cancelled'; 
    }

    

    // Update order in Supabase
    try {
      // Fetch order before update to check prior status for idempotency
      const existingOrder = await fetchOrderWithProduct(orderId);
      
      
      const wasPaid = (existingOrder?.payment_status || '').toLowerCase() === 'paid';
      
      
      await updateOrderInSupabase(orderId, body, payment_status, order_status);
      
      // INVENTORY MANAGEMENT DISABLED IN WEBHOOKS (as per user requirement)
      // Inventory is now ONLY managed by order status changes in the main application
      // Payment status changes should NOT trigger any inventory operations
      console.log(`ℹ️ PHONEPE WEBHOOK - Payment status changed to ${payment_status} - NO inventory changes (inventory only managed by order status)`);
      
      // Note: Inventory will be decremented when order status changes to "confirmed" in the main application,
      // regardless of payment status
    } catch (err) {
      
      return new Response(JSON.stringify({ status: 0, message: 'Failed to update order', error: String(err) }), { headers: corsHeaders, status: 500 });
    }

    

    // Return success to PhonePe
    return new Response(JSON.stringify({ status: 1, message: 'Processed' }), { headers: corsHeaders, status: 200 });
  } catch (error) {
    
    return new Response(JSON.stringify({ status: 0, message: 'Error', error: String(error) }), { headers: corsHeaders, status: 500 });
  }
});
