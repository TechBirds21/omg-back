-- Create admin user helper function (run this once, then delete)
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'Admin@omaguva.com';
  
  -- If user doesn't exist, we need to create via dashboard or signup
  -- For now, let's prepare the role assignment for when user signs up
  
  -- Clean up any existing admin role entries for this email
  DELETE FROM public.user_roles 
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'Admin@omaguva.com'
  );
  
  -- If user exists, assign admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to existing user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User does not exist yet. Please sign up first with Admin@omaguva.com';
  END IF;
END $$;

-- Create a function to auto-assign admin role on signup for specific email
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign admin role if signing up with admin email
  IF NEW.email = 'Admin@omaguva.com' OR NEW.email = 'admin@omaguva.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign admin role on user creation
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_signup();