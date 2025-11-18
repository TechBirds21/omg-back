-- Store Billing System Tables
-- Run this SQL script to create the necessary tables for store billing

-- Store Bills Table
CREATE TABLE IF NOT EXISTS store_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_id UUID REFERENCES customers(id),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    discount_type VARCHAR(50),
    discount_code VARCHAR(50),
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    notes TEXT,
    invoice_pdf_url TEXT,
    invoice_sent_email BOOLEAN DEFAULT FALSE,
    invoice_sent_sms BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Store Bill Items Table
CREATE TABLE IF NOT EXISTS store_bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES store_bills(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10, 2) NOT NULL,
    color VARCHAR(100),
    size VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Store Discounts Table (for discount codes)
CREATE TABLE IF NOT EXISTS store_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(50) NOT NULL, -- 'percentage' or 'amount'
    discount_value DECIMAL(10, 2) NOT NULL,
    maximum_discount_amount DECIMAL(10, 2),
    minimum_purchase_amount DECIMAL(10, 2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_bills_bill_number ON store_bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_store_bills_customer_id ON store_bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_bills_customer_phone ON store_bills(customer_phone);
CREATE INDEX IF NOT EXISTS idx_store_bills_created_at ON store_bills(created_at);
CREATE INDEX IF NOT EXISTS idx_store_bill_items_bill_id ON store_bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_store_bill_items_product_id ON store_bill_items(product_id);
CREATE INDEX IF NOT EXISTS idx_store_discounts_code ON store_discounts(discount_code);
CREATE INDEX IF NOT EXISTS idx_store_discounts_active ON store_discounts(is_active);

-- Add comments
COMMENT ON TABLE store_bills IS 'Store billing/invoice records';
COMMENT ON TABLE store_bill_items IS 'Items in each store bill';
COMMENT ON TABLE store_discounts IS 'Discount codes for store billing';

