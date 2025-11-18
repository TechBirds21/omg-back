-- Fix RLS (Row Level Security) policies for Store Billing tables
-- Run this in Supabase SQL Editor if you're getting permission errors

-- Disable RLS temporarily for testing (NOT RECOMMENDED FOR PRODUCTION)
-- ALTER TABLE store_bills DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_bill_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_discounts DISABLE ROW LEVEL SECURITY;

-- OR: Create proper RLS policies (RECOMMENDED)

-- Policy for store_bills: Allow all operations for authenticated users
-- Replace 'authenticated' with your role if needed
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON store_bills
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for store_bill_items: Allow all operations for authenticated users
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON store_bill_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for store_discounts: Allow all operations for authenticated users
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON store_discounts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- If you want to allow service role (for backend API):
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON store_bills
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all for service role" ON store_bill_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all for service role" ON store_discounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Alternative: Disable RLS completely (ONLY FOR TESTING/DEVELOPMENT)
-- Uncomment these lines if you want to disable RLS:
-- ALTER TABLE store_bills DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_bill_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_discounts DISABLE ROW LEVEL SECURITY;

