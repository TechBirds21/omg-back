// API functions for Store Billing System

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export interface StoreProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  original_price?: number;
  images?: string[];
  colors?: string[];
  color_images?: string[][]; // 2D array: color_images[index] = images for colors[index]
  sizes?: string[];
  category_id?: string;
  category_name?: string;
  total_stock: number;
  stock_status?: string;
  color_stock?: Array<{ color: string; stock: number }>;
  stock_value: number;
  description?: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  description?: string;
}

export interface InventorySummary {
  total_products: number;
  total_stock: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  category_breakdown: Array<{
    category_name: string;
    product_count: number;
    total_stock: number;
    stock_value: number;
  }>;
}

export interface OrdersSummary {
  store_orders_count: number;
  store_revenue: number;
  online_orders_count: number;
  online_revenue: number;
  total_orders: number;
  total_revenue: number;
}

export interface BillItemCreate {
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  color?: string;
  size?: string;
  discount_amount?: number;
  discount_percentage?: number;
}

export interface StoreBillCreate {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  items: BillItemCreate[];
  discount_code?: string;
  discount_amount?: number;
  discount_percentage?: number;
  discount_type?: string;
  tax_percentage?: number;
  payment_method?: string;
  notes?: string;
  send_email?: boolean;
  send_sms?: boolean;
}

// Get products for store billing
export async function getStoreProducts(params?: {
  categoryId?: string;
  search?: string;
  includeStock?: boolean;
  barcode?: string;
}): Promise<StoreProduct[]> {
  const queryParams = new URLSearchParams();
  if (params?.categoryId) queryParams.set('categoryId', params.categoryId);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.barcode) queryParams.set('barcode', params.barcode);
  if (params?.includeStock !== undefined) queryParams.set('include_stock', String(params.includeStock));

  const response = await fetch(`${API_BASE}/store/billing/products?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }
  return response.json();
}

// Get categories for store billing
export async function getStoreCategories(): Promise<StoreCategory[]> {
  const response = await fetch(`${API_BASE}/store/billing/categories`);
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }
  return response.json();
}

// Get inventory summary
export async function getInventorySummary(): Promise<InventorySummary> {
  const response = await fetch(`${API_BASE}/store/billing/inventory-summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch inventory summary: ${response.statusText}`);
  }
  return response.json();
}

// Get orders summary (store + online)
export async function getOrdersSummary(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<OrdersSummary> {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.set('start_date', params.startDate);
  if (params?.endDate) queryParams.set('end_date', params.endDate);

  const response = await fetch(`${API_BASE}/store/billing/orders-summary?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch orders summary: ${response.statusText}`);
  }
  return response.json();
}

// Create store bill
export async function createStoreBill(billData: StoreBillCreate): Promise<any> {
  const response = await fetch(`${API_BASE}/store/billing/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(billData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Failed to create bill');
  }

  return response.json();
}

// Get store bills
export async function getStoreBills(params?: {
  page?: number;
  size?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  bills: any[];
  total: number;
  page: number;
  size: number;
  pages: number;
}> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.size) queryParams.set('size', String(params.size));
  if (params?.search) queryParams.set('search', params.search);
  if (params?.startDate) queryParams.set('startDate', params.startDate);
  if (params?.endDate) queryParams.set('endDate', params.endDate);

  const response = await fetch(`${API_BASE}/store/billing?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bills: ${response.statusText}`);
  }
  return response.json();
}

// Get store bill by ID
export async function getStoreBill(billId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/store/billing/${billId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bill: ${response.statusText}`);
  }
  return response.json();
}

// Validate discount code
export async function validateDiscountCode(code: string, amount: number): Promise<any> {
  const response = await fetch(
    `${API_BASE}/store/billing/discounts/validate?code=${encodeURIComponent(code)}&amount=${amount}`
  );
  if (!response.ok) {
    throw new Error(`Failed to validate discount: ${response.statusText}`);
  }
  return response.json();
}

// Search customers
export async function searchCustomers(query: string): Promise<any[]> {
  const response = await fetch(
    `${API_BASE}/store/billing/customers/search?query=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error(`Failed to search customers: ${response.statusText}`);
  }
  return response.json();
}

// Get customer history
export async function getCustomerHistory(customerId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/store/billing/customers/${customerId}/history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch customer history: ${response.statusText}`);
  }
  return response.json();
}
