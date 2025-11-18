import type { PaymentConfig } from './supabase'; // reuse existing type definitions until we refactor typings

const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const API_BASE = RAW_API_BASE.replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
}

export async function fetchAdminSettings(): Promise<Record<string, unknown>> {
  const result = await request<{ settings: Record<string, unknown> }>('/admin/settings/');
  return result.settings;
}

export async function fetchAdminSetting(key: string): Promise<unknown> {
  const result = await request<{ key: string; value: unknown }>(`/admin/settings/${encodeURIComponent(key)}`);
  return result.value;
}

export async function updateAdminSetting(key: string, value: unknown): Promise<unknown> {
  const result = await request<{ key: string; value: unknown }>(`/admin/settings/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
  return result.value;
}

export async function fetchPaymentConfigs(): Promise<PaymentConfig[]> {
  return request<PaymentConfig[]>('/admin/settings/payment-config');
}

export async function createPaymentConfig(payload: Partial<PaymentConfig> & { payment_method: string }): Promise<PaymentConfig> {
  return request<PaymentConfig>('/admin/settings/payment-config', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function togglePaymentMethod(paymentMethod: string, isEnabled: boolean): Promise<PaymentConfig> {
  return request<PaymentConfig>(`/admin/settings/payment-config/${encodeURIComponent(paymentMethod)}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ is_enabled: isEnabled }),
  });
}

export async function setPrimaryPaymentMethod(paymentMethod: string): Promise<PaymentConfig> {
  return request<PaymentConfig>(`/admin/settings/payment-config/${encodeURIComponent(paymentMethod)}/primary`, {
    method: 'POST',
  });
}

