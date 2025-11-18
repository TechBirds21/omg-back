// Supabase Edge Function: payment-success
// Purpose: Handle POST data from PhonePe or other gateways success URL, update database, and redirect to client with GET parameters

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

// Initialize Supabase client
const supabaseUrl = DGET('SUPABASE_URL');
const supabaseServiceKey = DGET('SUPABASE_SERVICE_ROLE_KEY');




const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function updateOrderFromSuccessRedirect(paymentData: any) {
  try {
    

    // Extract order ID - try multiple possible fields
    const orderId = paymentData.udf2 || paymentData.orderId || paymentData.order_id || paymentData.merchantOrderId;
    

    if (!orderId) {
      
      return;
    }

    // Extract transaction ID - try multiple possible fields
    const transactionId = paymentData.txnid || paymentData.transactionId || paymentData.txnId || paymentData.bank_ref_num || paymentData.easepayid;
    

    if (!transactionId) {
      
      return;
    }

    // Extract payment status
    const status = paymentData.status || paymentData.state || '';
    

    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    // Determine status based on payment gateway response
    if (status === 'success' || status === 'paid' || status === 'completed' || status === 'SUCCESS' || status === 'COMPLETED') {
      paymentStatus = 'paid';
      orderStatus = 'confirmed';
    } else if (status === 'failed' || status === 'FAILED') {
      paymentStatus = 'failed';
      orderStatus = 'cancelled';
    }

    

    // Update order in database
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: orderStatus,
        transaction_id: transactionId,
        payment_gateway_response: JSON.stringify(paymentData),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .select('order_id, status, payment_status, transaction_id');

    if (error) {
      
      
    } else {
      

      // INVENTORY MANAGEMENT DISABLED IN WEBHOOKS (as per user requirement)
      // Inventory is now ONLY managed by order status changes in the main application
      // Payment status changes should NOT trigger any inventory operations
      console.log(`ℹ️ PAYMENT SUCCESS - Payment status changed to ${paymentStatus} - NO inventory changes (inventory only managed by order status)`);
      
      // Note: Inventory will be decremented when order status changes to "confirmed" in the main application,
      // regardless of payment status
    }
  } catch (error) {
    
    
  }
}

async function decrementInventoryForOrder(orderId: string) {
  try {
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_id, product_id, quantity, product_colors, products:product_id(id, total_stock, color_stock)')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      
      return;
    }

    const product = order.products;
    if (!product) return;

    const qty = Math.max(1, Number(order.quantity || 1));
    let colorStock: Array<{ color: string; stock: number }> = [];

    try {
      colorStock = Array.isArray(product.color_stock) ? product.color_stock : JSON.parse(product.color_stock || '[]');
    } catch {
      colorStock = [];
    }

    // Decrement by colors if provided, otherwise decrement total
    const selectedColors: string[] = Array.isArray(order.product_colors) ? order.product_colors : [];

    if (selectedColors.length > 0) {
      // Decrement specific colors
      for (const color of selectedColors) {
        const stockEntry = colorStock.find(c => c.color === color);
        if (stockEntry) {
          stockEntry.stock = Math.max(0, stockEntry.stock - qty);
        }
      }
    } else {
      // Decrement total stock
      const { error: updateError } = await supabase
        .from('products')
        .update({
          total_stock: Math.max(0, product.total_stock - qty),
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        
        return;
      }
    }

    // Update color stock if modified
    if (selectedColors.length > 0) {
      const { error: colorUpdateError } = await supabase
        .from('products')
        .update({
          color_stock: JSON.stringify(colorStock),
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (colorUpdateError) {
        
      }
    }

    
  } catch (error) {
    
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 

  if (req.method === "POST") {
    
    

    try {
      

      // Get the POST data from gateway
      const paymentData = await req.formData ? await req.formData() : await req.json();
      
      

      // Convert FormData or JSON to object for database update
      let paymentDataObj: any = {};
      if (paymentData instanceof FormData) {
        
        for (const [key, value] of paymentData.entries()) {
          paymentDataObj[key] = value.toString();
          
        }
      } else {
        
        paymentDataObj = paymentData;
      }

      
      

      // Update order in database before redirecting
      
      await updateOrderFromSuccessRedirect(paymentDataObj);
      

      // Convert to URL parameters for redirect
      const params = new URLSearchParams();

      if (paymentData instanceof FormData) {
        // Handle FormData
        for (const [key, value] of paymentData.entries()) {
          params.append(key, value.toString());
        }
      } else {
        // Handle JSON
        Object.entries(paymentData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      // Determine the client-side URL (DO NOT trust referer/origin)
      // Always redirect to our site to avoid bouncing back to gateway domains
      const clientUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080';

      const redirectUrl = `${clientUrl}/payment-success?${params.toString()}`;

      // 
      // 

      // Redirect to client-side with payment data as URL parameters
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      // 

      // Fallback: redirect to success page without parameters
      const clientUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080';

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${clientUrl}/payment-success`,
          'Cache-Control': 'no-cache'
        }
      });
    }
  }

  // For GET requests, redirect to the main success page
  const clientUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080';

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': `${clientUrl}/payment-success`,
      'Cache-Control': 'no-cache'
    }
  });
});
