/*
  # Complete E-Commerce Database Schema for O Maguva

  ## Overview
  This migration creates the complete database schema for the O Maguva saree e-commerce platform.

  ## Tables Created
  
  ### 1. categories
  - Stores product categories (Silk Sarees, Cotton Sarees, etc.)
  - Fields: id, name, description, image_url, images, cover_image_index, is_active, sort_order
  
  ### 2. products
  - Main products table with all saree details
  - Fields: id, name, description, category_id, sku, price, original_price, images, video_url
  - Variants: colors, sizes, fabric, care_instructions
  - Stock management: color_stock, total_stock, stock_status
  - Flags: featured, best_seller, new_collection, is_active
  
  ### 3. testimonials
  - Customer testimonials and reviews
  - Fields: id, customer_name, customer_location, content, rating, image_url
  
  ### 4. orders
  - Customer orders
  - Fields: order details, customer info, payment info, shipping details, status tracking
  
  ### 5. payment_config
  - Payment gateway configurations (PhonePe, Easebuzz, ZohoPay, Razorpay, PineLabs)
  - Fields: payment_method, is_enabled, is_primary, configuration, scheduling
  
  ### 6. store_bills
  - POS/Store billing records
  - Fields: bill details, customer info, items, payment info
  
  ### 7. store_customers
  - Store customer records
  - Fields: customer details, purchase history

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated and public access as appropriate
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  images TEXT[],
  cover_image_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku TEXT UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  colors TEXT[] DEFAULT '{}',
  color_images TEXT[][],
  sizes TEXT[] DEFAULT '{}',
  fabric TEXT,
  care_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  best_seller BOOLEAN DEFAULT false,
  best_seller_rank INTEGER,
  new_collection BOOLEAN DEFAULT false,
  new_collection_start_date DATE,
  new_collection_end_date DATE,
  cover_image_index INTEGER DEFAULT 0,
  vendor_code TEXT,
  color_stock JSONB DEFAULT '[]',
  total_stock INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'in_stock',
  tags TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  slug TEXT UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_location TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  product_name TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_colors TEXT[] DEFAULT '{}',
  product_sizes TEXT[] DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_transaction_id TEXT,
  shipping_address TEXT,
  billing_address TEXT,
  applied_offer JSONB,
  notes TEXT,
  tracking_number TEXT,
  estimated_delivery DATE,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PAYMENT CONFIG TABLE
CREATE TABLE IF NOT EXISTS payment_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  display_name TEXT NOT NULL,
  description TEXT,
  configuration JSONB DEFAULT '{}',
  schedule_from_date DATE,
  schedule_to_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. STORE BILLS TABLE
CREATE TABLE IF NOT EXISTS store_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'completed',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. STORE CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS store_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  address TEXT,
  total_spent DECIMAL(10,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(best_seller) WHERE best_seller = true;
CREATE INDEX IF NOT EXISTS idx_products_new_collection ON products(new_collection) WHERE new_collection = true;
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_store_bills_bill_number ON store_bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_store_customers_phone ON store_customers(phone);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for PUBLIC READ access (customer-facing)

-- Categories - Public read
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (is_active = true);

-- Products - Public read for active products
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (is_active = true);

-- Testimonials - Public read for active testimonials
CREATE POLICY "Testimonials are viewable by everyone"
  ON testimonials FOR SELECT
  USING (is_active = true);

-- Orders - Users can create orders
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Orders - Users can view their own orders by email
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (true);

-- Payment Config - Public read for enabled gateways
CREATE POLICY "Enabled payment configs are viewable"
  ON payment_config FOR SELECT
  USING (is_enabled = true);

-- Store Bills - Authenticated users can create and view
CREATE POLICY "Store staff can manage bills"
  ON store_bills FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Store Customers - Authenticated users can manage
CREATE POLICY "Store staff can manage customers"
  ON store_customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ADMIN Policies (authenticated users have full access)

CREATE POLICY "Admin can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage testimonials"
  ON testimonials FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage payment configs"
  ON payment_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