export async function updatePaymentConfig(paymentMethod: string, payload: Partial<PaymentConfig>): Promise<PaymentConfig> {
  return request<PaymentConfig>(`/admin/settings/payment-config/${encodeURIComponent(paymentMethod)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function uploadAdminImage(file: File, folder: string = 'uploads'): Promise<string> {
  // Placeholder until R2 upload endpoint exists
  const fileName = `${folder}/${Date.now()}-${file.name}`;
  return fileName;
}

// Dashboard APIs
export async function getAllOrdersForAnalytics(filters?: { year?: number; month?: number }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.year) params.set('year', String(filters.year));
  if (filters?.month) params.set('month', String(filters.month));
  const query = params.toString();
  return request<any[]>(`/admin/dashboard/analytics/orders${query ? `?${query}` : ''}`);
}

export async function getCustomers(): Promise<any[]> {
  return request<any[]>('/admin/dashboard/customers');
}

export async function getInventoryForDashboard(): Promise<any[]> {
  return request<any[]>('/admin/dashboard/inventory');
}

export async function getProductsForAdmin(): Promise<any[]> {
  return request<any[]>('/admin/dashboard/products');
}

export async function getDashboardStats(filters?: { year?: number; month?: number }): Promise<any> {
  const params = new URLSearchParams();
  if (filters?.year) params.set('year', String(filters.year));
  if (filters?.month) params.set('month', String(filters.month));
  const query = params.toString();
  return request<any>(`/admin/dashboard/stats${query ? `?${query}` : ''}`);
}

// Products APIs
export async function getCategories(): Promise<any[]> {
  return request<any[]>('/admin/categories');
}

export async function getVendorsForProducts(): Promise<any[]> {
  return request<any[]>('/admin/products/vendors');
}

export async function createProduct(product: any): Promise<any> {
  return request<any>('/admin/products/', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function updateProduct(productId: string, product: any): Promise<any> {
  return request<any>(`/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(productId: string): Promise<any> {
  return request<any>(`/admin/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}

export async function hideProduct(productId: string): Promise<any> {
  return request<any>(`/admin/products/${encodeURIComponent(productId)}/hide`, {
    method: 'POST',
  });
}

export async function restoreProduct(productId: string): Promise<any> {
  return request<any>(`/admin/products/${encodeURIComponent(productId)}/restore`, {
    method: 'POST',
  });
}

export async function canDeleteProduct(productId: string): Promise<{ can_delete: boolean }> {
  return request<{ can_delete: boolean }>(`/admin/products/${encodeURIComponent(productId)}/can-delete`);
}

export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  // Placeholder - will implement with R2
  return Promise.all(files.map(file => uploadAdminImage(file, 'products')));
}

// Orders APIs
export async function getOrdersForAdmin(filters?: {
  page?: number;
  size?: number;
  statusFilter?: string;
  vendorFilter?: string;
  paymentStatusFilter?: string;
  searchTerm?: string;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{ orders: any[]; total: number; page: number; size: number; pages: number }> {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.size) params.set('size', String(filters.size));
  if (filters?.statusFilter) params.set('statusFilter', filters.statusFilter);
  if (filters?.vendorFilter) params.set('vendorFilter', filters.vendorFilter);
  if (filters?.paymentStatusFilter) params.set('paymentStatusFilter', filters.paymentStatusFilter);
  if (filters?.searchTerm) params.set('searchTerm', filters.searchTerm);
  if (filters?.year) params.set('year', String(filters.year));
  if (filters?.month) params.set('month', String(filters.month));
  if (filters?.startDate) params.set('start_date', filters.startDate);
  if (filters?.endDate) params.set('end_date', filters.endDate);
  const query = params.toString();
  return request<{ orders: any[]; total: number; page: number; size: number; pages: number }>(`/admin/orders/${query ? `?${query}` : ''}`);
}

// Get all orders without pagination (for vendor performance, etc.)
export async function getAllOrdersForAdmin(filters?: {
  statusFilter?: string;
  vendorFilter?: string;
  paymentStatusFilter?: string;
  searchTerm?: string;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<any[]> {
  const allOrders: any[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await getOrdersForAdmin({
      ...filters,
      page,
      size: pageSize,
    });

    if (result.orders && result.orders.length > 0) {
      allOrders.push(...result.orders);
      if (result.orders.length < pageSize || page >= result.pages) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allOrders;
}

export async function getOrdersSummaryStats(filters?: {
  year?: number;
  month?: number;
  status?: string;
  vendorId?: string;
  paymentStatus?: string;
}): Promise<any> {
  const params = new URLSearchParams();
  if (filters?.year) params.set('year', String(filters.year));
  if (filters?.month) params.set('month', String(filters.month));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.vendorId) params.set('vendor_id', filters.vendorId);
  if (filters?.paymentStatus) params.set('payment_status', filters.paymentStatus);
  const query = params.toString();
  return request<any>(`/admin/orders/summary${query ? `?${query}` : ''}`);
}

export async function updateOrderStatus(orderId: string, payload: { status?: string; payment_status?: string; notes?: string }): Promise<any> {
  return request<any>(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateOrdersStatusBulk(payload: { order_ids: string[]; status?: string; payment_status?: string }): Promise<any> {
  return request<any>('/admin/orders/bulk-status', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOrderPaymentStatusById(orderId: string, paymentStatus: string): Promise<any> {
  return request<any>(`/admin/orders/${encodeURIComponent(orderId)}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify({ payment_status: paymentStatus }),
  });
}

// Customers APIs
export async function updateCustomer(customerId: string, customer: any): Promise<any> {
  return request<any>(`/admin/customers/${encodeURIComponent(customerId)}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
}

export async function deleteCustomer(customerId: string): Promise<any> {
  return request<any>(`/admin/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
  });
}

export async function getCustomerOrders(customerId: string): Promise<any[]> {
  return request<any[]>(`/admin/customers/${encodeURIComponent(customerId)}/orders`);
}

// Categories APIs
export async function createCategory(category: any): Promise<any> {
  return request<any>('/admin/categories/', {
    method: 'POST',
    body: JSON.stringify(category),
  });
}

export async function updateCategory(categoryId: string, category: any): Promise<any> {
  return request<any>(`/admin/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PUT',
    body: JSON.stringify(category),
  });
}

export async function deleteCategory(categoryId: string): Promise<any> {
  return request<any>(`/admin/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
  });
}

