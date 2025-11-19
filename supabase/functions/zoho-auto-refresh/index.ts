import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const refreshToken = Deno.env.get('ZOHO_REFRESH_TOKEN');
    const clientId = Deno.env.get('ZOHO_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');

    if (!refreshToken || !clientId || !clientSecret) {
      console.error('❌ Missing Zoho credentials in environment');
      return new Response(
        JSON.stringify({ error: 'Missing Zoho credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Starting automatic token refresh...');

    const formData = new URLSearchParams();
    formData.append('refresh_token', refreshToken);
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('grant_type', 'refresh_token');

    const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error('❌ Zoho token refresh failed:', data);
      return new Response(
        JSON.stringify({ error: 'Token refresh failed', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ New access token received from Zoho');

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store the new token in the database
    const { error: dbError } = await supabase.rpc('update_zoho_token', {
      p_access_token: data.access_token,
      p_refresh_token: refreshToken, // Keep the same refresh token
      p_expires_in: data.expires_in || 3600
    });

    if (dbError) {
      console.error('❌ Failed to update token in database:', dbError);
      return new Response(
        JSON.stringify({ error: 'Database update failed', details: dbError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Token stored in database successfully');
    console.log(`⏰ Token will expire in ${data.expires_in} seconds`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Token refreshed and stored successfully',
        expires_in: data.expires_in
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Auto-refresh error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
