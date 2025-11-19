// @ts-nocheck
import { InvoiceData } from './invoice';
import { getInvoiceData as fetchInvoiceDataFromBackend } from '@/lib/api-storefront';

export interface CompleteOrderData {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  amount: number;
  status: string;
  payment_method?: string;
  payment_status: string;
  shipping_address?: string;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  product_colors?: string[];
  product_sizes?: string[];
  vendor_id?: string;
  vendor_code?: string;
  saree_id?: string;
  transaction_id?: string;
  payment_gateway_response?: any;
  product?: {
    id: string;
    name: string;
    images: string[];
    cover_image_index?: number;
    price: number;
    colors: string[];
    saree_id?: string;
    vendor?: {
      id: string;
      name: string;
      vendor_code: string;
    };
  };
}

// Convert an image URL to a data URL (base64) suitable for embedding in PDF
export async function imageUrlToDataUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    // Attempt to fetch as blob (works for public URLs with CORS enabled)
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return url; // fallback to URL if fetch fails
    const blob = await resp.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || url));
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback to raw URL; jsPDF may still accept in some cases
    return url;
  }
}

/**
 * Fetch complete order details including product information for invoice generation
 * Now uses Python backend instead of direct Supabase calls
 */
export const getCompleteOrderData = async (orderId: string): Promise<CompleteOrderData | null> => {
  try {
    // Try to get order from backend API
    const { getOrderByOrderId } = await import('@/lib/api-storefront');
    const orderData = await getOrderByOrderId(orderId);
    if (orderData) {
      // If order has product_id, try to get product details
      if (orderData.product_id && !orderData.product) {
        try {
          const { fetchProductById } = await import('@/lib/api-storefront');
          const product = await fetchProductById(orderData.product_id);
          if (product) {
            orderData.product = product;
          }
        } catch (e) {
          // Product fetch failed, continue without product
        }
      }
      return orderData as CompleteOrderData;
    }
    return null;
  } catch (backendError) {
    console.warn('Failed to fetch order from backend:', backendError);
    return null;
  }
};

/**
 * Generate comprehensive invoice data from order information
 * Now uses Python backend instead of direct Supabase calls
 */
