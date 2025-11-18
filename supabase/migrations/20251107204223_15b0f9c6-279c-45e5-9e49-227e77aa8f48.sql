-- Update the function to use TRUNCATE instead of DELETE
CREATE OR REPLACE FUNCTION public.update_zoho_token(p_access_token text, p_refresh_token text, p_expires_in integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Truncate table (removes all rows without RLS restrictions)
  TRUNCATE TABLE public.zoho_oauth_tokens;
  
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