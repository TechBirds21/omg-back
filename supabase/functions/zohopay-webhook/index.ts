import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zoho-webhook-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

async function verifyWebhookSignature(payload: string, signature: string, signingKey: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload + signingKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SIGNING_KEY = DGET('ZOHOPAY_SIGNING_KEY');
    
    // Log all headers for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Webhook headers:', headers);
    
    // Try multiple possible header names for webhook signature
    const webhookSignature = 
      req.headers.get('x-zoho-webhook-signature') || 
      req.headers.get('x-zoho-signature') ||
      req.headers.get('zoho-webhook-signature') || '';
    
    // Get request body
    const bodyText = await req.text();
    console.log('Webhook body:', bodyText);
    
    let webhookData: any = {};
    
    try {
      webhookData = JSON.parse(bodyText);
    } catch {
      console.error('Invalid JSON in webhook body');
      return new Response(
        JSON.stringify({ status: 0, message: 'Invalid JSON' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('ZohoPay webhook received:', {
      hasSigningKey: Boolean(SIGNING_KEY),
      hasSignature: Boolean(webhookSignature),
      signaturePreview: webhookSignature ? webhookSignature.substring(0, 10) + '...' : 'none',
      eventType: webhookData?.event_type,
      paymentId: webhookData?.payment_id,
      status: webhookData?.status
    });

    // Verify webhook signature if signing key is available
    if (SIGNING_KEY && webhookSignature) {
      console.log('Verifying webhook signature...');
      const isValid = await verifyWebhookSignature(bodyText, webhookSignature, SIGNING_KEY);
      console.log('Signature verification result:', isValid);
      if (!isValid) {
        console.error('Invalid webhook signature - signature mismatch');
        return new Response(
          JSON.stringify({ status: 0, message: 'Invalid signature' }),
          { headers: corsHeaders, status: 401 }
        );
      }
      console.log('Webhook signature verified successfully');
    } else if (SIGNING_KEY && !webhookSignature) {
      console.warn('Signing key configured but no signature in webhook - processing anyway');
    } else {
      console.warn('No signing key configured - skipping signature verification');
    }

    // Extract payment information
    const {
      event_type,
      payment_id,
      payments_session_id,
      reference_id,
      status,
      amount,
      currency,
      payment_method,
      customer,
      created_time,
      updated_time
    } = webhookData;

    console.log('Processing ZohoPay webhook:', {
      eventType: event_type,
      paymentId: payment_id,
      sessionId: payments_session_id,
      referenceId: reference_id,
      status,
      amount
    });

    // Update order status in database based on payment status
    if (reference_id) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.55.0');
      const supabaseUrl = DGET('SUPABASE_URL')!;
      const supabaseKey = DGET('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let orderStatus = 'pending';
      let paymentStatus = 'pending';

      // Map Zoho Pay status to our order statuses
      if (status === 'success' || status === 'paid' || status === 'completed') {
        orderStatus = 'confirmed';
        paymentStatus = 'paid';
      } else if (status === 'failed' || status === 'error') {
        orderStatus = 'cancelled';
        paymentStatus = 'failed';
      }

      console.log('Updating order:', {
        orderId: reference_id,
        orderStatus,
        paymentStatus,
        transactionId: payment_id
      });

      const { data, error } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          payment_status: paymentStatus,
          transaction_id: payment_id,
          payment_gateway_response: JSON.stringify(webhookData),
          updated_at: new Date().toISOString()
        })
        .eq('order_id', reference_id)
        .select();

      if (error) {
        console.error('Error updating order:', error);
      } else {
        console.log('Order updated successfully:', data);
        
        // Decrement inventory for successful payment
        if (paymentStatus === 'paid' && data && data.length > 0) {
          const order = data[0];
          console.log('Decrementing inventory for successful payment');
          
          try {
            // Get product details
            const { data: product } = await supabase
              .from('products')
              .select('color_stock, total_stock')
              .eq('id', order.product_id)
              .single();

            if (product) {
              let colorStock = product.color_stock || [];
              const orderColors = order.product_colors || [];
              const quantity = order.quantity || 1;

              // Decrement stock for each ordered color
              colorStock = colorStock.map((item: any) => {
                if (orderColors.includes(item.color)) {
                  return {
                    ...item,
                    stock: Math.max(0, item.stock - quantity)
                  };
                }
                return item;
              });

              // Update product stock
              await supabase
                .from('products')
                .update({
                  color_stock: colorStock,
                  updated_at: new Date().toISOString()
                })
                .eq('id', order.product_id);

              console.log('Inventory decremented successfully');
            }
          } catch (invError) {
            console.error('Error decrementing inventory:', invError);
          }
        }
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        status: 1, 
        message: 'Webhook processed successfully',
        eventType: event_type,
        paymentId: payment_id
      }),
      { headers: corsHeaders, status: 200 }
    );

  } catch (error) {
    console.error('ZohoPay webhook error:', error);
    return new Response(
      JSON.stringify({ 
        status: 0, 
        message: 'Server error', 
        error: String(error) 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
