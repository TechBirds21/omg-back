-- Quick Fix RLS Policies (Copy-Paste Ready)
-- Run this in Supabase SQL Editor

-- Fix for images bucket
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

-- Fix for product-images bucket
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