// Testimonials APIs
export async function getTestimonials(): Promise<any[]> {
  return request<any[]>('/admin/testimonials/');
}

export async function createTestimonial(testimonial: any): Promise<any> {
  return request<any>('/admin/testimonials/', {
    method: 'POST',
    body: JSON.stringify(testimonial),
  });
}

export async function updateTestimonial(testimonialId: string, testimonial: any): Promise<any> {
  return request<any>(`/admin/testimonials/${encodeURIComponent(testimonialId)}`, {
    method: 'PUT',
    body: JSON.stringify(testimonial),
  });
}

export async function deleteTestimonial(testimonialId: string): Promise<any> {
  return request<any>(`/admin/testimonials/${encodeURIComponent(testimonialId)}`, {
    method: 'DELETE',
  });
}

// Inventory APIs
export async function getInventory(filters?: { search?: string; status?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString();
  return request<any[]>(`/admin/inventory${query ? `?${query}` : ''}`);
}

// Offers APIs
export async function getOffers(): Promise<any[]> {
  return request<any[]>('/admin/offers/');
}

export async function getOffer(offerId: string): Promise<any> {
  return request<any>(`/admin/offers/${encodeURIComponent(offerId)}`);
}

export async function createOffer(offer: any): Promise<any> {
  return request<any>('/admin/offers/', {
    method: 'POST',
    body: JSON.stringify(offer),
  });
}

export async function updateOffer(offerId: string, offer: any): Promise<any> {
  return request<any>(`/admin/offers/${encodeURIComponent(offerId)}`, {
    method: 'PUT',
    body: JSON.stringify(offer),
  });
}

export async function deleteOffer(offerId: string): Promise<any> {
  return request<any>(`/admin/offers/${encodeURIComponent(offerId)}`, {
    method: 'DELETE',
  });
}

// Analytics/Accounts APIs
export async function getAccountsStats(): Promise<any> {
  return request<any>('/admin/analytics/accounts-stats');
}

export async function getVisits(startDate?: string, endDate?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const query = params.toString();
  return request<any[]>(`/admin/analytics/visits${query ? `?${query}` : ''}`);
}

export async function getPincodesData(pincodes: string[]): Promise<any[]> {
  const pincodesStr = pincodes.join(',');
  return request<any[]>(`/admin/analytics/pincodes?pincodes=${encodeURIComponent(pincodesStr)}`);
}

export async function updateInventoryItem(inventoryId: string, inventory: any): Promise<any> {
  return request<any>(`/admin/inventory/${encodeURIComponent(inventoryId)}`, {
    method: 'PUT',
    body: JSON.stringify(inventory),
  });
}

// Adjust product stock for a specific color
export async function adjustProductStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
  try {
    // Get current inventory item
    const inventory = await getInventory({ search: productId });
    const item = inventory.find(i => i.product_id === productId);
    
    if (!item) {
      throw new Error('Inventory item not found');
    }

    // Update the colors array
    const colors = item.colors || [];
    const colorIndex = colors.findIndex((c: any) => c.color === colorName);
    
    if (colorIndex >= 0) {
      colors[colorIndex].stock = newStock;
    } else {
      colors.push({ color: colorName, stock: newStock });
    }

    // Update inventory item
    await updateInventoryItem(item.id, {
      ...item,
      colors: colors,
      current_stock: colors.reduce((sum: number, c: any) => sum + (c.stock || 0), 0),
    });

    return true;
  } catch (error) {
    console.error('Error adjusting product stock:', error);
    return false;
  }
}

// Vendors APIs
export async function getVendors(filters?: { search?: string; is_active?: boolean }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
  const query = params.toString();
  return request<any[]>(`/admin/vendors/${query ? `?${query}` : ''}`);
}

export async function getVendorByCode(vendorCode: string): Promise<any> {
  return request<any>(`/admin/vendors/by-code/${encodeURIComponent(vendorCode)}`);
}