export const generateInvoiceFromOrder = async (
  orderId: string,
  paymentDetails?: any
): Promise<InvoiceData | null> => {
  try {
    // Try to get invoice data from Python backend first
    try {
      const invoiceData = await fetchInvoiceDataFromBackend(orderId);
      if (invoiceData) {
        // Convert image URLs to data URLs for PDF embedding
        const processedItems = await Promise.all(
          invoiceData.items.map(async (item) => {
            if (item.image) {
              const imgDataUrl = await imageUrlToDataUrl(item.image);
              return { ...item, image: imgDataUrl };
            }
            return item;
          })
        );
        return { ...invoiceData, items: processedItems };
      }
    } catch (error) {
      console.warn('Failed to fetch invoice from backend, falling back to legacy method:', error);
    }
    
    // Fallback to legacy method (for backward compatibility)
    // First try to get complete order data from database
    let orderData = await getCompleteOrderData(orderId);
    // If order has no product join (product_id null), try resolving product by order.product_name
    if (orderData && !orderData.product && orderData.product_name) {
      try {
        const { fetchProductByName } = await import('@/lib/api-storefront');
        const baseName = orderData.product_name.split(' (')[0] || orderData.product_name;
        const candidateProduct = await fetchProductByName(baseName);
        if (candidateProduct) {
          (orderData as any).product = candidateProduct;
        }
      } catch (e) {
        // Product fetch failed, continue without product
        console.warn('Failed to fetch product by name:', e);
      }
    }
    
    if (orderData) {
      // Build items list. Prefer consolidated items stored in applied_offer.items from Checkout
      let items: Array<{ name: string; quantity: number; price: number; total: number; image?: string; colors?: string[]; sizes?: string[]; sareeId?: string; }> = [];
      try {
        const offerRaw: any = (orderData as any).applied_offer;
        const offer = typeof offerRaw === 'string' ? JSON.parse(offerRaw) : offerRaw;
        if (offer && Array.isArray(offer.items) && offer.items.length > 0) {
          for (const it of offer.items) {
            // Convert image URL to data URL for PDF embedding
            const imgDataUrl = await imageUrlToDataUrl(it.image);
            items.push({
              name: it.name,
              quantity: Number(it.quantity || 1),
              price: Number(it.price || 0),
              total: Number(it.price || 0) * Number(it.quantity || 1),
              image: imgDataUrl,
              colors: it.color ? [String(it.color)] : [],
              sizes: it.size ? [String(it.size)] : (it.sizes && Array.isArray(it.sizes) ? it.sizes.map(String) : []),
              sareeId: undefined
            });
          }
        }
      } catch {}

      // If no consolidated items, fall back to single product representation with best image
      if (items.length === 0) {
      let selectedImage: string | undefined = undefined;
      const selectedColors = orderData.product_colors || [];
      if (orderData.product && Array.isArray(orderData.product.colors) && Array.isArray(orderData.product.color_images) && selectedColors.length > 0) {
        const colorIndex = orderData.product.colors.findIndex((c: string) => (c || '').toLowerCase() === String(selectedColors[0] || '').toLowerCase());
        if (colorIndex >= 0 && Array.isArray(orderData.product.color_images[colorIndex]) && orderData.product.color_images[colorIndex].length > 0) {
          selectedImage = orderData.product.color_images[colorIndex][0];
        }
      }
      if (!selectedImage && Array.isArray(orderData.product?.images)) {
        selectedImage = orderData.product?.images?.[orderData.product?.cover_image_index || 0];
      }
      const selectedImageDataUrl = await imageUrlToDataUrl(selectedImage);
        items = [{
          name: orderData.product_name,
          quantity: orderData.quantity,
          price: orderData.amount / Math.max(1, orderData.quantity),
          total: orderData.amount,
          image: selectedImageDataUrl,
          colors: orderData.product_colors || orderData.product?.colors || [],
          sizes: orderData.product_sizes || [],
          sareeId: orderData.saree_id || orderData.product?.saree_id
        }];
      }

      // If still no items, create a basic item from order data
      if (items.length === 0) {
        
        const itemQuantity = Math.max(1, orderData.quantity || 1);
        const itemAmount = orderData.amount || 0;
        const itemPrice = itemAmount / itemQuantity;

        items = [{
          name: orderData.product_name || `Order ${orderData.order_id}`,
          quantity: itemQuantity,
          price: itemPrice,
          total: itemAmount,
          colors: orderData.product_colors || [],
          sizes: orderData.product_sizes || [],
          sareeId: orderData.saree_id
        }];
      }

      // Compute totals from items (robust against rounding)
      const subtotal = items.reduce((s, it) => s + Number(it.total || (Number(it.price || 0) * Number(it.quantity || 1))), 0);

      return {
        orderId: orderData.order_id,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        customerPhone: orderData.customer_phone || '',
        shippingAddress: orderData.shipping_address || 'Address on file',
        items,
        subtotal,
        total: subtotal,
        paymentMethod: orderData.payment_method || 'Online Payment',
        paymentStatus: orderData.payment_status || undefined,
        transactionId: orderData.transaction_id || paymentDetails?.bank_ref_num || paymentDetails?.txnid,
        orderDate: orderData.created_at,
        paymentGatewayResponse: orderData.payment_gateway_response || paymentDetails,
        productImages: orderData.product?.images || [],
        coverImageIndex: orderData.product?.cover_image_index || 0
      };
    }

    // Fallback: generate from payment details if order not found in database
    if (paymentDetails) {
      return {
        orderId: paymentDetails.txnid || orderId,
        customerName: paymentDetails.firstname || 'Customer',
        customerEmail: paymentDetails.email || '',
        customerPhone: paymentDetails.phone || '',
        shippingAddress: 'Address on file',
        items: [{
          name: paymentDetails.productinfo || 'Saree Order',
          quantity: 1,
          price: parseFloat(paymentDetails.amount || '0'),
          total: parseFloat(paymentDetails.amount || '0'),
          colors: [],
          sareeId: undefined
        }],
        subtotal: parseFloat(paymentDetails.amount || '0'),
        total: parseFloat(paymentDetails.amount || '0'),
        paymentMethod: paymentDetails.payment_source || paymentDetails.gateway || 'Online Payment',
        transactionId: paymentDetails.bank_ref_num || paymentDetails.easepayid || paymentDetails.txnid,
        orderDate: new Date().toISOString(),
        paymentGatewayResponse: paymentDetails
      };
    }

    return null;
  } catch (error) {
    
    return null;
  }
};

/**
 * Generate invoice data from payment response (for immediate use after payment)
 */
