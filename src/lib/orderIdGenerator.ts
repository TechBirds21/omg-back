import { supabase } from '@/integrations/supabase/client';

/**
 * Generate order ID with format: [MONTH]_[VENDOR_CODE_FIRST_LETTER][SEQ_NUMBER]
 * Example: OCT_A01 (A01), OCT_M01 (M01), OCT_P01 (P01), OCT_S01 (S01), OCT_G01 (for guest)
 * Month updates automatically based on current date
 */
export async function generateOrderId(productIdentifier: string): Promise<string> {
  try {
    

    let product: any = null;
    let productError: any = null;

    // Check if the identifier is a product ID (UUID format) or product name
    const isProductId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productIdentifier);

    if (isProductId) {
      // Look up by product ID
      const result = await supabase
        .from('products')
        .select(`
          vendor_id,
          vendors (
            vendor_code
          )
        `)
        .eq('id', productIdentifier)
        .single();

      product = result.data;
      productError = result.error;
    } else if (productIdentifier === 'guest') {
      // Handle guest orders
      return generateGuestOrderId();
    } else {
      // Look up by product name
      const result = await supabase
        .from('products')
        .select(`
          vendor_id,
          vendors (
            vendor_code
          )
        `)
        .eq('name', productIdentifier)
        .single();

      product = result.data;
      productError = result.error;
    }

    

    if (productError || !product?.vendors?.vendor_code) {
      console.error('Product lookup failed:', productError);
      // Fallback: use timestamp-based ID for guest orders
      return generateFallbackOrderId();
    }

    

    // Try database function first, with fallback
    try {
      
      const { data, error } = await supabase.rpc('generate_vendor_order_id', {
        vendor_code_param: product.vendors.vendor_code
      });

      if (error) {
        console.error('Database function failed:', error);
        return generateFallbackOrderId(product.vendors.vendor_code);
      }

      
      return data as string;
    } catch (rpcError) {
      console.error('RPC call failed:', rpcError);
      return generateFallbackOrderId(product.vendors.vendor_code);
    }
  } catch (error) {
    console.error('Order ID generation failed:', error);
    return generateFallbackOrderId();
  }
}

/**
 * Generate fallback order ID with smart sequential numbering
 * Format: [MONTH]_[VENDOR_CODE_FIRST_LETTER][NUMBER] - e.g., OCT_A01, OCT_M01, OCT_P01, OCT_S01
 */
function generateFallbackOrderId(vendorCode?: string): string {
  // Ensure we get the current month in 3-letter format (OCT, NOV, DEC, etc.)
  // Use IST timezone to ensure correct month detection
  const month = new Date().toLocaleString('en-US', { 
    month: 'short', 
    timeZone: 'Asia/Kolkata' 
  }).toUpperCase();

  if (vendorCode) {
    // Use timestamp + random component for uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100);
    const counter = (timestamp % 1000) + random; // Mix timestamp and random for uniqueness
    const formattedNum = counter < 100 ? counter.toString().padStart(2, '0') : counter.toString();
    const vendorPrefix = vendorCode.charAt(0).toUpperCase();
    return `${month}_${vendorPrefix}${formattedNum}`;
  }

  // For guest orders
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100);
  const counter = (timestamp % 1000) + random;
  const formattedNum = counter < 100 ? counter.toString().padStart(2, '0') : counter.toString();
  return `${month}_G${formattedNum}`;
}

/**
 * Generate order ID for guest orders (no vendor)
 * Format: [MONTH]_G[NUMBER] - e.g., OCT_G01, OCT_G02
 */
export async function generateGuestOrderId(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_vendor_order_id', {
      vendor_code_param: 'GUEST'
    });

    if (error) {
      console.error('Database function failed for guest order ID:', error);
      // Fallback with sequential format using current month in IST
      const month = new Date().toLocaleString('en-US', { 
        month: 'short', 
        timeZone: 'Asia/Kolkata' 
      }).toUpperCase();
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 100);
      const counter = (timestamp % 1000) + random;
      const formattedNum = counter < 100 ? counter.toString().padStart(2, '0') : counter.toString();
      return `${month}_G${formattedNum}`;
    }

    return data as string;
  } catch (error) {
    console.error('Exception in guest order ID generation:', error);
    // Fallback with sequential format using current month in IST
    const month = new Date().toLocaleString('en-US', { 
      month: 'short', 
      timeZone: 'Asia/Kolkata' 
    }).toUpperCase();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100);
    const counter = (timestamp % 1000) + random;
    const formattedNum = counter < 100 ? counter.toString().padStart(2, '0') : counter.toString();
    return `${month}_G${formattedNum}`;
  }
}
