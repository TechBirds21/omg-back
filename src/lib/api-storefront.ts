export interface Product {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  sku?: string;
  price: number;
  original_price?: number;
  images: string[];
  video_url?: string; // Video URL for product showcase
  colors?: string[];
  color_images?: string[][]; // 2D array: color_images[index] = images for colors[index]
  sizes?: string[];
  fabric?: string;
  care_instructions?: string;
  is_active?: boolean;
  featured?: boolean;
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  cover_image_index?: number;
  vendor_code?: string;
  color_stock?: Array<{ color: string; stock: number }>;
  total_stock?: number;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  best_seller?: boolean;
  best_seller_rank?: number;
  new_collection?: boolean;
  new_collection_start_date?: string;
  new_collection_end_date?: string | null;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[];
  cover_image_index?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  customer_location?: string;
  content: string;
  rating?: number;
  image_url?: string;
}

export interface OrderPayload {
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_name: string;
  product_colors?: string[];
  product_sizes?: string[];
  quantity: number;
  amount: number;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  shipping_address?: string;
  applied_offer?: unknown;
}

const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const API_BASE = RAW_API_BASE.replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      ...init,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(message || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to backend API at ${API_BASE}. Please ensure the backend server is running on port 8000.`);
    }
    throw error;
  }
}

export async function fetchProducts(options: {
  limit?: number;
  featured?: boolean;
  newCollection?: boolean;
  categoryId?: string;
  search?: string;
} = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (typeof options.featured === 'boolean') params.set('featured', String(options.featured));
  if (typeof options.newCollection === 'boolean') params.set('newCollection', String(options.newCollection));
  if (options.categoryId) params.set('categoryId', options.categoryId);
  if (options.search) params.set('search', options.search);

  const query = params.toString();
  return request<Product[]>(`/store/products${query ? `?${query}` : ''}`);
}

export async function fetchProductById(id: string): Promise<Product> {
  return request<Product>(`/store/products/${encodeURIComponent(id)}`);
}

export async function fetchProductByName(name: string): Promise<Product> {
  return request<Product>(`/store/products/by-name/${encodeURIComponent(name)}`);
}

export async function fetchSimilarProducts(productId: string): Promise<Product[]> {
  return request<Product[]>(`/store/products/${encodeURIComponent(productId)}/similar`);
}

export async function fetchCategories(): Promise<Category[]> {
  return request<Category[]>('/store/categories');
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  return request<Testimonial[]>('/store/testimonials');
}

export async function createOrder(payload: OrderPayload): Promise<{ status: string; order_id: string }> {
  return request<{ status: string; order_id: string }>('/store/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSettings(): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/store/settings');
}

export interface PincodeDetail {
  pincode: string;
  area: string;
  city: string;
  state: string;
  country: string;
}

export async function fetchPincodeDetail(pincode: string): Promise<PincodeDetail> {
  return request<PincodeDetail>(`/store/pincodes/${encodeURIComponent(pincode)}`);
}

// Customer-facing APIs
export async function getOrdersByEmail(email: string): Promise<any[]> {
  return request<any[]>(`/customer/orders/by-email?email=${encodeURIComponent(email)}`);
}

export async function getOrdersByCustomerDetails(email?: string, phone?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (phone) params.set('phone', phone);
  const query = params.toString();
  return request<any[]>(`/customer/orders/by-customer${query ? `?${query}` : ''}`);
}

export async function getOrderById(orderId: string): Promise<any> {
  return request<any>(`/customer/orders/${encodeURIComponent(orderId)}`);
}

export async function submitContactForm(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<any> {
  return request<any>('/customer/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCustomerSettings(): Promise<any> {
  return request<any>('/customer/settings');
}

export async function getOrderByOrderId(orderId: string): Promise<any> {
  return request<any>(`/customer/orders/by-order-id/${encodeURIComponent(orderId)}`);
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: string,
  details?: { transaction_id?: string; payment_gateway_response?: any }
): Promise<any> {
  const payload: any = { payment_status: paymentStatus };
  if (details?.transaction_id) payload.transaction_id = details.transaction_id;
  if (details?.payment_gateway_response) payload.payment_gateway_response = details.payment_gateway_response;
  
  return request<any>(`/customer/orders/${encodeURIComponent(orderId)}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Placeholder functions for features that may need additional implementation
export async function sendOrderConfirmationEmail(orderId: string): Promise<any> {
  // TODO: Implement email sending via backend
  return Promise.resolve({ status: 'success', message: 'Email sent' });
}

export async function createVendorSplitOrders(orderId: string): Promise<any> {
  // TODO: Implement vendor split orders via backend
  return Promise.resolve({ status: 'success', message: 'Vendor orders created' });
}

export async function retryFailedPayment(orderId: string, gateway: string): Promise<any> {
  // TODO: Implement payment retry via backend
  return Promise.resolve({ status: 'success', message: 'Payment retry initiated' });
}

// Best Sellers API
export async function fetchBestSellers(limit?: number): Promise<Product[]> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return request<Product[]>(`/store/products/best-sellers${query ? `?${query}` : ''}`);
}

// New Arrivals API
export async function fetchNewArrivals(limit?: number): Promise<Product[]> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return request<Product[]>(`/store/products/new-arrivals${query ? `?${query}` : ''}`);
}

// Offers API
export interface Offer {
  id: string;
  title: string;
  description?: string;
  offer_type: string;
  conditions: any;
  discount_percentage?: number;
  discount_amount?: number;
  minimum_quantity?: number;
  maximum_quantity?: number;
  applicable_categories?: string[];
  applicable_products?: string[];
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  priority?: number;
}

export async function fetchOffers(): Promise<Offer[]> {
  return request<Offer[]>('/store/offers');
}

// Invoice API
export interface InvoiceData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    image?: string;
    colors?: string[];
    sizes?: string[];
    sareeId?: string;
  }>;
  subtotal: number;
  total: number;
  paymentMethod: string;
  transactionId?: string;
  paymentStatus?: string;
  orderDate: string;
  paymentGatewayResponse?: any;
  productImages?: string[];
  coverImageIndex?: number;
}

export async function getInvoiceData(orderId: string): Promise<InvoiceData> {
  return request<InvoiceData>(`/customer/orders/${encodeURIComponent(orderId)}/invoice`);
}