export const generateInvoiceFromPaymentResponse = async (
  paymentResponse: any
): Promise<InvoiceData | null> => {
  try {
    // If consolidated items were kept in session during checkout, prefer them for invoice lines
    let consolidated: any[] | undefined;
    try { const s = sessionStorage.getItem('pp_cart_items'); if (s) consolidated = JSON.parse(s); } catch {}

    // First try to get order from database using udf2 (which contains order_id)
    // If that doesn't work, try using transaction ID directly
    let orderData = null;
    
    // Try udf2 first (contains order_id)
    if (paymentResponse.udf2) {
      orderData = await getCompleteOrderData(paymentResponse.udf2);
    }
    
    // If not found, try PhonePe identifiers in order of likelihood
    if (!orderData && paymentResponse.merchantOrderId) {
      orderData = await getCompleteOrderData(paymentResponse.merchantOrderId);
    }
    if (!orderData && paymentResponse.merchantTransactionId) {
      orderData = await getCompleteOrderData(paymentResponse.merchantTransactionId);
    }
    if (!orderData && paymentResponse.orderId) {
      orderData = await getCompleteOrderData(paymentResponse.orderId);
    }
    // Finally, try txnid
    if (!orderData && paymentResponse.txnid) {
      orderData = await getCompleteOrderData(paymentResponse.txnid);
    }
    
    if (orderData) {
      // Prefer consolidated items stored on order.applied_offer.items; else fallback to single row
      let items: any[] = [];
      try {
        const offerRaw: any = (orderData as any).applied_offer;
        const offer = typeof offerRaw === 'string' ? JSON.parse(offerRaw) : offerRaw;
        if (offer && Array.isArray(offer.items) && offer.items.length > 0) {
          for (const it of offer.items) {
            const imgDataUrl = await imageUrlToDataUrl(it.image);
            items.push({
              name: it.name,
              quantity: Number(it.quantity || 1),
              price: Number(it.price || 0),
              total: Number(it.price || 0) * Number(it.quantity || 1),
              image: imgDataUrl,
              colors: it.color ? [String(it.color)] : []
            });
          }
        }
      } catch {}
      if (items.length === 0 && Array.isArray(consolidated) && consolidated.length > 0) {
        for (const it of consolidated) {
          const imgDataUrl = await imageUrlToDataUrl(it.image);
          items.push({
            name: it.name,
            quantity: Number(it.quantity || 1),
            price: Number(it.price || 0),
            total: Number(it.price || 0) * Number(it.quantity || 1),
            image: imgDataUrl,
            colors: it.color ? [String(it.color)] : []
          });
        }
      }
      if (items.length === 0) {
        const img = orderData.product?.images?.[orderData.product?.cover_image_index || 0];
        const imgDataUrl = await imageUrlToDataUrl(img);
        items = [{
          name: orderData.product_name,
          quantity: orderData.quantity,
          price: orderData.amount / Math.max(1, orderData.quantity),
          total: orderData.amount,
          image: imgDataUrl,
          colors: orderData.product_colors || orderData.product?.colors || []
        }];
      }
      const subtotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
      return {
        orderId: orderData.order_id,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        customerPhone: orderData.customer_phone || paymentResponse.phone || '',
        shippingAddress: orderData.shipping_address || 'Address on file',
        items,
        subtotal,
        total: subtotal,
        paymentMethod: paymentResponse.payment_source || paymentResponse.PG_TYPE || 'Online Payment via PhonePe',
        transactionId: paymentResponse.transactionId || paymentResponse.bank_ref_num || paymentResponse.easepayid || paymentResponse.txnid,
        orderDate: orderData.created_at,
        paymentGatewayResponse: paymentResponse,
        productImages: orderData.product?.images || [],
        coverImageIndex: orderData.product?.cover_image_index || 0
      };
    }

    // Fallback: create basic invoice from payment response
    return {
      orderId: paymentResponse.udf2 || paymentResponse.merchantOrderId || paymentResponse.orderId || paymentResponse.merchantTransactionId || paymentResponse.txnid,
      customerName: paymentResponse.firstname || 'Customer',
      customerEmail: paymentResponse.email || '',
      customerPhone: paymentResponse.phone || '',
      shippingAddress: 'Address on file',
      items: [{
        name: paymentResponse.productinfo || 'Saree Order',
        quantity: 1,
        price: parseFloat(paymentResponse.amount || '0'),
        total: parseFloat(paymentResponse.amount || '0'),
        colors: [],
        sareeId: undefined
      }],
      subtotal: parseFloat(paymentResponse.amount || '0'),
      total: parseFloat(paymentResponse.amount || '0'),
      paymentMethod: paymentResponse.payment_source || paymentResponse.PG_TYPE || 'Online Payment',
      paymentStatus: (paymentResponse.status || '').toLowerCase() === 'failed' ? 'FAILED' : undefined,
      transactionId: paymentResponse.transactionId || paymentResponse.bank_ref_num || paymentResponse.easepayid || paymentResponse.txnid,
      orderDate: new Date().toISOString(),
      paymentGatewayResponse: paymentResponse
    };
  } catch (error) {
    
    return null;
  }
};
