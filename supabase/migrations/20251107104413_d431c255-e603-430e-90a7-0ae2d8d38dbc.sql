-- ============================================================
-- CRITICAL SECURITY FIX: Admin Authentication & RLS Policies
-- ============================================================

-- Step 1: Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 4: Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Step 5: FIX CRITICAL - Remove dangerous public read policies
-- ============================================================

-- FIX: orders table - Remove public read access
DROP POLICY IF EXISTS "Allow public read access for order lookup" ON public.orders;
DROP POLICY IF EXISTS "public_read_orders" ON public.orders;
DROP POLICY IF EXISTS "Admin full access to orders" ON public.orders;

-- Create proper admin policy for orders
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Keep the customer-specific policies (these are good)
-- "Allow authenticated users to read own orders" - already exists
-- "Allow authenticated users to insert orders" - already exists
-- "Allow authenticated users to update own orders" - already exists

-- FIX: customers table - Remove dangerous public access
DROP POLICY IF EXISTS "Admin full access to customers" ON public.customers;

-- Create proper admin policy for customers
CREATE POLICY "Admins can manage all customers"
ON public.customers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to view their own customer record
CREATE POLICY "Users can view own customer record"
ON public.customers
FOR SELECT
USING (auth.uid() = id);

-- ============================================================
-- Step 6: Enable RLS on tables that have policies but RLS disabled
-- ============================================================

-- Enable RLS on all tables (some might already have it enabled, that's OK)
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 7: Fix other admin policies to use role checks
-- ============================================================

-- Categories
DROP POLICY IF EXISTS "Admin full access to categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Contact submissions
DROP POLICY IF EXISTS "Admin full access to contact_submissions" ON public.contact_submissions;
CREATE POLICY "Admins can manage contact submissions"
ON public.contact_submissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Deliveries
DROP POLICY IF EXISTS "Admin full access to deliveries" ON public.deliveries;
CREATE POLICY "Admins can manage deliveries"
ON public.deliveries
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Homepage sections
DROP POLICY IF EXISTS "Admin full access to homepage_sections" ON public.homepage_sections;
CREATE POLICY "Admins can manage homepage sections"
ON public.homepage_sections
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Inventory
DROP POLICY IF EXISTS "Admin full access to inventory" ON public.inventory;
CREATE POLICY "Admins can manage inventory"
ON public.inventory
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Offers
DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;
CREATE POLICY "Admins can manage offers"
ON public.offers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Products
DROP POLICY IF EXISTS "Admin full access to products" ON public.products;
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Settings
DROP POLICY IF EXISTS "Admin full access to settings" ON public.settings;
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Testimonials
DROP POLICY IF EXISTS "Admin full access to testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials"
ON public.testimonials
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Vendor orders
DROP POLICY IF EXISTS "Enable full access for vendor orders" ON public.vendor_orders;
CREATE POLICY "Admins can manage vendor orders"
ON public.vendor_orders
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Vendors
DROP POLICY IF EXISTS "Admin full access to vendors" ON public.vendors;
CREATE POLICY "Admins can manage vendors"
ON public.vendors
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Step 8: Create order tracking endpoint (secure alternative to public access)
-- ============================================================

-- Function to lookup order by order_id and phone/email (for tracking)
CREATE OR REPLACE FUNCTION public.track_order(
  _order_id TEXT,
  _customer_phone TEXT DEFAULT NULL,
  _customer_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id TEXT,
  status TEXT,
  payment_status TEXT,
  customer_name TEXT,
  product_name TEXT,
  quantity INTEGER,
  amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.order_id,
    o.status,
    o.payment_status,
    o.customer_name,
    o.product_name,
    o.quantity,
    o.amount,
    o.created_at
  FROM orders o
  WHERE o.order_id = _order_id
    AND (
      o.customer_phone = _customer_phone 
      OR o.customer_email = _customer_email
    )
  LIMIT 1;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.track_order TO authenticated, anon;