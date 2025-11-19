-- Fix RLS Policies for Storage Buckets
-- Run this in Supabase SQL Editor to allow all operations on storage buckets
-- NOTE: PostgreSQL doesn't support IF NOT EXISTS for CREATE POLICY, so we use DROP IF EXISTS first

-- ============================================
-- Images Bucket
-- ============================================

DROP POLICY IF EXISTS "Allow uploads to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow downloads from images" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from images" ON storage.objects;

CREATE POLICY "Allow uploads to images"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Allow downloads from images"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'images');

CREATE POLICY "Allow updates to images"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'images');

CREATE POLICY "Allow deletes from images"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'images');

-- ============================================
-- Product Images Bucket
-- ============================================

DROP POLICY IF EXISTS "Allow uploads to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow downloads from product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from product-images" ON storage.objects;

CREATE POLICY "Allow uploads to product-images"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow downloads from product-images"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'product-images');

CREATE POLICY "Allow updates to product-images"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'product-images');

CREATE POLICY "Allow deletes from product-images"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'product-images');

-- ============================================
-- Resumes Bucket
-- ============================================

DROP POLICY IF EXISTS "Allow uploads to resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow downloads from resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from resumes" ON storage.objects;

CREATE POLICY "Allow uploads to resumes"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Allow downloads from resumes"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'resumes');

CREATE POLICY "Allow updates to resumes"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'resumes');

CREATE POLICY "Allow deletes from resumes"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'resumes');

-- ============================================
-- Uploads Bucket
-- ============================================

DROP POLICY IF EXISTS "Allow uploads to uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow downloads from uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from uploads" ON storage.objects;

CREATE POLICY "Allow uploads to uploads"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Allow downloads from uploads"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'uploads');

CREATE POLICY "Allow updates to uploads"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'uploads');

CREATE POLICY "Allow deletes from uploads"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'uploads');

-- ============================================
-- Categories Bucket
-- ============================================

DROP POLICY IF EXISTS "Allow uploads to categories" ON storage.objects;
DROP POLICY IF EXISTS "Allow downloads from categories" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to categories" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from categories" ON storage.objects;

CREATE POLICY "Allow uploads to categories"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'categories');

CREATE POLICY "Allow downloads from categories"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'categories');

CREATE POLICY "Allow updates to categories"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'categories');

CREATE POLICY "Allow deletes from categories"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'categories');

-- ============================================
-- Testimonials Bucket
-- ============================================

DROP POLICY IF EXISTS "Allow uploads to testimonials" ON storage.objects;
DROP POLICY IF EXISTS "Allow downloads from testimonials" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to testimonials" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from testimonials" ON storage.objects;

CREATE POLICY "Allow uploads to testimonials"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'testimonials');

CREATE POLICY "Allow downloads from testimonials"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'testimonials');

CREATE POLICY "Allow updates to testimonials"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'testimonials');

CREATE POLICY "Allow deletes from testimonials"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'testimonials');
