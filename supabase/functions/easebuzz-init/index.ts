import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
  "Access-Control-Allow-Credentials": "true",
};

const DGET = (k: string) => {
  try { return (globalThis as any).Deno?.env?.get?.(k); } catch { return undefined; }
};

// Helper: lazy admin client (avoids boot failure if secrets missing)
function getAdminClient() {
  try {
    const url = DGET('SUPABASE_URL');
    const key = DGET('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return null;
    return createClient(url, key);
  } catch {
    return null;
  }
}

// Generate hash for Easebuzz using Web Crypto API
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-512', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getEasebuzzCredentials() {
  try {
    const supabaseUrl = DGET('SUPABASE_URL');
    const supabaseServiceKey = DGET('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        merchantKey: DGET('VITE_EASEBUZZ_MERCHANT_KEY') || 'UHKRL9TONR',
        salt: DGET('VITE_EASEBUZZ_SALT') || 'KXAS1C8V2H'
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('payment_config')
      .select('encrypted_keys')
      .eq('payment_method', 'easebuzz')
      .single();

    if (error || !data?.encrypted_keys?.encrypted_data) {
      return {
        merchantKey: DGET('VITE_EASEBUZZ_MERCHANT_KEY') || 'UHKRL9TONR',
        salt: DGET('VITE_EASEBUZZ_SALT') || 'KXAS1C8V2H'
      };
    }

    const credentials = data.encrypted_keys.encrypted_data;
    return {
      merchantKey: credentials.merchantKey || 'UHKRL9TONR',
      salt: credentials.salt || 'KXAS1C8V2H'
    };
  } catch (error) {
    return {
      merchantKey: DGET('VITE_EASEBUZZ_MERCHANT_KEY') || 'UHKRL9TONR',
      salt: DGET('VITE_EASEBUZZ_SALT') || 'KXAS1C8V2H'
    };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Length': '0'
      }
    });
  }

  try {
    const body: any = await req.json().catch(() => null) || {};
    // Extract payment data
    const {
      txnid,
      amount,
      firstname,
      email,
      productinfo,
      phone,
      surl,
      furl,
      udf1: requestUdf1,
      udf2: requestUdf2,
      udf3: requestUdf3,
      udf4: requestUdf4,
      udf5: requestUdf5,
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      product_info,
      address,
      address1,
      address2,
      city,
      state,
      country,
      pincode
    } = body;

    // Compute clean order id (strip any timestamp suffix if present)
    const cleanOrderId = (orderId || '').toString().split('_')[0];

    // Generate unique transaction ID with timestamp to avoid collisions
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const generatedTxnId = `${cleanOrderId}_${timestamp}_${randomSuffix}`;

    // Normalize fields
    const normalizedData = {
      txnid: generatedTxnId,
      amount: Number(amount),
      firstname: firstname || customerName || 'Customer',
      email: email || customerEmail || '',
      phone: phone || customerPhone || '',
      productinfo: productinfo || product_info || 'O Maguva Saree Purchase',
      surl: surl || `${DGET('PUBLIC_SITE_URL') || 'https://omaguva.com'}/payment-success`,
      furl: furl || `${DGET('PUBLIC_SITE_URL') || 'https://omaguva.com'}/payment-failure`,
      udf1: '', // Reserved for future use
      udf2: cleanOrderId || '', // Clean order ID for webhook processing
      udf3: timestamp.toString(), // Store timestamp for debugging
      udf4: '', // Reserved for future use
      udf5: '', // Reserved for future use
      udf6: '',
      udf7: '',
      udf8: '',
      udf9: '',
      udf10: '',
      customerName: body.customerName || body.firstname
    };

    
    if (!normalizedData.txnid || !normalizedData.amount || !normalizedData.firstname || !normalizedData.email) {
      return new Response(JSON.stringify({
        status: 0,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // Get Easebuzz credentials from database first, then fallback to environment
    let merchantKey = DGET('EASEBUZZ_MERCHANT_KEY') || 'UHKRL9TONR';
    let salt = DGET('EASEBUZZ_SALT') || 'KXAS1C8V2H';

    try {
      const admin = getAdminClient();
      const { data: easebuzzConfig } = admin
        ? await admin
            .from('payment_config')
            .select('encrypted_keys, configuration')
            .eq('payment_method', 'easebuzz')
            .single()
        : { data: null } as any;

      if (easebuzzConfig?.encrypted_keys?.encrypted_data) {
        const keys = easebuzzConfig.encrypted_keys.encrypted_data;
        merchantKey = keys.merchantKey || merchantKey;
        salt = keys.salt || salt;
      }
      // Resolve environment (test/prod)
      var environment = (easebuzzConfig?.configuration?.environment || DGET('EASEBUZZ_ENV') || 'prod').toString().toLowerCase();
    } catch (error) {
      var environment = (DGET('EASEBUZZ_ENV') || 'prod').toString().toLowerCase();
    }


    if (!merchantKey || !salt) {
      return new Response(JSON.stringify({
        status: 0,
        error: 'Missing Easebuzz credentials - please configure MERCHANT_KEY and SALT in Supabase secrets'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and format amount
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({
        status: 0,
        error: 'Invalid amount'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Easebuzz requires fixed two-decimal amount string; use toFixed(2) consistently
    const amountForGateway = normalizedData.amount.toFixed(2);

    // Prepare UDFs 1-10 for hash generation (Easebuzz expects exactly 10 UDFs)
    const hashUdf1 = (normalizedData.udf1 || '').toString();
    const hashUdf2 = (normalizedData.udf2 || '').toString();
    const hashUdf3 = (normalizedData.udf3 || '').toString();
    const hashUdf4 = (normalizedData.udf4 || '').toString();
    const hashUdf5 = (normalizedData.udf5 || '').toString();
    const hashUdf6 = (normalizedData.udf6 || '').toString();
    const hashUdf7 = (normalizedData.udf7 || '').toString();
    const hashUdf8 = (normalizedData.udf8 || '').toString();
    const hashUdf9 = (normalizedData.udf9 || '').toString();
    const hashUdf10 = (normalizedData.udf10 || '').toString();

    // Generate hash for the payment request (must match fields sent exactly)
    // Format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = [
      merchantKey,
      normalizedData.txnid,
      amountForGateway,
      (normalizedData.productinfo || '').toString(),
      (normalizedData.firstname || '').toString(),
      (normalizedData.email || '').toString(),
      hashUdf1, hashUdf2, hashUdf3, hashUdf4, hashUdf5,
      hashUdf6, hashUdf7, hashUdf8, hashUdf9, hashUdf10,
      salt
    ].join('|');

    const hash = await generateHash(hashString);


    // Prepare form data for Easebuzz API (must match hash generation order exactly)
    const formData = new FormData();
    formData.append('key', merchantKey);
    formData.append('txnid', normalizedData.txnid);
    formData.append('amount', amountForGateway);
    formData.append('productinfo', normalizedData.productinfo);
    formData.append('firstname', normalizedData.firstname);
    formData.append('email', normalizedData.email);
    formData.append('phone', normalizedData.phone);
    formData.append('surl', normalizedData.surl);
    formData.append('furl', normalizedData.furl);
    formData.append('hash', hash);

    // Add UDF fields 1-10 (required by Easebuzz API)
    formData.append('udf1', normalizedData.udf1);
    formData.append('udf2', normalizedData.udf2);
    formData.append('udf3', normalizedData.udf3);
    formData.append('udf4', normalizedData.udf4);
    formData.append('udf5', normalizedData.udf5);
    formData.append('udf6', normalizedData.udf6);
    formData.append('udf7', normalizedData.udf7);
    formData.append('udf8', normalizedData.udf8);
    formData.append('udf9', normalizedData.udf9);
    formData.append('udf10', normalizedData.udf10);


    // Optional address fields supported by some gateways (ignored if unknown)
    if (address1 || address) formData.append('address1', (address1 || address));
    if (address2) formData.append('address2', address2);
    if (city) formData.append('city', city);
    if (state) formData.append('state', state);
    formData.append('country', (country || 'India'));
    if (pincode) formData.append('zipcode', pincode);

    const baseUrl = environment === 'test' ? 'https://testpay.easebuzz.in' : 'https://pay.easebuzz.in';

    try {
      // Call Easebuzz API with timeout
      const easebuzzResponse = await fetch(`${baseUrl}/payment/initiateLink`, {
        method: 'POST',
        body: formData
      });

      if (!easebuzzResponse.ok) {
        return new Response(JSON.stringify({
          status: 0,
          error: `Easebuzz API error: ${easebuzzResponse.status}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const easebuzzData: any = await easebuzzResponse.json();

      if (easebuzzData.status === 1 && easebuzzData.data) {
        const accessKey = easebuzzData.data;
        const paymentUrl = `https://pay.easebuzz.in/pay/${accessKey}`;


        return new Response(JSON.stringify({
          status: 1,
          access_key: accessKey,
          payment_url: paymentUrl,
          redirectUrl: paymentUrl,
          message: 'Payment initiated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          status: 0,
          error: easebuzzData.message || 'Payment initiation failed',
          details: easebuzzData
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (fetchError: any) {
      
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({
          status: 0,
          error: 'Easebuzz API timeout - please try again',
          details: 'The payment gateway is currently slow to respond'
        }), {
          status: 408,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 0,
        error: 'Easebuzz API connection failed',
        details: fetchError.message || 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({
      status: 0,
      error: 'Payment initiation failed',
      details: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
