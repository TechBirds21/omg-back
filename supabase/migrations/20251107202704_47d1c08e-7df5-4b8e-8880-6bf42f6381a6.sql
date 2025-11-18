-- Create table to store Zoho OAuth tokens
CREATE TABLE IF NOT EXISTS public.zoho_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  api_domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.zoho_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (backend only)
CREATE POLICY "Service role only" ON public.zoho_oauth_tokens
  FOR ALL
  USING (false);

-- Create function to get current valid token
CREATE OR REPLACE FUNCTION public.get_zoho_access_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_token TEXT;
BEGIN
  SELECT access_token INTO current_token
  FROM public.zoho_oauth_tokens
  WHERE expires_at > NOW() + INTERVAL '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN current_token;
END;
$$;

-- Create function to update token
CREATE OR REPLACE FUNCTION public.update_zoho_token(
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_in INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete old tokens
  DELETE FROM public.zoho_oauth_tokens;
  
  -- Insert new token
  INSERT INTO public.zoho_oauth_tokens (
    access_token,
    refresh_token,
    expires_at
  ) VALUES (
    p_access_token,
    p_refresh_token,
    NOW() + (p_expires_in || ' seconds')::INTERVAL
  );
END;
$$;