export async function createVendor(vendor: any): Promise<any> {
  return request<any>('/admin/vendors/', {
    method: 'POST',
    body: JSON.stringify(vendor),
  });
}

export async function updateVendor(vendorId: string, vendor: any): Promise<any> {
  return request<any>(`/admin/vendors/${encodeURIComponent(vendorId)}`, {
    method: 'PUT',
    body: JSON.stringify(vendor),
  });
}

export async function deleteVendor(vendorId: string): Promise<any> {
  return request<any>(`/admin/vendors/${encodeURIComponent(vendorId)}`, {
    method: 'DELETE',
  });
}

// Deliveries APIs
export async function getDeliveries(filters?: { status?: string; search?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const query = params.toString();
  return request<any[]>(`/admin/deliveries/${query ? `?${query}` : ''}`);
}

export async function createDelivery(delivery: any): Promise<any> {
  return request<any>('/admin/deliveries/', {
    method: 'POST',
    body: JSON.stringify(delivery),
  });
}

export async function updateDelivery(deliveryId: string, delivery: any): Promise<any> {
  return request<any>(`/admin/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: 'PUT',
    body: JSON.stringify(delivery),
  });
}

// Delivery Areas APIs
export async function getDeliveryAreas(filters?: { pincode?: string; city?: string; state?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.pincode) params.set('pincode', filters.pincode);
  if (filters?.city) params.set('city', filters.city);
  if (filters?.state) params.set('state', filters.state);
  const query = params.toString();
  return request<any[]>(`/admin/delivery-areas/${query ? `?${query}` : ''}`);
}

export async function createDeliveryArea(area: any): Promise<any> {
  return request<any>('/admin/delivery-areas/', {
    method: 'POST',
    body: JSON.stringify(area),
  });
}

export async function updateDeliveryArea(pincode: string, area: any): Promise<any> {
  return request<any>(`/admin/delivery-areas/${encodeURIComponent(pincode)}`, {
    method: 'PUT',
    body: JSON.stringify(area),
  });
}

// Store Sales APIs
export async function getStoreSalesAnalytics(filters?: {
  year?: number;
  month?: number;
  start_date?: string;
  end_date?: string;
}): Promise<any> {
  const params = new URLSearchParams();
  if (filters?.year) params.set('year', String(filters.year));
  if (filters?.month) params.set('month', String(filters.month));
  if (filters?.start_date) params.set('start_date', filters.start_date);
  if (filters?.end_date) params.set('end_date', filters.end_date);
  const query = params.toString();
  return request<any>(`/admin/store-sales/analytics${query ? `?${query}` : ''}`);
}

export async function getStoreSalesReport(filters?: {
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
}): Promise<any> {
  const params = new URLSearchParams();
  if (filters?.start_date) params.set('start_date', filters.start_date);
  if (filters?.end_date) params.set('end_date', filters.end_date);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.size) params.set('size', String(filters.size));
  const query = params.toString();
  return request<any>(`/admin/store-sales/reports${query ? `?${query}` : ''}`);
}

export async function getTopStoreProducts(filters?: {
  limit?: number;
  start_date?: string;
  end_date?: string;
}): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.start_date) params.set('start_date', filters.start_date);
  if (filters?.end_date) params.set('end_date', filters.end_date);
  const query = params.toString();
  return request<any[]>(`/admin/store-sales/top-products${query ? `?${query}` : ''}`);
}

export async function deleteDeliveryArea(pincode: string): Promise<any> {
  return request<any>(`/admin/delivery-areas/${encodeURIComponent(pincode)}`, {
    method: 'DELETE',
  });
}

// Contact Submissions APIs
export async function getContactSubmissions(filters?: { status?: string; search?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const query = params.toString();
  return request<any[]>(`/admin/contact-submissions/${query ? `?${query}` : ''}`);
}

export async function updateContactSubmission(submissionId: string, submission: any): Promise<any> {
  return request<any>(`/admin/contact-submissions/${encodeURIComponent(submissionId)}`, {
    method: 'PUT',
    body: JSON.stringify(submission),
  });
}

