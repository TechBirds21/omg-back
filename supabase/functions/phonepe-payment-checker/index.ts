import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 200 });

  try {
    const body = await req.json().catch(() => ({} as any));
    const { merchantOrderId, maxWaitMinutes = 1 } = body;

    if (!merchantOrderId) {
      return new Response(JSON.stringify({ 
        status: 0, 
        message: 'merchantOrderId is required' 
      }), { headers: corsHeaders, status: 400 });
    }

    const supabase = createClient(
      DGET('SUPABASE_URL') || '',
      DGET('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    

    // Get OAuth credentials
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

    // Function to get OAuth token
    async function getAccessToken(): Promise<string | null> {
      const tokenUrl = `${OAUTH_BASE_URL.replace(/\/$/, '')}/v1/oauth/token`;
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
      
      const tokenJson = await tokenResp.json();
      if (!tokenResp.ok || !tokenJson?.access_token) {
        
        return null;
      }
      
      return tokenJson.access_token;
    }

    // Function to check PhonePe status
    async function checkPhonePeStatus(accessToken: string): Promise<any> {
      const base = PAY_BASE_URL.replace(/\/$/, '');
      const url = `${base}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=true`;
      
      const resp = await fetch(url, { 
        method: 'GET', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`
        }
      });
      
      const text = await resp.text();
      let json: any = null;
      try { 
        json = JSON.parse(text); 
      } catch { 
        json = null; 
      }
      
      return {
        success: resp.ok,
        status: resp.status,
        data: json,
        raw: text
      };
    }

    // Function to update order in database
    async function updateOrderStatus(orderId: string, paymentStatus: string, orderStatus: string, transactionId?: string, phonePeResponse?: any): Promise<boolean> {
      try {
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: paymentStatus,
            status: orderStatus,
            transaction_id: transactionId || null,
            payment_gateway_response: phonePeResponse || null,
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (error) {
          
          return false;
        }

        
        return true;
      } catch (error) {
        
        return false;
      }
    }

    // Main checking logic with 1-minute polling
    const startTime = Date.now();
    const maxWaitMs = maxWaitMinutes * 60 * 1000; // Convert to milliseconds
    const pollIntervalMs = 10000; // Check every 10 seconds
    
    let finalResult = {
      status: 0,
      message: 'Payment status check timed out',
      orderId: null,
      paymentCompleted: false,
      orderUpdated: false
    };

    // Extract order ID from merchant order ID (remove timestamp suffix)
    const orderIdFromMerchant = merchantOrderId.split('_')[0];
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
          continue;
        }

        const phonePeResult = await checkPhonePeStatus(accessToken);
        

        if (phonePeResult.success && phonePeResult.data) {
          const { state, paymentDetails } = phonePeResult.data;
          const firstDetail = Array.isArray(paymentDetails) && paymentDetails.length > 0 ? paymentDetails[0] : null;
          const attemptState = firstDetail?.state;
          const transactionId = firstDetail?.transactionId || phonePeResult.data.transactionId;

          // Check if payment is completed
          if (state === 'COMPLETED' && attemptState === 'COMPLETED') {
            
            
            // Update order in database
            const updated = await updateOrderStatus(
              orderIdFromMerchant,
              'paid',
              'confirmed',
              transactionId,
              phonePeResult.data
            );

            finalResult = {
              status: 1,
              message: 'Payment completed successfully',
              orderId: orderIdFromMerchant,
              paymentCompleted: true,
              orderUpdated: updated,
              transactionId,
              phonePeResponse: phonePeResult.data
            };
            break;
          } else if (state === 'FAILED') {
            
            
            await updateOrderStatus(
              orderIdFromMerchant,
              'failed',
              'cancelled',
              transactionId,
              phonePeResult.data
            );

            finalResult = {
              status: 0,
              message: 'Payment failed',
              orderId: orderIdFromMerchant,
              paymentCompleted: false,
              orderUpdated: true,
              phonePeResponse: phonePeResult.data
            };
            break;
          }
        }

        // Wait before next check
        
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      } catch (error) {
        
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    }

    
    return new Response(JSON.stringify(finalResult), { headers: corsHeaders, status: 200 });

  } catch (error) {
    
    return new Response(JSON.stringify({ 
      status: 0, 
      message: 'Internal server error', 
      error: String(error) 
    }), { headers: corsHeaders, status: 500 });
  }
});
