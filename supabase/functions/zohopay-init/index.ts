import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null) || {};

    // Initialize Supabase client to get latest token
    const supabase = createClient(
      DGET('SUPABASE_URL') ?? '',
      DGET('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to get access token from database first
    let API_KEY = body?.apiKey;
    if (!API_KEY) {
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('get_zoho_access_token');
      
      if (tokenData && !tokenError) {
        API_KEY = tokenData;
        console.log('✅ Using token from database');
      } else {
        // Fallback to environment variable
        API_KEY = DGET('ZOHOPAY_API_KEY');
        console.log('⚠️ Using token from environment variable');
      }
    }

    const SIGNING_KEY = body?.signingKey || DGET('ZOHOPAY_SIGNING_KEY');
    const ACCOUNT_ID = body?.accountId || DGET('ZOHOPAY_ACCOUNT_ID');
    const ENVIRONMENT = body?.environment || DGET('ZOHOPAY_ENVIRONMENT') || 'production';
    
    // Determine base URL based on environment
    const BASE_URL = ENVIRONMENT === 'sandbox' 
      ? 'https://payments-sandbox.zoho.in/api/v1'
      : 'https://payments.zoho.in/api/v1';

    // Validate required parameters
    if (!body.amount || !body.orderId) {
      return new Response(
        JSON.stringify({ status: 0, message: 'Missing amount or orderId' }), 
        { headers: corsHeaders, status: 400 }
      );
    }

    if (!API_KEY || !ACCOUNT_ID) {
      return new Response(
        JSON.stringify({ 
          status: 0, 
          message: 'Missing Zoho Pay credentials (API_KEY or ACCOUNT_ID)',
          hasApiKey: Boolean(API_KEY),
          hasAccountId: Boolean(ACCOUNT_ID)
        }), 
        { headers: corsHeaders, status: 200 }
      );
    }

    // Convert amount to paise (smallest currency unit)
    const amountInPaise = Math.round(Number(body.amount) * 100);
    
    // Get callback URL
    const CALLBACK_URL = body.callbackUrl || DGET('PAYMENT_CALLBACK_URL') || body.redirectUrl || '';
    
    console.log('Payment request:', {
      orderId: body.orderId,
      amount: amountInPaise,
      currency: body.currency || 'INR',
      hasCallbackUrl: Boolean(CALLBACK_URL)
    });

    // Create payment session payload - Zoho Pay only accepts amount and currency
    const paymentPayload = {
      amount: amountInPaise,
      currency: body.currency || 'INR'
    };

    console.log('Creating Zoho Pay session:', {
      accountId: ACCOUNT_ID,
      orderId: body.orderId,
      amount: amountInPaise,
      hasApiKey: Boolean(API_KEY)
    });

    // Create payment session
    const sessionUrl = `${BASE_URL}/paymentsessions?account_id=${ACCOUNT_ID}`;
    
    console.log('🔐 Zoho Pay Request Details:', {
      url: sessionUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${API_KEY.substring(0, 20)}...${API_KEY.substring(API_KEY.length - 10)}`
      },
      body: paymentPayload,
      bodyString: JSON.stringify(paymentPayload)
    });
    
    const response = await fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${API_KEY}`
      },
      body: JSON.stringify(paymentPayload)
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    console.log('📥 Zoho Pay Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      rawText: responseText
    });

    // Check if session was created successfully
    if (response.ok && responseData?.message === 'success' && responseData?.payments_session) {
      const session = responseData.payments_session;
      
      // Construct payment widget URL with required parameters
      const widgetUrl = new URL('https://payments.zoho.in/checkout');
      widgetUrl.searchParams.set('session_id', session.payments_session_id);
      widgetUrl.searchParams.set('account_id', ACCOUNT_ID);
      widgetUrl.searchParams.set('api_key', API_KEY);
      widgetUrl.searchParams.set('order_id', body.orderId);
      
      // Add customer details if provided
      if (body.customerName) widgetUrl.searchParams.set('customer_name', body.customerName);
      if (body.customerEmail) widgetUrl.searchParams.set('customer_email', body.customerEmail);
      if (body.customerPhone) widgetUrl.searchParams.set('customer_mobile', body.customerPhone);
      
      // Add callback URL
      if (CALLBACK_URL) widgetUrl.searchParams.set('callback_url', CALLBACK_URL);
      
      return new Response(
        JSON.stringify({
          status: 1,
          paymentUrl: widgetUrl.toString(),
          sessionId: session.payments_session_id,
          orderId: body.orderId,
          amount: session.amount,
          message: 'Payment session created successfully'
        }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // Handle error response
    return new Response(
      JSON.stringify({
        status: 0,
        message: responseData?.message || 'Failed to create payment session',
        error: responseData?.error || responseData,
        remoteStatus: response.status,
        diagnostics: {
          baseUrl: BASE_URL,
          hasApiKey: Boolean(API_KEY),
          hasAccountId: Boolean(ACCOUNT_ID),
          environment: ENVIRONMENT
        }
      }),
      { headers: corsHeaders, status: 200 }
    );

  } catch (error) {
    console.error('Zoho Pay error:', error);
    return new Response(
      JSON.stringify({ 
        status: 0, 
        message: 'Server error', 
        error: String(error) 
      }), 
      { headers: corsHeaders, status: 200 }
    );
  }
});
