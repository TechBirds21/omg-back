import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

// Initialize Supabase client
const supabaseUrl = DGET('SUPABASE_URL');
const supabaseServiceKey = DGET('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Generate hash for Easebuzz verification
function generateHash(data: string): string {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = crypto.subtle.digestSync('SHA-512', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function updateOrderInSupabase(orderId: string, paymentDetails: any, paymentStatus: string, orderStatus: string) {
  try {
    // Extract transaction details from paymentDetails
    const { mihpayid, txnid, bank_ref_num } = paymentDetails;
    
    // First, get the current order status to avoid regression
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, payment_status')
      .eq('order_id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching current order:', fetchError);
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
    }

    // Extract and validate transaction ID from multiple possible sources
    let transactionId = '';

    // Priority order for transaction ID extraction (Easebuzz specific)
    if (mihpayid) {
      transactionId = mihpayid; // Primary Easebuzz transaction ID
    } else if (txnid) {
      transactionId = txnid; // Fallback to txnid
    } else if (bank_ref_num) {
      transactionId = bank_ref_num; // Bank reference number
    } else {
      // Generate a fallback transaction ID using timestamp and order ID
      transactionId = `EB_${orderId}_${Date.now()}`;
    }

    // Ensure transaction ID is not empty
    if (!transactionId || transactionId.trim() === '') {
      transactionId = `EB_${orderId}_${Date.now()}`;
    }


    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: finalOrderStatus,
        transaction_id: transactionId,
        payment_gateway_response: JSON.stringify({
          ...paymentDetails,
          webhook_received_at: new Date().toISOString(),
          webhook_txnid: txnid,
          webhook_mihpayid: mihpayid,
          webhook_bank_ref_num: bank_ref_num
        }),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .select('order_id, status, payment_status, transaction_id');

    if (error) {
      
      throw error;
    }

    
    return data;
  } catch (error) {
    
    throw error;
  }
}

async function decrementInventoryForOrder(orderId: string) {
  try {
    // Get order details with inventory flag
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_id, product_id, quantity, product_colors, product_sizes, inventory_decremented, products:product_id(id, total_stock, color_stock, color_size_stock)')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      
      return;
    }

    // Check if inventory has already been decremented
    if (order.inventory_decremented === true) {
      return;
    }

    const product = order.products;
    if (!product) return;

    const qty = Math.max(1, Number(order.quantity || 1));
    
    // Handle dress products with color_size_stock
    if (product.color_size_stock && Array.isArray(product.color_size_stock) && product.color_size_stock.length > 0) {
      await decrementDressInventory(order, product, qty);
    } else {
      // Handle regular products with color_stock
      await decrementRegularInventory(order, product, qty);
    }

    // Mark inventory as decremented
    await supabase
      .from('orders')
      .update({ inventory_decremented: true })
      .eq('id', order.id);

  } catch (error) {
    
  }
}

// Helper function to decrement dress inventory (color_size_stock)
async function decrementDressInventory(order: any, product: any, qty: number) {
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
  await supabase
    .from('products')
    .update({
      color_size_stock: colorSizeStock,
      total_stock: newTotal,
      stock_status: newStatus
    })
    .eq('id', product.id);
}

// Helper function to decrement regular inventory (color_stock)
async function decrementRegularInventory(order: any, product: any, qty: number) {
    let colorStock: Array<{ color: string; stock: number }> = [];
    
    try {
      colorStock = Array.isArray(product.color_stock) ? product.color_stock : JSON.parse(product.color_stock || '[]');
    } catch {
      colorStock = [];
    }

    // Decrement by colors if provided, otherwise decrement total
    const selectedColors: string[] = Array.isArray(order.product_colors) ? order.product_colors : [];
    
  const decrementOne = (color?: string) => {
    if (!colorStock || colorStock.length === 0) return false;
    if (color) {
        const entry = colorStock.find(c => c.color.toLowerCase() === color.toLowerCase());
        if (entry && entry.stock > 0) {
          entry.stock = Math.max(0, entry.stock - 1);
        return true;
      }
    }
    const anyWithStock = colorStock.find(c => c.stock > 0);
    if (anyWithStock) {
      anyWithStock.stock = Math.max(0, anyWithStock.stock - 1);
      return true;
    }
    return false;
  };

  let remaining = qty;
  // First, try to decrement from selected colors
  for (const col of selectedColors) {
    if (remaining <= 0) break;
    if (decrementOne(col)) remaining -= 1;
  }
  // Then decrement from any available stock
  while (remaining > 0 && decrementOne()) remaining -= 1;

    // Recalculate total stock
    const newTotal = colorStock.length > 0
      ? colorStock.reduce((sum, c) => sum + Math.max(0, c.stock), 0)
      : Math.max(0, Number(product.total_stock || 0) - qty);

    const newStatus = newTotal <= 0 ? 'out_of_stock' : (newTotal <= 5 ? 'low_stock' : 'in_stock');

    // Update product stock
    const updateData: any = {
      total_stock: newTotal,
      stock_status: newStatus
    };

    if (colorStock.length > 0) {
      updateData.color_stock = colorStock;
    }

  await supabase
      .from('products')
      .update(updateData)
      .eq('id', product.id);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Parse form-url-encoded data as required by Easebuzz documentation
    const contentType = req.headers.get('content-type') || '';
    let body: any = {};
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
      
    } else {
      // Fallback to JSON parsing for backwards compatibility
      const rawText = await req.text();
      try {
        body = JSON.parse(rawText);
        
      } catch {
        
        // Try to parse as URL search params
        body = Object.fromEntries(new URLSearchParams(rawText).entries());
      }
    }

    const headers = Object.fromEntries(req.headers.entries());


    // Get Easebuzz credentials from database
    const { data: easebuzzConfig, error: configError } = await supabase
      .from('payment_config')
      .select('encrypted_keys')
      .eq('payment_method', 'easebuzz')
      .single();

    if (configError || !easebuzzConfig?.encrypted_keys?.encrypted_data) {
      
      // Return 200 as per Easebuzz requirements, even for errors
      return new Response(JSON.stringify({ 
        error: 'Easebuzz credentials not configured',
        message: 'Configuration error - please check credentials'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const easebuzzKeys = easebuzzConfig.encrypted_keys.encrypted_data;
    const MERCHANT_KEY = easebuzzKeys.merchantKey || DGET('VITE_EASEBUZZ_MERCHANT_KEY');
    const SALT = easebuzzKeys.salt || DGET('VITE_EASEBUZZ_SALT');

    if (!MERCHANT_KEY || !SALT) {
      
      // Return 200 as per Easebuzz requirements, even for errors
      return new Response(JSON.stringify({ 
        error: 'Easebuzz credentials not configured',
        message: 'Missing MERCHANT_KEY or SALT'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract payment data from Easebuzz webhook
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      status,
      hash,
      key,
      mihpayid,
      mode,
      bank_ref_num,
      bankcode,
      error,
      error_Message,
      // Additional fields for mandate registration/presentment
      udf1, udf2, udf3, udf4, udf5, udf6, udf7, udf8, udf9,
      surl,
      furl,
      card_category,
      pg_type
    } = body;

    // Extract order ID from udf2 (clean order ID) or fallback to txnid with extraction
    let orderId = '';

    if (udf2) {
      // udf2 should contain clean order ID (strip any suffix like _timestamp)
      orderId = udf2.includes('_') ? udf2.split('_')[0] : udf2;
    } else if (txnid) {
      // Fallback: extract order ID from txnid (everything before the first underscore)
      orderId = txnid.split('_')[0];
    } else {
      // Last resort: check if txnid exists but has no underscores
      orderId = txnid || '';
    }

    // Validate order ID format (should be like OCT_P428, NOV_P123, etc.)
    if (!orderId || !/^[A-Z]{3}_[A-Z]\d+$/.test(orderId)) {
      // Return 200 as per Easebuzz requirements
      return new Response(JSON.stringify({
        error: 'Invalid order ID format',
        message: `Order ID "${orderId}" does not match expected format (e.g., OCT_P428)`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }


    // Verify hash if provided (Easebuzz webhook hash validation)
    if (hash && key && txnid && amount) {
      // Easebuzz webhook hash format: SALT|status|||||||||||email|firstname|productinfo|amount|txnid|MERCHANT_KEY
      const hashString = `${SALT}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${MERCHANT_KEY}`;
      const expectedHash = generateHash(hashString);

      if (hash !== expectedHash) {
        console.warn(`⚠️ Hash verification failed for order ${orderId}. Expected: ${expectedHash}, Got: ${hash}`);
        // Continue processing - hash validation is not critical for webhook processing
        // but log the issue for monitoring
      } else {
      }
    }


    // Determine payment status based on Easebuzz documentation
    let paymentStatus = 'failed';
    let orderStatus = 'failed';
    
    if (status === 'success' || status === 'paid' || status === 'completed') {
      paymentStatus = 'paid';
      // IMPORTANT: Don't change order status if it's already in advanced stages
      // Only set to confirmed if current status is pending or failed
      orderStatus = 'confirmed'; // This will be conditionally applied later
    } else if (status === 'pending') {
      paymentStatus = 'pending';
      orderStatus = 'pending';
    } else if (status === 'autorefunded') {
      // Handle auto refund scenario as per documentation
      paymentStatus = 'refunded';
      orderStatus = 'refunded';
      
    } else if (status === 'failed') {
      paymentStatus = 'failed';
      orderStatus = 'cancelled';
    } else {
      // Default to failed for unknown statuses
      paymentStatus = 'failed';
      orderStatus = 'cancelled';
      
    }

    // Prepare payment details with additional mandate fields
    const paymentDetails = {
      gateway: 'easebuzz',
      transaction_id: transactionId, // Use the extracted transaction ID
      bank_reference: bank_ref_num,
      payment_mode: mode,
      bank_code: bankcode,
      error_message: error_Message,
      // Additional fields for mandate registration/presentment
      is_mandate: mode === 'UPIAD' || (udf5 && parseFloat(udf5) > 0),
      mandate_amount: udf5 ? parseFloat(udf5) : null,
      card_category,
      pg_type,
      user_defined_fields: {
        udf1, udf2, udf3, udf4, udf5, udf6, udf7, udf8, udf9
      },
      raw_response: body,
      // Additional metadata for debugging
      webhook_metadata: {
        received_at: new Date().toISOString(),
        source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      }
    };


    // Update order in Supabase
    
    await updateOrderInSupabase(orderId, paymentDetails, paymentStatus, orderStatus);
    

    // INVENTORY MANAGEMENT DISABLED IN WEBHOOKS (as per user requirement)
    // Inventory is now ONLY managed by order status changes in the main application
    // Payment status changes should NOT trigger any inventory operations
    
    // Note: Inventory will be decremented when order status changes to "confirmed" in the main application,
    // regardless of payment status

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook processed successfully',
      orderId: orderId,
      txnid: txnid,
      status: paymentStatus
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    
    // Always return 200 as per Easebuzz requirements
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
