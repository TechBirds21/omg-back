// Supabase Edge Function: payment-failure
// Purpose: Handle POST data from PhonePe or other gateways failure URL and redirect to client with GET parameters

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

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
      // 

      // Convert FormData or JSON to URL parameters
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

      // Determine the client-side URL (force our site URL)
      const clientUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080';

      const redirectUrl = `${clientUrl}/payment-failure?${params.toString()}`;

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

      // Fallback: redirect to failure page without parameters
      const clientUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080';

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${clientUrl}/payment-failure`,
          'Cache-Control': 'no-cache'
        }
      });
    }
  }

  // For GET requests, redirect to the main failure page
  const clientUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080';

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': `${clientUrl}/payment-failure`,
      'Cache-Control': 'no-cache'
    }
  });
});
