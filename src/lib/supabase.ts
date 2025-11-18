// @ts-nocheck
import { generateOrderId } from '@/lib/orderIdGenerator';
import { supabase } from '@/integrations/supabase/client';

// Retry utility for handling connection issues
export const retryOperation = async function(
  operation: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication errors
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as any).code;
        if (code === 'PGRST301' || code === 'PGRST116' || code === '401') {
          throw error;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};


export { supabase };

// Database connection test
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (error) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Decrement inventory helper when an order is confirmed/paid
const decrementInventoryForOrderId = async (id: string): Promise<void> => {
  // Fetch order with product info
  const { data: rows, error } = await supabase
    .from('orders')
    .select('id, order_id, product_id, quantity, product_colors, products:product_id(id, total_stock, color_stock)')
    .eq('id', id)
    .limit(1);
  if (error || !rows || rows.length === 0) return;
  const order: any = rows[0];

  const product = order?.products;
  if (!product) return;
  const qty = Math.max(1, Number(order?.quantity || 1));
  let colorStock: Array<{ color: string; stock: number }>; 
  try { colorStock = Array.isArray(product?.color_stock) ? product.color_stock : JSON.parse(product?.color_stock || '[]'); } catch { colorStock = []; }

  // Decrement by colors if provided, otherwise decrement total
  const selectedColors: string[] = Array.isArray(order?.product_colors) ? order.product_colors : [];
  const decrementOne = (color?: string) => {
    if (!colorStock || colorStock.length === 0) return false;
    if (color) {
      const entry = colorStock.find((c) => (c?.color || '').toLowerCase() === String(color).toLowerCase());
      if (entry) { entry.stock = Math.max(0, Number(entry.stock || 0) - 1); return true; }
    }
    const anyWithStock = colorStock.find((c) => Number(c?.stock || 0) > 0);
    if (anyWithStock) { anyWithStock.stock = Math.max(0, Number(anyWithStock.stock || 0) - 1); return true; }
    return false;
  };

  let remaining = qty;
  for (const col of selectedColors) {
    if (remaining <= 0) break;
    if (decrementOne(col)) remaining -= 1;
  }
  while (remaining > 0 && decrementOne()) remaining -= 1;

  // Calculate new total stock based on product type
  let newTotal = 0;
  if ((product as any)?.color_size_stock && (product as any).color_size_stock.length > 0) {
    // For dress products, calculate from color_size_stock
    (product as any).color_size_stock.forEach((variant: any) => {
      if (variant.sizes && variant.sizes.length > 0) {
        variant.sizes.forEach((sizeVariant: any) => {
          newTotal += sizeVariant.stock || 0;
        });
      }
    });
  } else if (colorStock.length > 0) {
    // For regular products, use color_stock
    newTotal = colorStock.reduce((sum, c) => sum + Math.max(0, Number(c?.stock || 0)), 0);
  } else {
    // Fallback to total_stock
    newTotal = Math.max(0, Number(product?.total_stock || 0) - qty);
  }
  const newStatus = newTotal <= 0 ? 'out_of_stock' : (newTotal <= 5 ? 'low_stock' : 'in_stock');

  const patchBody: any = { total_stock: newTotal, stock_status: newStatus };
  if (colorStock.length > 0) patchBody.color_stock = colorStock;

  await supabase
    .from('products')
    .update(patchBody, { returning: 'minimal' })
    .eq('id', order.product_id);
};

// Increment inventory helper when an order is cancelled/failed (reverse of decrement)
const incrementInventoryForOrderId = async (id: string): Promise<void> => {
  // Fetch order with product info
  const { data: rows, error } = await supabase
    .from('orders')
    .select('id, order_id, product_id, quantity, product_colors, products:product_id(id, total_stock, color_stock)')
    .eq('id', id)
    .limit(1);
  if (error || !rows || rows.length === 0) return;
  const order: any = rows[0];

  const product = order?.products;
  if (!product) return;
  const qty = Math.max(1, Number(order?.quantity || 1));
  let colorStock: Array<{ color: string; stock: number }>; 
  try { colorStock = Array.isArray(product?.color_stock) ? product.color_stock : JSON.parse(product?.color_stock || '[]'); } catch { colorStock = []; }

  // Increment by colors if provided, otherwise increment total
  const selectedColors: string[] = Array.isArray(order?.product_colors) ? order.product_colors : [];
  const incrementOne = (color?: string) => {
    if (!colorStock || colorStock.length === 0) return false;
    if (color) {
      const entry = colorStock.find((c) => (c?.color || '').toLowerCase() === String(color).toLowerCase());
      if (entry) { entry.stock = Number(entry.stock || 0) + 1; return true; }
    }
    // If no specific color, increment the first available color or add to total
    const anyEntry = colorStock.find((c) => c?.color);
    if (anyEntry) { anyEntry.stock = Number(anyEntry.stock || 0) + 1; return true; }
    return false;
  };

  let remaining = qty;
  for (const col of selectedColors) {
    if (remaining <= 0) break;
    if (incrementOne(col)) remaining -= 1;
  }
  while (remaining > 0 && incrementOne()) remaining -= 1;

  // Calculate new total stock based on product type
  let newTotal = 0;
  if ((product as any)?.color_size_stock) {
    // For dress products, calculate from color_size_stock
    (product as any).color_size_stock.forEach((variant: any) => {
      if (variant.sizes && variant.sizes.length > 0) {
        variant.sizes.forEach((sizeVariant: any) => {
          newTotal += sizeVariant.stock || 0;
        });
      }
    });
  } else if (colorStock.length > 0) {
    // For regular products, use color_stock
    newTotal = colorStock.reduce((sum, c) => sum + Math.max(0, Number(c?.stock || 0)), 0);
  } else {
    // Fallback to total_stock
    newTotal = Number(product?.total_stock || 0) + qty;
  }
  const newStatus = newTotal <= 0 ? 'out_of_stock' : (newTotal <= 5 ? 'low_stock' : 'in_stock');

  const patchBody: any = { total_stock: newTotal, stock_status: newStatus };
  if (colorStock.length > 0) patchBody.color_stock = colorStock;

  await supabase
    .from('products')
    .update(patchBody, { returning: 'minimal' })
    .eq('id', order.product_id);
};

// Types
export interface Product {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  sku: string;
  price: number;
  original_price?: number;
  images: string[];
  colors: string[];
  color_images?: string[][]; // 2D array: each sub-array contains images for a color
  color_stock?: Array<{ color: string; stock: number }>;
  color_size_stock?: Array<{ color: string; sizes: Array<{ size: string; stock: number }> }>;
  total_stock?: number;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  stretch_variants?: Array<{ type: string; price: number }>;
  sizes: string[];
  fabric?: string;
  care_instructions?: string;
  is_active: boolean;
  featured: boolean;
  best_seller?: boolean;
  new_collection?: boolean;
  new_collection_start_date?: string;
  new_collection_end_date?: string;
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  cover_image_index?: number;
  vendor_id?: string;
  saree_id?: string;
  vendor_code?: string;
  vendor?: Vendor;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[];
  cover_image_index?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
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
  transaction_id?: string;
  payment_gateway_response?: string;
  shipping_address?: string;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  product_colors?: string[];
  product_sizes?: string[];
  vendor_id?: string;
  vendor_code?: string;
  saree_id?: string;
  applied_offer?: string;
  product?: {
    id: string;
    name: string;
    saree_id?: string;
    vendor_code?: string;
    fabric?: string;
    images?: string[];
    cover_image_index?: number;
    colors?: string[];
    color_images?: any[];
    vendor_id?: string;
    vendors?: Vendor;
  };
  vendors?: Vendor;
}

export interface Customer {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  city?: string;
  state?: string;
  total_orders: number;
  total_spent: number;
  tier: string;
  status: string;
  last_order_date?: string;
  joined_date: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id?: string;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  cost_price: number;
  selling_price: number;
  supplier?: string;
  status: string;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
  images?: string[];
  colors?: Array<{ color: string; price: number }>;
}

export interface Delivery {
  id: string;
  delivery_id: string;
  order_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  product_name: string;
  status: string;
  courier?: string;
  courier_phone?: string;
  tracking_id?: string;
  estimated_delivery?: string;
  pickup_date?: string;
  delivered_date?: string;
  created_at: string;
  updated_at: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  courier_service?: string;
  tracking_number?: string;
  pickup_timestamp?: string;
  delivery_timestamp?: string;
  delivery_notes?: string;
}

export interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  specialization?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email: string;
  customer_address?: string;
  product_name: string;
  product_colors?: string[];
  quantity: number;
  saree_id?: string;
  vendor_code?: string;
  order_status: string;
  order_date: string;
  vendor_id: string;
  vendor_ref: string;
  vendor_name: string;
  contact_person?: string;
  vendor_phone?: string;
  vendor_email?: string;
  vendor_address?: string;
  vendor_city?: string;
  vendor_state?: string;
  product_images?: string[];
  cover_image_index?: number;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  customer_location?: string;
  content: string;
  rating?: number;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryArea {
  id: number;
  pincode: number;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface Pincode {
  pincode: string;
  office_name: string;
  office_type?: string;
  delivery: string;
  division_name?: string;
  region_name?: string;
  circle_name?: string;
  district?: string;
  state: string;
  created_at?: string;
  updated_at?: string;
}

export interface PincodeSearchResult {
  pincode: string;
  office_name: string;
  district?: string;
  state: string;
  delivery: string;
}

export interface DeliveryPincodeDetails {
  pincode: string;
  area: string;
  city: string;
  state: string;
  country: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryPincode {
  pincode: string;
  area: string;
  city: string;
  state: string;
  country: string;
}

// Delivery area functions
export const getDeliveryAreaByPincode = async (pincode: string): Promise<DeliveryArea | null> => {
  try {
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('*')
      .eq('pincode', parseInt(pincode))
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

export const getDeliveryPincodeDetails = async (pincode: string): Promise<DeliveryPincodeDetails | null> => {
  try {
    // Try delivery_areas table first
    const deliveryArea = await getDeliveryAreaByPincode(pincode);
    
    if (deliveryArea) {
      return {
        pincode: pincode,
        area: deliveryArea.area || '',
        city: deliveryArea.city || '',
        state: deliveryArea.state || '',
        country: deliveryArea.country || 'India'
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Email service functions using Supabase Edge Functions

// Product functions
export const getProducts = async (limit?: number, featuredOnly?: boolean): Promise<Product[]> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (featuredOnly) {
      query = query.eq('featured', true);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const getProductsForAdmin = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

export const getProductByName = async (name: string): Promise<Product | null> => {
  try {
    const decodedName = decodeURIComponent(name);
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('name', decodedName)
      .eq('is_active', true)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

export const getSimilarProducts = async (categoryId: string, currentProductId: string, limit: number = 8): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .neq('id', currentProductId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
};

export const getProductBySareeId = async (sareeId: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`*, vendor:vendors(*)`)
      .eq('saree_id', sareeId)
      .single();

    if (error) {
      return null;
    }

    return data as unknown as Product;
  } catch (error) {
    return null;
  }
};

export const getVendorByCode = async (vendorCode: string): Promise<Vendor | null> => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('vendor_code', vendorCode)
      .single();

    if (error) {
      return null;
    }

    return data as unknown as Vendor;
  } catch (error) {
    return null;
  }
};

export const createProduct = async (productData: Partial<Product>): Promise<Product> => {
  try {

    // Sanitize data to remove fields that are not actual columns in the 'products' table
    const sanitizedData: any = { ...productData };
    [
      'vendor',
      'vendors',
      'products',
      'deliveries',
      'created_at',
      'updated_at',
      'id' // id is generated by the database
    ].forEach((k) => delete sanitizedData[k]);

    // Ensure required fields have proper values
    if (!sanitizedData.name || sanitizedData.name.trim() === '') {
      throw new Error('Product name is required');
    }

    if (!sanitizedData.price || sanitizedData.price <= 0) {
      throw new Error('Valid product price is required');
    }

    if (!sanitizedData.sku || sanitizedData.sku.trim() === '') {
      throw new Error('Product SKU is required');
    }

    // Ensure arrays are properly formatted
    sanitizedData.images = sanitizedData.images || [];
    sanitizedData.colors = sanitizedData.colors || [];
    sanitizedData.sizes = sanitizedData.sizes || ['Free Size'];
    sanitizedData.color_stock = sanitizedData.color_stock || [];
    sanitizedData.color_images = sanitizedData.color_images || [];

    // Filter out null/empty date fields to prevent timestamp parsing errors
    if (!sanitizedData.new_collection_start_date || sanitizedData.new_collection_start_date === '') {
      delete sanitizedData.new_collection_start_date;
    }
    if (!sanitizedData.new_collection_end_date || sanitizedData.new_collection_end_date === '') {
      delete sanitizedData.new_collection_end_date;
    }

    // Ensure all fields have proper data types
    sanitizedData.price = Number(sanitizedData.price);
    if (sanitizedData.original_price) {
      sanitizedData.original_price = Number(sanitizedData.original_price);
    }
    sanitizedData.sort_order = Number(sanitizedData.sort_order) || 0;
    sanitizedData.cover_image_index = Number(sanitizedData.cover_image_index) || 0;


    const { data, error } = await supabase
      .from('products')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateProduct = async (id: string, productData: Partial<Product>): Promise<Product> => {
  try {
    // Remove nested relational or readonly fields that don't exist as columns
    // in the products table (for example: vendor object from a join).
    const sanitizedData: any = { ...productData };
    [
      'vendor',
      'vendors',
      'products',
      'deliveries',
      'created_at',
      'updated_at',
      'id'
    ].forEach((k) => delete sanitizedData[k]);

    // Filter out null/empty date fields to prevent timestamp parsing errors
    if (!sanitizedData.new_collection_start_date || sanitizedData.new_collection_start_date === '') {
      delete sanitizedData.new_collection_start_date;
    }
    if (!sanitizedData.new_collection_end_date || sanitizedData.new_collection_end_date === '') {
      delete sanitizedData.new_collection_end_date;
    }

    const { data, error } = await supabase
      .from('products')
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const canDeleteProduct = async (id: string): Promise<{ canDelete: boolean; reason?: string; orderCount?: number }> => {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_id, status')
      .eq('product_id', id);

    if (ordersError) {
      return { canDelete: false, reason: 'Error checking orders' };
    }

    if (!orders || orders.length === 0) {
      return { canDelete: true };
    }

    const activeOrders = orders.filter(order => 
      order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped'
    );
    
    if (activeOrders.length > 0) {
      return { 
        canDelete: false, 
        reason: `Cannot delete. ${activeOrders.length} active orders exist.`,
        orderCount: activeOrders.length
      };
    }
    
    return { 
      canDelete: true, 
      reason: `Warning: ${orders.length} historical orders exist.`,
      orderCount: orders.length
    };
  } catch (error) {
    return { canDelete: false, reason: 'Error checking deletion eligibility' };
  }
};

export const hideProduct = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const restoreProduct = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: true })
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    // Check if there are any active orders referencing this product
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_id, status')
      .eq('product_id', id);

    if (ordersError) {
      throw ordersError;
    }

    // If there are active orders, use soft delete (hide) instead of hard delete
    if (orders && orders.length > 0) {
      const activeOrders = orders.filter(order => 
        order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped'
      );
      
      if (activeOrders.length > 0) {
        // Soft delete: set is_active to false to hide from public view
        const { error } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', id);

        if (error) {
          throw error;
        }

        return;
      }
    }

    // If no active orders, proceed with hard delete
    // Fetch product to collect image paths before delete
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('images, color_images')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
    }

    // Delete row
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Best-effort storage cleanup for hard deleted products
    try {
      const urls: string[] = [];
      if (product?.images && Array.isArray(product.images)) urls.push(...product.images);
      if (product?.color_images && Array.isArray(product.color_images)) {
        for (const arr of product.color_images as any[]) {
          if (Array.isArray(arr)) urls.push(...arr);
        }
      }
      // Convert public URLs to storage keys under product-images bucket
      const keys: string[] = urls
        .map((u) => {
          try {
            // Public URL format: https://<ref>.supabase.co/storage/v1/object/public/product-images/<key>
            const marker = '/storage/v1/object/public/product-images/';
            const idx = u.indexOf(marker);
            if (idx > -1) return u.slice(idx + marker.length);
            // If someone stored a raw key already
            return u;
          } catch { return u; }
        })
        .filter(Boolean);

      if (keys.length > 0) {
        const { error: removeErr } = await supabase.storage.from('product-images').remove(keys);
      }
    } catch (cleanupErr) {
    }
  } catch (error) {
    throw error;
  }
};

// Category functions - Now using Python API
export const getCategories = async (): Promise<Category[]> => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const response = await fetch(`${apiUrl}/store/categories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    const data = await response.json();
    // Filter active categories and sort
    const activeCategories = (data || []).filter((cat: Category) => cat.is_active !== false);
    activeCategories.sort((a: Category, b: Category) => {
      const sortA = a.sort_order || 0;
      const sortB = b.sort_order || 0;
      if (sortA !== sortB) return sortA - sortB;
      return (a.name || '').localeCompare(b.name || '');
    });
    return activeCategories;
  } catch (error) {
    console.error('Error fetching categories from Python API:', error);
    throw error;
  }
};

export const createCategory = async (categoryData: Partial<Category>): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateCategory = async (id: string, categoryData: Partial<Category>): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if category has products
    const { data: products, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (checkError) {
      return { success: false, error: 'Failed to check category usage' };
    }

    if (products && products.length > 0) {
      return { success: false, error: 'Cannot delete category with existing products' };
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete category' };
  }
};

// Order functions
export const getOrders = async (limit?: number): Promise<Order[]> => {
  try {
    if (limit && limit <= 1000) {
      // Fast single query for limited results
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products:product_id(
            id,
            name,
            saree_id,
            vendors:vendor_id(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    }

    // Use proper batching with Supabase's actual 1000-record limit
    const allOrders: Order[] = [];
    let from = 0;
    const batchSize = 1000; // Supabase's actual maximum per query
    
    while (true) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          vendors:vendor_id(
            id,
            name,
            vendor_code,
            contact_person,
            phone,
            email,
            address,
            city,
            state
          ),
          products:product_id(
            id,
            name,
            saree_id,
            vendor_code,
            vendor_id,
            vendors:vendor_id(
              id,
              name,
              vendor_code,
              contact_person,
              phone,
              email,
              address,
              city,
              state
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        break;
      }
      
      allOrders.push(...data);
      
      // Continue if we got a full batch, stop if we got less
      if (data.length < batchSize) {
        break;
      }
      
      from += batchSize;
    }
    
    return allOrders;
  } catch (error) {
    throw error;
  }
};

// Fetch a single order by its public order_id
export const getOrderByOrderId = async (orderId: string): Promise<Order | null> => {
  try {
    if (!orderId) return null;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        products:product_id(
          id,
          name,
          saree_id,
          images,
          cover_image_index,
          colors,
          color_images,
          vendors:vendor_id(*)
        ),
        vendors:vendor_id(*)
      `)
      .eq('order_id', orderId)
      .single();

    if (error) {
      // If no row found, return null silently
      if ((error as any).code === 'PGRST116') return null;
      return null;
    }

    return data as unknown as Order;
  } catch (error) {
    return null;
  }
};

// Helper function to get vendor information by product name
export const getVendorByProductName = async (productName: string): Promise<Vendor | null> => {
  try {
    // First try exact match
    let { data: productData } = await supabase
      .from('products')
      .select(`
        id,
        name,
        vendor_id,
        vendors:vendor_id(
          id,
          name,
          vendor_code,
          contact_person,
          phone,
          email,
          address,
          city,
          state
        )
      `)
      .eq('name', productName)
      .limit(1)
      .single();
    
    // If no exact match, try partial match
    if (!productData) {
      const { data: partialMatch } = await supabase
        .from('products')
        .select(`
          id,
          name,
          vendor_id,
          vendors:vendor_id(
            id,
            name,
            vendor_code,
            contact_person,
            phone,
            email,
            address,
            city,
            state
          )
        `)
        .ilike('name', `%${productName}%`)
        .limit(1)
        .single();
      
      productData = partialMatch;
    }
    
    return productData?.vendors || null;
  } catch (error) {
    return null;
  }
};

// Optimized function for admin orders page with pagination and filtering
export const getOrdersForAdmin = async (
  limit: number = 50, 
  offset: number = 0, 
  filters?: {
    year?: number;
    month?: number;
    status?: string;
    vendorId?: string;
    paymentStatus?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<{ orders: Order[], totalCount: number }> => {
  try {
    // Build the base query
    let query = supabase
        .from('orders')
        .select(`
          id,
          order_id,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          status,
          payment_status,
          amount,
          created_at,
          updated_at,
          applied_offer,
          vendor_id,
          vendor_code,
          transaction_id,
          product_id,
          quantity,
          product_colors,
          vendors:vendor_id(
            id,
            name,
            vendor_code,
            contact_person
          ),
          product:product_id(
            id,
            name,
            vendor_id,
            vendors:vendor_id(
              id,
              name,
              vendor_code,
              contact_person
            )
          )
      `, { count: 'exact' });

    // Apply date filters - prioritize specific date ranges over year/month filters
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        query = query.gte('created_at', startDate.toISOString());
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        query = query.lte('created_at', endDate.toISOString());
      }
    } else {
      // Apply year/month filters only if no specific date range
      if (filters?.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year + 1, 0, 1);
        query = query.gte('created_at', startDate.toISOString())
                     .lt('created_at', endDate.toISOString());
      }

      if (filters?.month && filters?.year) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 1);
        query = query.gte('created_at', startDate.toISOString())
                     .lt('created_at', endDate.toISOString());
      }
    }

    // Apply other server-side filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.vendorId && filters.vendorId !== 'all') {
      // Use simple vendor_id filtering - complex filtering will be handled client-side
      query = query.eq('vendor_id', filters.vendorId);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      query = query.eq('payment_status', filters.paymentStatus);
    }

    if (filters?.searchTerm) {
      query = query.or(`order_id.ilike.%${filters.searchTerm}%,customer_name.ilike.%${filters.searchTerm}%,customer_email.ilike.%${filters.searchTerm}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      orders: data || [],
      totalCount: count || 0
    };
  } catch (error) {
    throw error;
  }
};

export const getOrdersWithVendorInfo = async (): Promise<Order[]> => {
  try {
    // Use proper batching with Supabase's actual 1000-record limit
    const allOrders: Order[] = [];
    let from = 0;
    const batchSize = 1000; // Supabase's actual maximum per query
    
    while (true) {
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          vendors:vendor_id(
            id,
            name,
            vendor_code,
            contact_person,
            phone,
            email,
            address,
            city,
            state
          ),
          product:product_id(
            id,
            name,
            saree_id,
            vendor_code,
            fabric,
            images,
            cover_image_index,
            colors,
            color_images,
            vendor_id,
            vendors:vendor_id(
              id,
              name,
              vendor_code,
              contact_person,
              phone,
              email,
              address,
              city,
              state
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      allOrders.push(...data);
      // Continue if we got a full batch, stop if we got less
      if (data.length < batchSize) {
        break;
      }
      
      from += batchSize;
    }

    // Enrich orders with vendor information from applied_offer
    const enrichedOrders = await Promise.all(allOrders.map(async (order) => {
      try {
        const raw = order.applied_offer;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        if (parsed && Array.isArray(parsed.items)) {
          // Fetch vendor information for each product in applied_offer
          const enrichedItems = await Promise.all(parsed.items.map(async (item: any) => {
            let vendorData = null;
            
            // First try to get vendor by product_id if available
            if (item.product_id) {
              const { data: productData } = await supabase
                .from('products')
                .select(`
                  id,
                  name,
                  vendor_id,
                  vendors:vendor_id(
                    id,
                    name,
                    vendor_code,
                    contact_person,
                    phone,
                    email,
                    address,
                    city,
                    state
                  )
                `)
                .eq('id', item.product_id)
                .single();
              
              if (productData && productData.vendors) {
                vendorData = productData.vendors;
              }
            }
            
            // If no vendor found by product_id, try to find by product name
            if (!vendorData && item.name) {
              const { data: productData } = await supabase
                .from('products')
                .select(`
                  id,
                  name,
                  vendor_id,
                  vendors:vendor_id(
                    id,
                    name,
                    vendor_code,
                    contact_person,
                    phone,
                    email,
                    address,
                    city,
                    state
                  )
                `)
                .ilike('name', `%${item.name}%`)
                .limit(1)
                .single();
              
              if (productData && productData.vendors) {
                vendorData = productData.vendors;
              }
            }
            
            // If still no vendor found, try exact name match
            if (!vendorData && item.name) {
              const { data: productData } = await supabase
                .from('products')
                .select(`
                  id,
                  name,
                  vendor_id,
                  vendors:vendor_id(
                    id,
                    name,
                    vendor_code,
                    contact_person,
                    phone,
                    email,
                    address,
                    city,
                    state
                  )
                `)
                .eq('name', item.name)
                .limit(1)
                .single();
              
              if (productData && productData.vendors) {
                vendorData = productData.vendors;
              }
            }
            
            if (vendorData) {
              const enrichedItem = {
                ...item,
                vendor_id: vendorData.id,
                vendor_name: vendorData.name || vendorData.contact_person,
                vendor_code: vendorData.vendor_code,
                vendor: vendorData
              };
              
              return enrichedItem;
            }
            
            // If no vendor found, return original item
            return item;
          }));
          
          return {
            ...order,
            applied_offer: {
              ...parsed,
              items: enrichedItems
            }
          };
        }
        
        return order;
      } catch (error) {
        return order;
      }
    }));

    return enrichedOrders;
  } catch (error) {
    throw error;
  }
};

export const getOrdersByCustomerDetails = async (email: string, phone: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        deliveries:deliveries(*)
      `)
      .eq('customer_email', email)
      .eq('customer_phone', phone)
      .in('status', ['pending','confirmed','processing','ready_to_ship','shipped','delivered'])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const getOrdersByEmail = async (email: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        deliveries:deliveries(*),
        product:product_id(
          id,
          name,
          images,
          cover_image_index,
          colors,
          color_images,
          saree_id
        )
      `)
      .eq('customer_email', email)
      .in('status', ['pending','confirmed','processing','ready_to_ship','shipped','delivered'])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
  try {
    // Get product information to populate vendor details if product_id is provided
    if (orderData.product_id) {
      const { data: productData } = await supabase
        .from('products')
        .select(`
          *,
          vendors (
            id,
            name,
            vendor_code,
            contact_person,
            phone,
            email,
            address,
            city,
            state
          )
        `)
        .eq('id', orderData.product_id)
        .single();

      // Add vendor information to order data if product has vendor
      if (productData?.vendors) {
        orderData.vendor_id = productData.vendors.id;
        orderData.vendor_code = productData.vendors.vendor_code;
        orderData.saree_id = productData.saree_id;
      }
    } else {
      // Fallback: Get product information by name (for backward compatibility)
      const productName = orderData.product_name?.split(' (')[0] || orderData.product_name;

      const { data: productData } = await supabase
        .from('products')
        .select(`
          *,
          vendors (
            id,
            name,
            vendor_code,
            contact_person,
            phone,
            email,
            address,
            city,
            state
          )
        `)
        .eq('name', productName)
        .single();

      // Add vendor information to order data if product has vendor
      if (productData?.vendors) {
        orderData.vendor_id = productData.vendors.id;
        orderData.vendor_code = productData.vendors.vendor_code;
        orderData.saree_id = productData.saree_id;
      }
      // Also set product_id if found by name so future workflows can resolve images
      if (productData?.id) {
        orderData.product_id = productData.id;
      }
    }

    // Use a transaction-like approach with retry logic for high concurrency
    let retryCount = 0;
    const maxRetries = 4;

    while (retryCount < maxRetries) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (error) {
          // Check if it's a unique constraint violation (duplicate order_id)
          if (error.code === '23505' && retryCount < maxRetries - 1) {
            // Regenerate a fresh order_id using product context, or fallback to guest
            try {
              const identifier = (orderData.product_id as string) || (orderData.product_name as string) || 'guest';
              const freshId = await generateOrderId(identifier);
              orderData.order_id = freshId as any;
            } catch (_) {
              // Fallback to timestamp-based id if generator fails
              orderData.order_id = `G${Date.now()}` as any;
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 120 * (retryCount + 1)));
            continue;
          }
          throw error;
        }

        return data;
      } catch (insertError) {
        if (retryCount >= maxRetries - 1) {
          throw insertError;
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 120 * (retryCount + 1)));
      }
    }

    throw new Error('Failed to create order after retries');
  } catch (error) {
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
  try {
    // Get current order to check previous status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, order_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching order for status update:', fetchError);
      throw fetchError;
    }

    const previousStatus = currentOrder?.status;
    const orderId = currentOrder?.order_id;


    // Update the order status with explicit return to verify the update
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, status, order_id, updated_at')
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }

    if (!updatedOrder) {
      throw new Error('Failed to update order status - no data returned');
    }

    if (updatedOrder.status !== status) {
      console.error(`Status update failed! Expected: ${status}, Got: ${updatedOrder.status}`);
      throw new Error(`Status update failed! Expected: ${status}, Got: ${updatedOrder.status}`);
    }


    // Handle inventory based on status transitions
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      // Decrement inventory when moving TO confirmed
      await decrementInventoryForOrderId(id);
    } else if ((status === 'cancelled' || status === 'failed') && previousStatus === 'confirmed') {
      // Increment inventory when moving FROM confirmed TO cancelled/failed
      await incrementInventoryForOrderId(id);
    }
    // For other status changes (confirmed -> processing, shipped, etc.), do nothing with inventory

    // Final verification with multiple attempts to ensure status change persisted
    let verifyAttempts = 0;
    const maxVerifyAttempts = 3;
    let finalStatus = null;

    while (verifyAttempts < maxVerifyAttempts) {
      await new Promise(resolve => setTimeout(resolve, 300)); // Increased delay

      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, status, order_id, updated_at')
        .eq('id', id)
        .single();

      if (verifyError) {
        console.error(`Error verifying order status (attempt ${verifyAttempts + 1}):`, verifyError);
        verifyAttempts++;
        continue;
      }

      finalStatus = verifyOrder?.status;

      if (finalStatus === status) {
        break;
      } else {
        console.error(`CRITICAL: Order ${orderId} status reverted! Expected: ${status}, Got: ${finalStatus} (attempt ${verifyAttempts + 1})`);

        // If status was reverted, try to update it again with more force
        if (verifyAttempts < maxVerifyAttempts - 1) {

          const { error: restoreError } = await supabase
            .from('orders')
            .update({
              status,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (restoreError) {
            console.error(`Failed to restore order ${orderId} status (attempt ${verifyAttempts + 2}):`, restoreError);
          }
        }

        verifyAttempts++;
      }
    }

    if (finalStatus !== status) {
      console.error(`❌ FINAL FAILURE: Order ${orderId} status could not be maintained as "${status}" after ${maxVerifyAttempts} attempts. Final status: ${finalStatus}`);
      throw new Error(`Order status was reverted and could not be restored! Expected: ${status}, Final: ${finalStatus}`);
    }

  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    throw error;
  }
};

export const updateOrdersStatusBulk = async (ids: string[], status: string): Promise<void> => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return;


    // Get current orders to check previous statuses
    const { data: currentOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, order_id')
      .in('id', ids);

    if (fetchError) {
      console.error('Error fetching orders for bulk status update:', fetchError);
      throw fetchError;
    }

    // Update all orders with explicit return and timestamp
    const { data: updatedOrders, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select('id, status, order_id, updated_at');

    if (error) {
      console.error('Error in bulk status update:', error);
      throw error;
    }

    if (!updatedOrders || updatedOrders.length !== ids.length) {
      throw new Error(`Bulk update failed! Expected ${ids.length} updates, got ${updatedOrders?.length || 0}`);
    }

    // Verify all orders have the correct status
    for (const order of updatedOrders) {
      if (order.status !== status) {
        console.error(`Bulk update failed for order ${order.order_id}! Expected: ${status}, Got: ${order.status}`);
        throw new Error(`Bulk update failed for order ${order.order_id}! Expected: ${status}, Got: ${order.status}`);
      }
    }


    // Handle inventory for each order based on status transitions
    for (const order of currentOrders || []) {
      const previousStatus = order?.status;

      if (status === 'confirmed' && previousStatus !== 'confirmed') {
        // Decrement inventory when moving TO confirmed
        await decrementInventoryForOrderId(order.id);
      } else if ((status === 'cancelled' || status === 'failed') && previousStatus === 'confirmed') {
        // Increment inventory when moving FROM confirmed TO cancelled/failed
        await incrementInventoryForOrderId(order.id);
      }
      // For other status changes (confirmed -> processing, shipped, etc.), do nothing with inventory
    }

    // Final verification after inventory operations with retry logic
    let verifyAttempts = 0;
    const maxVerifyAttempts = 3;

    while (verifyAttempts < maxVerifyAttempts) {
      await new Promise(resolve => setTimeout(resolve, 200));

      const { data: verifyOrders, error: verifyError } = await supabase
        .from('orders')
        .select('id, status, order_id')
        .in('id', ids);

      if (verifyError) {
        console.error(`Error verifying bulk order status (attempt ${verifyAttempts + 1}):`, verifyError);
        verifyAttempts++;
        continue;
      }

      const revertedOrders = verifyOrders?.filter(order => order.status !== status) || [];

      if (revertedOrders.length === 0) {
        break;
      } else {
        console.error(`CRITICAL: ${revertedOrders.length} orders reverted after bulk update (attempt ${verifyAttempts + 1})!`);

        // Try to restore reverted orders
        if (verifyAttempts < maxVerifyAttempts - 1) {

          const { error: restoreError } = await supabase
            .from('orders')
            .update({
              status,
              updated_at: new Date().toISOString()
            })
            .in('id', revertedOrders.map(order => order.id));

          if (restoreError) {
            console.error(`Failed to restore orders (attempt ${verifyAttempts + 2}):`, restoreError);
          }
        }

        verifyAttempts++;
      }
    }

    if (verifyAttempts >= maxVerifyAttempts) {
      throw new Error(`Bulk update failed: ${revertedOrders.length} orders could not be maintained as "${status}" after ${maxVerifyAttempts} attempts`);
    }

  } catch (error) {
    console.error('Error in updateOrdersStatusBulk:', error);
    throw error;
  }
};

// Helper function to test order status persistence
export const testOrderStatusPersistence = async (orderId: string): Promise<boolean> => {
  try {

    // Get current status
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, order_id')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      console.error('Order not found for persistence test');
      return false;
    }

    const originalStatus = order.status;

    // Test status change to a different status
    const testStatus = originalStatus === 'confirmed' ? 'processing' : 'confirmed';

    // Update to test status
    await updateOrderStatus(orderId, testStatus);

    // Wait and check if it reverted
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: verifyOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (verifyOrder?.status !== testStatus) {
      console.error(`❌ Status persistence test FAILED! Expected: ${testStatus}, Got: ${verifyOrder?.status}`);
      return false;
    }

    // Restore original status
    await updateOrderStatus(orderId, originalStatus);

    return true;

  } catch (error) {
    console.error('Error in status persistence test:', error);
    return false;
  }
};

// Payment retry mechanism for failed transactions
export const retryFailedPayment = async (orderId: string, originalGateway: string): Promise<{
  success: boolean;
  message: string;
  newTransactionId?: string;
}> => {
  try {
    // Retrying payment for order

    // Get order details
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      return { success: false, message: 'Order not found' };
    }

    // Check if payment is actually failed
    if (order.payment_status !== 'failed' && order.payment_status !== 'pending') {
      return { success: false, message: `Payment status is ${order.payment_status}, not failed` };
    }

    // Generate new transaction ID for retry
    const newTransactionId = `RETRY_${orderId}_${Date.now()}`;

    // Update order with retry attempt
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'pending',
        transaction_id: newTransactionId,
        payment_gateway_response: JSON.stringify({
          ...JSON.parse(order.payment_gateway_response || '{}'),
          retry_attempt: true,
          original_transaction_id: order.transaction_id,
          retry_timestamp: new Date().toISOString()
        }),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (updateError) {
      return { success: false, message: 'Failed to update order for retry' };
    }

    // Re-initiate payment based on original gateway
    if (originalGateway === 'easebuzz') {
      // Redirect to Easebuzz payment page for retry
      const paymentUrl = `${window.location.origin}/checkout?retry=true&orderId=${orderId}`;
      window.location.href = paymentUrl;
      return { success: true, message: 'Redirecting to payment gateway for retry', newTransactionId };
    } else if (originalGateway === 'phonepe') {
      // For PhonePe, redirect to checkout for retry
      const paymentUrl = `${window.location.origin}/checkout?retry=true&orderId=${orderId}&gateway=phonepe`;
      window.location.href = paymentUrl;
      return { success: true, message: 'Redirecting to PhonePe payment gateway for retry', newTransactionId };
    }

    return { success: false, message: 'Unknown payment gateway' };

  } catch (error) {
    console.error('Error in retryFailedPayment:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Advanced function to force status update with multiple strategies
export const forceOrderStatusUpdate = async (orderId: string, newStatus: string): Promise<boolean> => {
  try {

    // Strategy 1: Try normal update first
    try {
      await updateOrderStatus(orderId, newStatus);
      return true;
      return true;
    } catch (error) {
    }

    // Strategy 2: Try direct database update with admin bypass
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, order_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      throw new Error('Order not found for force update');
    }

    // Try multiple rapid updates with exponential backoff
    for (let i = 0; i < 8; i++) {
      const delay = Math.min(100 * Math.pow(2, i), 1000); // Exponential backoff, max 1s

      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (!error) {

        // Verify the status stuck
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: verifyOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single();

        if (verifyOrder?.status === newStatus) {
          return true;
        } else {
        }
      }

      if (i < 7) { // Don't delay after last attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Strategy 3: Use RPC function if available
    try {
      const { error: rpcError } = await supabase.rpc('force_update_order_status', {
        order_id: orderId,
        new_status: newStatus
      });

      if (!rpcError) {
        return true;
      }
    } catch (rpcError) {
    }

    // Strategy 4: Try bulk update approach (sometimes works better)
    try {
      const { error: bulkError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (!bulkError) {
        return true;
      }
    } catch (bulkError) {
    }

    console.error(`❌ All force update strategies failed for order ${orderId}`);
    return false;

  } catch (error) {
    console.error('Error in forceOrderStatusUpdate:', error);
    return false;
  }
};

// Payment analytics and reporting functions
export const getPaymentAnalytics = async (dateRange?: { start: string; end: string }): Promise<{
  totalTransactions: number;
  successRate: number;
  totalAmount: number;
  gatewayStats: Record<string, { count: number; amount: number; successRate: number }>;
  dailyStats: Array<{ date: string; count: number; amount: number; successRate: number }>;
}> => {
  try {
    let query = supabase
      .from('orders')
      .select('payment_status, amount, payment_gateway_response, created_at, order_id')
      .not('payment_status', 'is', null);

    if (dateRange) {
      query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    const totalTransactions = orders?.length || 0;
    const successfulTransactions = orders?.filter(o => o.payment_status === 'paid').length || 0;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const totalAmount = orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (Number(o.amount) || 0), 0) || 0;

    // Gateway statistics
    const gatewayStats: Record<string, { count: number; amount: number; successRate: number }> = {};
    const dailyStats: Record<string, { count: number; amount: number; successful: number }> = {};

    orders?.forEach(order => {
      const gateway = 'easebuzz'; // Default, could be extracted from payment_gateway_response
      const date = new Date(order.created_at || '').toISOString().split('T')[0];
      const amount = Number(order.amount) || 0;
      const isSuccess = order.payment_status === 'paid';

      // Gateway stats
      if (!gatewayStats[gateway]) {
        gatewayStats[gateway] = { count: 0, amount: 0, successRate: 0 };
      }
      gatewayStats[gateway].count++;
      gatewayStats[gateway].amount += amount;

      // Daily stats
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, amount: 0, successful: 0 };
      }
      dailyStats[date].count++;
      dailyStats[date].amount += amount;
      if (isSuccess) dailyStats[date].successful++;
    });

    // Calculate success rates for gateways
    Object.keys(gatewayStats).forEach(gateway => {
      const stats = gatewayStats[gateway];
      stats.successRate = stats.count > 0 ? (stats.count / totalTransactions) * 100 : 0;
    });

    // Convert daily stats to array format
    const dailyStatsArray = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      count: stats.count,
      amount: stats.amount,
      successRate: stats.count > 0 ? (stats.successful / stats.count) * 100 : 0
    }));

    return {
      totalTransactions,
      successRate,
      totalAmount,
      gatewayStats,
      dailyStats: dailyStatsArray
    };

  } catch (error) {
    console.error('Error getting payment analytics:', error);
    throw error;
  }
};

// Enhanced payment security functions

// Fraud detection for suspicious payment patterns
export const detectSuspiciousPaymentActivity = async (customerEmail: string, amount: number): Promise<{
  isSuspicious: boolean;
  riskScore: number;
  reasons: string[];
}> => {
  try {
    // Check recent payment attempts from same email
    const { data: recentPayments, error } = await supabase
      .from('orders')
      .select('created_at, amount, payment_status, customer_email')
      .eq('customer_email', customerEmail)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    if (error) throw error;

    let riskScore = 0;
    const reasons: string[] = [];

    // Check for multiple failed attempts (potential card testing)
    const failedAttempts = recentPayments?.filter(p => p.payment_status === 'failed').length || 0;
    if (failedAttempts > 3) {
      riskScore += 30;
      reasons.push(`${failedAttempts} failed payment attempts in last 24 hours`);
    }

    // Check for rapid successive attempts
    if (recentPayments && recentPayments.length > 0) {
      const latestPayment = new Date(recentPayments[0].created_at || '');
      const timeSinceLastPayment = Date.now() - latestPayment.getTime();

      if (timeSinceLastPayment < 5 * 60 * 1000) { // Less than 5 minutes
        riskScore += 20;
        reasons.push('Rapid successive payment attempts');
      }
    }

    // Check for unusually high amounts
    if (amount > 50000) { // Amount > ₹50,000
      riskScore += 25;
      reasons.push('Unusually high payment amount');
    }

    // Check for round number amounts (common in testing)
    if (amount % 1000 === 0 && amount > 10000) {
      riskScore += 15;
      reasons.push('Suspicious round number amount');
    }

    return {
      isSuspicious: riskScore >= 50,
      riskScore,
      reasons
    };

  } catch (error) {
    console.error('Error in fraud detection:', error);
    return { isSuspicious: false, riskScore: 0, reasons: ['Error checking payment history'] };
  }
};

// Rate limiting for payment attempts
export const checkPaymentRateLimit = async (customerEmail: string): Promise<{
  allowed: boolean;
  remainingAttempts: number;
  resetTime: string;
}> => {
  try {
    const windowMs = 60 * 60 * 1000; // 1 hour window
    const maxAttempts = 10; // Max 10 attempts per hour

    const { data: recentAttempts, error } = await supabase
      .from('orders')
      .select('created_at')
      .eq('customer_email', customerEmail)
      .gte('created_at', new Date(Date.now() - windowMs).toISOString());

    if (error) throw error;

    const attemptsInWindow = recentAttempts?.length || 0;
    const remainingAttempts = Math.max(0, maxAttempts - attemptsInWindow);
    const resetTime = new Date(Date.now() + windowMs).toISOString();

    return {
      allowed: attemptsInWindow < maxAttempts,
      remainingAttempts,
      resetTime
    };

  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remainingAttempts: 10, resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  }
};

// Validate payment security before processing
export const validatePaymentSecurity = async (
  customerEmail: string,
  amount: number,
  customerPhone?: string
): Promise<{
  approved: boolean;
  requiresVerification: boolean;
  message: string;
  actions?: string[];
}> => {
  try {
    // Check rate limiting
    const rateLimit = await checkPaymentRateLimit(customerEmail);

    if (!rateLimit.allowed) {
      return {
        approved: false,
        requiresVerification: false,
        message: `Too many payment attempts. Please try again after ${new Date(rateLimit.resetTime).toLocaleTimeString()}`,
        actions: ['wait', 'contact_support']
      };
    }

    // Check for suspicious activity
    const fraudCheck = await detectSuspiciousPaymentActivity(customerEmail, amount);

    if (fraudCheck.isSuspicious) {
      return {
        approved: false,
        requiresVerification: true,
        message: `Payment flagged for security review. Reasons: ${fraudCheck.reasons.join(', ')}`,
        actions: ['verify_identity', 'contact_support']
      };
    }

    // Additional validation for high amounts
    if (amount > 25000) { // Amount > ₹25,000
      return {
        approved: false,
        requiresVerification: true,
        message: 'High-value transaction requires additional verification',
        actions: ['verify_payment_method', 'contact_customer']
      };
    }

    return {
      approved: true,
      requiresVerification: false,
      message: 'Payment security check passed'
    };

  } catch (error) {
    console.error('Error in payment security validation:', error);
    return {
      approved: true, // Default to allowing payment if security check fails
      requiresVerification: false,
      message: 'Security check completed'
    };
  }
};

// Payment notifications system
export const sendPaymentNotification = async (
  orderId: string,
  type: 'success' | 'failed' | 'pending' | 'retry',
  customerEmail: string,
  amount: number,
  gateway: string
): Promise<boolean> => {
  try {
    // Get order details for notification
    const { data: order, error } = await supabase
      .from('orders')
      .select('customer_name, order_id')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      console.error('Order not found for notification:', orderId);
      return false;
    }

    const customerName = order.customer_name || 'Customer';

    // Prepare notification content based on type
    const notifications = {
      success: {
        subject: `Payment Confirmed - Order ${orderId}`,
        message: `Hi ${customerName}, your payment of ₹${amount.toLocaleString()} for order ${orderId} has been successfully processed via ${gateway}. Your order is being prepared for shipment.`
      },
      failed: {
        subject: `Payment Failed - Order ${orderId}`,
        message: `Hi ${customerName}, we were unable to process your payment of ₹${amount.toLocaleString()} for order ${orderId}. Please try again or contact support.`
      },
      pending: {
        subject: `Payment Processing - Order ${orderId}`,
        message: `Hi ${customerName}, your payment of ₹${amount.toLocaleString()} for order ${orderId} is being processed. We'll notify you once it's confirmed.`
      },
      retry: {
        subject: `Payment Retry - Order ${orderId}`,
        message: `Hi ${customerName}, we're retrying your payment of ₹${amount.toLocaleString()} for order ${orderId}. You'll be redirected to complete the payment.`
      }
    };

    const notification = notifications[type];

    // Here you would integrate with your email service
    // For now, we'll log the notification (replace with actual email service)
    // Payment notification sent

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // const emailSent = await sendEmail({
    //   to: customerEmail,
    //   subject: notification.subject,
    //   html: notification.message
    // });

    return true;

  } catch (error) {
    console.error('Error sending payment notification:', error);
    return false;
  }
};

// Get comprehensive payment dashboard data
export const getPaymentDashboardData = async (dateRange?: { start: string; end: string }): Promise<{
  overview: {
    totalOrders: number;
    totalRevenue: number;
    successRate: number;
    averageOrderValue: number;
  };
  trends: {
    daily: Array<{ date: string; orders: number; revenue: number; successRate: number }>;
    weekly: Array<{ week: string; orders: number; revenue: number; successRate: number }>;
  };
  methods: {
    easebuzz: { count: number; amount: number; successRate: number };
    phonepe: { count: number; amount: number; successRate: number };
  };
  failures: {
    total: number;
    byReason: Record<string, number>;
    byGateway: Record<string, number>;
  };
}> => {
  try {
    let query = supabase
      .from('orders')
      .select('payment_status, amount, payment_gateway_response, created_at, order_id')
      .not('payment_status', 'is', null);

    if (dateRange) {
      query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    const totalOrders = orders?.length || 0;
    const successfulOrders = orders?.filter(o => o.payment_status === 'paid') || [];
    const totalRevenue = successfulOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const successRate = totalOrders > 0 ? (successfulOrders.length / totalOrders) * 100 : 0;
    const averageOrderValue = successfulOrders.length > 0 ? totalRevenue / successfulOrders.length : 0;

    // Daily trends
    const dailyTrends: Record<string, { orders: number; revenue: number; successful: number }> = {};
    orders?.forEach(order => {
      const date = new Date(order.created_at || '').toISOString().split('T')[0];
      if (!dailyTrends[date]) {
        dailyTrends[date] = { orders: 0, revenue: 0, successful: 0 };
      }
      dailyTrends[date].orders++;
      if (order.payment_status === 'paid') {
        dailyTrends[date].revenue += Number(order.amount) || 0;
        dailyTrends[date].successful++;
      }
    });

    // Weekly trends (simplified - group by week)
    const weeklyTrends: Record<string, { orders: number; revenue: number; successful: number }> = {};
    orders?.forEach(order => {
      const date = new Date(order.created_at || '');
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyTrends[weekKey]) {
        weeklyTrends[weekKey] = { orders: 0, revenue: 0, successful: 0 };
      }
      weeklyTrends[weekKey].orders++;
      if (order.payment_status === 'paid') {
        weeklyTrends[weekKey].revenue += Number(order.amount) || 0;
        weeklyTrends[weekKey].successful++;
      }
    });

    // Format trends data
    const dailyFormatted = Object.entries(dailyTrends).map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue,
      successRate: data.orders > 0 ? (data.successful / data.orders) * 100 : 0
    }));

    const weeklyFormatted = Object.entries(weeklyTrends).map(([week, data]) => ({
      week,
      orders: data.orders,
      revenue: data.revenue,
      successRate: data.orders > 0 ? (data.successful / data.orders) * 100 : 0
    }));

    // Payment methods analysis
    const easebuzzStats = { count: 0, amount: 0, successful: 0 };
    const phonepeStats = { count: 0, amount: 0, successful: 0 };

    orders?.forEach(order => {
      const gateway = 'easebuzz'; // Extract from payment_gateway_response if available
      const amount = Number(order.amount) || 0;
      const isSuccess = order.payment_status === 'paid';

      if (gateway === 'easebuzz') {
        easebuzzStats.count++;
        easebuzzStats.amount += amount;
        if (isSuccess) easebuzzStats.successful++;
      } else if (gateway === 'phonepe') {
        phonepeStats.count++;
        phonepeStats.amount += amount;
        if (isSuccess) phonepeStats.successful++;
      }
    });

    // Failure analysis
    const failedOrders = orders?.filter(o => o.payment_status === 'failed') || [];
    const failureReasons: Record<string, number> = {};
    const gatewayFailures: Record<string, number> = {};

    failedOrders.forEach(order => {
      const response = order.payment_gateway_response ? JSON.parse(order.payment_gateway_response) : {};
      const gateway = response.gateway || 'unknown';

      // Analyze failure reasons
      if (response.error_message) {
        const reason = response.error_message.substring(0, 50);
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      }

      gatewayFailures[gateway] = (gatewayFailures[gateway] || 0) + 1;
    });

    return {
      overview: {
        totalOrders,
        totalRevenue,
        successRate,
        averageOrderValue
      },
      trends: {
        daily: dailyFormatted,
        weekly: weeklyFormatted
      },
      methods: {
        easebuzz: {
          count: easebuzzStats.count,
          amount: easebuzzStats.amount,
          successRate: easebuzzStats.count > 0 ? (easebuzzStats.successful / easebuzzStats.count) * 100 : 0
        },
        phonepe: {
          count: phonepeStats.count,
          amount: phonepeStats.amount,
          successRate: phonepeStats.count > 0 ? (phonepeStats.successful / phonepeStats.count) * 100 : 0
        }
      },
      failures: {
        total: failedOrders.length,
        byReason: failureReasons,
        byGateway: gatewayFailures
      }
    };

  } catch (error) {
    console.error('Error getting payment dashboard data:', error);
    return {
      overview: { totalOrders: 0, totalRevenue: 0, successRate: 0, averageOrderValue: 0 },
      trends: { daily: [], weekly: [] },
      methods: { easebuzz: { count: 0, amount: 0, successRate: 0 }, phonepe: { count: 0, amount: 0, successRate: 0 } },
      failures: { total: 0, byReason: {}, byGateway: {} }
    };
  }
};

// Get payment failure analysis
export const getPaymentFailureAnalysis = async (days: number = 7): Promise<{
  totalFailures: number;
  failureReasons: Record<string, number>;
  gatewayFailures: Record<string, number>;
  timeBasedFailures: Record<string, number>;
}> => {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: failedOrders, error } = await supabase
      .from('orders')
      .select('payment_gateway_response, payment_status, created_at')
      .eq('payment_status', 'failed')
      .gte('created_at', startDate);

    if (error) throw error;

    const failureReasons: Record<string, number> = {};
    const gatewayFailures: Record<string, number> = {};
    const timeBasedFailures: Record<string, number> = {};

    failedOrders?.forEach(order => {
      const response = order.payment_gateway_response ? JSON.parse(order.payment_gateway_response) : {};
      const hour = new Date(order.created_at || '').getHours();

      // Analyze failure reasons
      if (response.error_message) {
        const reason = response.error_message.substring(0, 50); // First 50 chars
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      }

      // Analyze by gateway
      const gateway = response.gateway || 'unknown';
      gatewayFailures[gateway] = (gatewayFailures[gateway] || 0) + 1;

      // Analyze by time of day
      const timeSlot = `${hour}:00-${hour + 1}:00`;
      timeBasedFailures[timeSlot] = (timeBasedFailures[timeSlot] || 0) + 1;
    });

    return {
      totalFailures: failedOrders?.length || 0,
      failureReasons,
      gatewayFailures,
      timeBasedFailures
    };

  } catch (error) {
    console.error('Error getting payment failure analysis:', error);
    return {
      totalFailures: 0,
      failureReasons: {},
      gatewayFailures: {},
      timeBasedFailures: {}
    };
  }
};

// Get payment methods performance comparison
export const getPaymentMethodComparison = async (): Promise<{
  easebuzz: { count: number; amount: number; successRate: number };
  phonepe: { count: number; amount: number; successRate: number };
  total: { count: number; amount: number };
}> => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('payment_status, amount, payment_gateway_response')
      .not('payment_status', 'is', null);

    if (error) throw error;

    const easebuzzStats = { count: 0, amount: 0, successful: 0 };
    const phonepeStats = { count: 0, amount: 0, successful: 0 };

    orders?.forEach(order => {
      const gateway = 'easebuzz'; // Extract from payment_gateway_response if available
      const amount = Number(order.amount) || 0;
      const isSuccess = order.payment_status === 'paid';

      if (gateway === 'easebuzz') {
        easebuzzStats.count++;
        easebuzzStats.amount += amount;
        if (isSuccess) easebuzzStats.successful++;
      } else if (gateway === 'phonepe') {
        phonepeStats.count++;
        phonepeStats.amount += amount;
        if (isSuccess) phonepeStats.successful++;
      }
    });

    return {
      easebuzz: {
        count: easebuzzStats.count,
        amount: easebuzzStats.amount,
        successRate: easebuzzStats.count > 0 ? (easebuzzStats.successful / easebuzzStats.count) * 100 : 0
      },
      phonepe: {
        count: phonepeStats.count,
        amount: phonepeStats.amount,
        successRate: phonepeStats.count > 0 ? (phonepeStats.successful / phonepeStats.count) * 100 : 0
      },
      total: {
        count: (orders?.length || 0),
        amount: easebuzzStats.amount + phonepeStats.amount
      }
    };

  } catch (error) {
    console.error('Error getting payment method comparison:', error);
    throw error;
  }
};

// Diagnostic function to identify what's causing status reversion
export const diagnoseOrderStatusIssue = async (orderId: string): Promise<{
  issue: string;
  details: string;
  recommendation: string;
  triggerInfo?: any;
}> => {
  try {

    // Get order details
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return {
        issue: 'Order Not Found',
        details: 'The specified order does not exist in the database',
        recommendation: 'Verify the order ID is correct'
      };
    }


    // Test multiple status changes to understand the pattern
    const testStatuses = ['processing', 'ready_to_ship', 'shipped', 'delivered'];
    const results = [];

    for (const testStatus of testStatuses) {
      if (testStatus === order.status) continue;

      try {

        // Record time before update
        const beforeTime = Date.now();

        // Try the update
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: testStatus, updated_at: new Date().toISOString() })
          .eq('id', orderId);

        if (updateError) {
          results.push({
            status: testStatus,
            error: updateError.message,
            success: false
          });
          continue;
        }

        // Wait and check if it reverts
        await new Promise(resolve => setTimeout(resolve, 200));

        const { data: verifyOrder } = await supabase
          .from('orders')
          .select('status, updated_at')
          .eq('id', orderId)
          .single();

        const afterTime = Date.now();
        const reverted = verifyOrder?.status !== testStatus;

        results.push({
          status: testStatus,
          success: !reverted,
          reverted: reverted,
          finalStatus: verifyOrder?.status,
          timeToRevert: reverted ? `${afterTime - beforeTime}ms` : null
        });

        // Restore to original status for next test
        if (reverted) {
          await supabase
            .from('orders')
            .update({ status: order.status, updated_at: new Date().toISOString() })
            .eq('id', orderId);
        }

      } catch (error) {
        results.push({
          status: testStatus,
          error: error.message,
          success: false
        });
      }
    }

    // Analyze results
    const successfulChanges = results.filter(r => r.success);
    const revertedChanges = results.filter(r => r.reverted);


    if (revertedChanges.length === testStatuses.length - 1) {
      // All status changes get reverted
      return {
        issue: 'Systematic Status Reversion',
        details: `All status changes from "${order.status}" are automatically reverted back to "${order.status}". Tested: ${revertedChanges.map(r => r.status).join(', ')}`,
        recommendation: 'Database trigger or RLS policy is enforcing that orders must remain in current status. Check database triggers and RLS policies.',
        triggerInfo: results
      };
    } else if (successfulChanges.length > 0) {
      return {
        issue: 'Partial Status Reversion',
        details: `Some status changes work (${successfulChanges.map(r => r.status).join(', ')}), others revert (${revertedChanges.map(r => r.status).join(', ')})`,
        recommendation: 'Check if specific status transitions are blocked by business rules or triggers',
        triggerInfo: results
      };
    } else {
      return {
        issue: 'Update Permission Error',
        details: `Cannot update order status at all. Errors: ${results.map(r => r.error).join(', ')}`,
        recommendation: 'Check RLS policies and user permissions for order updates',
        triggerInfo: results
      };
    }

  } catch (error) {
    return {
      issue: 'Diagnostic Error',
      details: error.message,
      recommendation: 'Check database connectivity'
    };
  }
};

// Admin: Update payment status directly by order id
export const updateOrderPaymentStatusById = async (id: string, paymentStatus: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus }, { returning: 'minimal' })
      .eq('id', id);

    if (error) {
      throw error;
    }

    if (paymentStatus === 'paid') {
    }
  } catch (error) {
    throw error;
  }
};

// Legacy function for backward compatibility - now uses pagination
// This function gets ALL orders without any filtering for vendor pages
export const getAllOrdersForAdmin = async (): Promise<Order[]> => {
  try {
    const allOrders: Order[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      // Call getOrdersForAdmin with empty filters to avoid vendor filtering
      const { orders, totalCount } = await getOrdersForAdmin(batchSize, offset, {});

      if (orders.length === 0) {
        break;
      }

      allOrders.push(...orders);

      if (orders.length < batchSize || allOrders.length >= totalCount) {
        break;
      }

      offset += batchSize;
    }

    return allOrders;
  } catch (error) {
    throw error;
  }
};

// Function to get all orders without limits for analytics - bypasses pagination issues
export const getAllOrdersForAnalytics = async (filters?: {
  year?: number;
  month?: number;
  status?: string;
  vendorId?: string;
  paymentStatus?: string;
}): Promise<Order[]> => {
  try {
    const allOrders: Order[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_id,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          status,
          payment_status,
          amount,
          created_at,
          updated_at,
          applied_offer,
          vendor_id,
          vendor_code,
          transaction_id,
          product_id,
          quantity,
          product_colors,
          vendors:vendor_id(
            id,
            name,
            vendor_code,
            contact_person
          ),
          product:product_id(
            id,
            name,
            vendor_id,
            vendors:vendor_id(
              id,
              name,
              vendor_code,
              contact_person
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        allOrders.push(...data);
        from += batchSize;

        if (data.length < batchSize) {
          break;
        }
      } else {
        break;
      }
    }

    return allOrders;
  } catch (error) {
    throw error;
  }
};

// Optimized function to get order summary statistics without fetching all records
export const getOrdersSummaryStats = async (filters?: {
  year?: number;
  month?: number;
  status?: string;
  vendorId?: string;
  paymentStatus?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}): Promise<{
  totalOrders: number;
  totalAmount: number;
  pendingOrders: number;
  completedOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  readyToShipOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
  failedOrders: number;
  confirmedAmount: number;
  processingAmount: number;
  readyToShipAmount: number;
  shippedAmount: number;
  deliveredAmount: number;
  cancelledAmount: number;
  pendingAmount: number;
  failedAmount: number;
  totalSarees: number;
  activeSarees: number;
  confirmedSarees: number;
}> => {
  try {
    // Fetch all matching orders in batches (Supabase limit is 1000 per query)
    const allOrders: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      // Build query with same logic as getOrdersForAdmin
      let query = supabase
        .from('orders')
        .select('*');

      // Apply date filters - prioritize specific date ranges over year/month filters
      if (filters?.startDate || filters?.endDate) {
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          query = query.gte('created_at', startDate.toISOString());
        }

        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999); // End of day
          query = query.lte('created_at', endDate.toISOString());
        }
      } else {
        // Apply year/month filters only if no specific date range
        if (filters?.year) {
          const startDate = new Date(filters.year, 0, 1);
          const endDate = new Date(filters.year + 1, 0, 1);
          query = query.gte('created_at', startDate.toISOString())
                       .lt('created_at', endDate.toISOString());
        }

        if (filters?.month && filters?.year) {
          const startDate = new Date(filters.year, filters.month - 1, 1);
          const endDate = new Date(filters.year, filters.month, 1);
          query = query.gte('created_at', startDate.toISOString())
                       .lt('created_at', endDate.toISOString());
        }
      }

      // Apply other server-side filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply server-side vendor filtering for summary stats
      if (filters?.vendorId && filters.vendorId !== 'all') {
        // Use simple vendor_id filtering for consistency
        query = query.eq('vendor_id', filters.vendorId);
      }

      if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq('payment_status', filters.paymentStatus);
      }

      if (filters?.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        query = query.or(`order_id.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }

      // Add pagination
      query = query.range(from, from + batchSize - 1);

      const { data: batch, error } = await query;

      if (error) {
        break;
      }

      if (batch && batch.length > 0) {
        allOrders.push(...batch);
        from += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    const orders = allOrders;

    // Calculate all statistics
    let totalAmount = 0;
    let confirmedAmount = 0;
    let processingAmount = 0;
    let readyToShipAmount = 0;
    let shippedAmount = 0;
    let deliveredAmount = 0;
    let cancelledAmount = 0;
    let pendingAmount = 0;
    let failedAmount = 0;
    let totalSarees = 0;
    let activeSarees = 0;
    let confirmedSarees = 0;

    const statusCounts = {
      pending: 0,
      processing: 0,
      confirmed: 0,
      ready_to_ship: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      failed: 0
    };

    orders.forEach(order => {
      const amount = Number(order.amount) || 0;
      totalAmount += amount;

      // Count by status
      const status = order.status?.toLowerCase() || 'pending';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }

      // Amount by status
      if (status === 'confirmed' || order.payment_status === 'paid') {
        confirmedAmount += amount;
      }
      if (status === 'processing') {
        processingAmount += amount;
      }
      if (status === 'ready_to_ship') {
        readyToShipAmount += amount;
      }
      if (status === 'shipped') {
        shippedAmount += amount;
      }
      if (status === 'delivered') {
        deliveredAmount += amount;
      }
      if (status === 'cancelled') {
        cancelledAmount += amount;
      }
      if (status === 'pending') {
        pendingAmount += amount;
      }
      if (status === 'failed' || order.payment_status === 'failed') {
        failedAmount += amount;
      }

      // Calculate sarees
      let orderQuantity = 0;
      try {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            orderQuantity += Number(item.quantity || 1);
          });
        } else {
          const raw = order.applied_offer;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && Array.isArray(parsed.items)) {
            parsed.items.forEach((item: any) => {
              orderQuantity += Number(item.quantity || 1);
            });
          } else {
            orderQuantity = Number(order.quantity || 1);
          }
        }
      } catch (e) {
        orderQuantity = Number(order.quantity || 1);
      }

      totalSarees += orderQuantity;

      // Active sarees (excluding cancelled and refunded)
      if (status !== 'cancelled' && status !== 'refunded') {
        activeSarees += orderQuantity;
      }

      // Confirmed sarees (excluding cancelled and pending)
      if (status !== 'cancelled' && status !== 'pending') {
        confirmedSarees += orderQuantity;
      }
    });

    return {
      totalOrders: orders.length,
      totalAmount,
      pendingOrders: statusCounts.pending,
      completedOrders: statusCounts.delivered,
      confirmedOrders: statusCounts.confirmed,
      processingOrders: statusCounts.processing,
      readyToShipOrders: statusCounts.ready_to_ship,
      shippedOrders: statusCounts.shipped,
      cancelledOrders: statusCounts.cancelled,
      failedOrders: statusCounts.failed,
      confirmedAmount,
      processingAmount,
      readyToShipAmount,
      shippedAmount,
      deliveredAmount,
      cancelledAmount,
      pendingAmount,
      failedAmount,
      totalSarees,
      activeSarees,
      confirmedSarees
    };
  } catch (error) {
    // Return default values instead of throwing to prevent UI from breaking
    return {
      totalOrders: 0,
      totalAmount: 0,
      pendingOrders: 0,
      completedOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      readyToShipOrders: 0,
      shippedOrders: 0,
      cancelledOrders: 0,
      failedOrders: 0,
      confirmedAmount: 0,
      processingAmount: 0,
      readyToShipAmount: 0,
      shippedAmount: 0,
      deliveredAmount: 0,
      cancelledAmount: 0,
      pendingAmount: 0,
      failedAmount: 0,
      totalSarees: 0,
      activeSarees: 0,
      confirmedSarees: 0
    };
  }
};

// Admin: Generic partial update for editing order fields
export const updateOrderFields = async (id: string, fields: Partial<Order>): Promise<void> => {
  try {
    const sanitized: any = { ...fields };
    // Remove nested/joined-only fields
    ['products', 'vendors'].forEach((k) => delete sanitized[k]);

    const { error } = await supabase
      .from('orders')
      .update(sanitized)
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Helper function to format product display
export const formatProductDisplay = (order: any): string => {
  // Prefer product name prominently
  const productName = (Array.isArray(order.products) && order.products[0]?.name)
    || order.product_name
    || 'N/A';

  const colors: string[] = Array.isArray(order.product_colors) ? order.product_colors : [];
  const colorText = colors.length > 0 ? colors.join('\n') : '';
  const quantity = order.quantity || 1;

  // Optional identifier (saree_id or product id) in a subtle way
  const productIdentifier = order.saree_id
    || (Array.isArray(order.products) && order.products[0]?.saree_id)
    || order.product_id
    || '';

  const lines: string[] = [];
  // First line: Name and colors inline when single color, otherwise on next lines
  if (colors.length === 1) {
    lines.push(`${productName} - ${colors[0]}`);
  } else if (colors.length > 1) {
    lines.push(productName);
  } else {
    lines.push(productName);
  }

  // If multiple colors, show them on separate lines for readability
  if (colors.length > 1) {
    lines.push(...colors);
  }

  // Quantity line
  lines.push(`Qty: ${quantity}`);

  // Append identifier on a new line if available and distinct from name
  if (productIdentifier && productIdentifier !== productName) {
    lines.push(String(productIdentifier));
  }

  return lines.join('\n');
};

// Helper function for Excel/CSV export
export const formatProductForExport = (order: any): string => {
  const productName = (Array.isArray(order.products) && order.products[0]?.name)
    || order.product_name
    || 'N/A';
  const colors: string[] = Array.isArray(order.product_colors) ? order.product_colors : [];
  const quantity = order.quantity || 1;
  const colorText = colors.length > 0 ? colors.join(', ') : 'N/A';

  return `${productName} | ${colorText} | Qty: ${quantity}`;
};

export const updateOrderPaymentStatus = async (
  txnid: string,
  paymentStatus: string,
  paymentDetails?: any
): Promise<void> => {
  try {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      const updateData: any = {
        payment_status: paymentStatus,
        status: paymentStatus === 'paid' || paymentStatus === 'confirmed' ? 'confirmed' : (paymentStatus === 'failed' ? 'cancelled' : 'pending')
      };      // Store additional payment details if provided
      if (paymentDetails) {
        updateData.payment_method = paymentDetails.payment_source || paymentDetails.paymentMode || paymentDetails.PG_TYPE || 'Online';
        updateData.transaction_id = paymentDetails.transactionId || paymentDetails.bank_ref_num || paymentDetails.easepayid || paymentDetails.txnid || paymentDetails.txnId;
        
        // Skip amount for now to avoid composite type errors
        // if (paymentDetails.amount) {
        //   updateData.amount = parseFloat(paymentDetails.amount);
        // }
        
        // Only update amount if it exists in the schema
        // Note: payment_mode column may not exist, so we'll skip optional fields that cause errors
      }

      // Try to update using order_id from udf2 first, then fallback to txnid
      let orderIdToUse = txnid;
      if (paymentDetails?.udf2) {
        orderIdToUse = paymentDetails.udf2;
      }


      // First check if the order exists
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id, order_id, payment_status, status')
        .eq('order_id', orderIdToUse)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return; // Don't try to update non-existent order
        }
        // If there's another error checking, still try the update by order_id
        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('order_id', orderIdToUse);
        
        if (error) {
          // Handle error for update by order_id when check failed
          if (error.code === 'PGRST204' || error.code === '0A000') {
            return;
          }
          throw error;
        }
      } else {
        
        // Try the full update
        let { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', existingOrder.id);
        
        if (error) {
          // Fallback to updating by order_id
          const { error: fallbackError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('order_id', orderIdToUse);
          
          if (fallbackError) {
            error = fallbackError;
          } else {
            error = null;
          }
        } else {
        }
        
        // Handle the error if both attempts failed
        if (error) {
          // For schema cache errors (PGRST204), don't throw - the update may have actually succeeded
          if (error.code === 'PGRST204') {
            return; // Don't throw error for schema cache issues
          }

          // For composite type errors, try with core fields instead
          if (error.code === '0A000') {
          } else {
          }

          // Create a copy of updateData with only core fields
          const coreUpdateData: any = {
            payment_status: updateData.payment_status
            // Only update payment_status to avoid issues
            // status: updateData.status
          };

          const { error: retryError } = await supabase
            .from('orders')
            .update(coreUpdateData)
            .eq('id', existingOrder.id);

          if (retryError) {
            // For column errors, don't throw - just log and continue
            if (retryError.code === 'PGRST204' || retryError.code === '0A000') {
              return; // Don't throw error for missing columns or composite type issues
            }
            throw retryError;
          }

        }
      }

      if (error) {
        // For schema cache errors and composite type errors, don't throw - the update may have actually succeeded
        if (error.code === 'PGRST204' || error.code === '0A000') {
          return; // Don't throw error for schema cache issues or composite type errors
        }

        // Check if it's a concurrency-related error
        if ((error.code === '40001' || error.message?.includes('concurrent')) && retryCount < maxRetries - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
          continue;
        }

        // For other errors, check if the order exists first
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          return; // Don't throw error if order doesn't exist
        }

        // For other errors, try updating with only core fields

        // Create a copy of updateData with only core fields
        const coreUpdateData: any = {
          payment_status: updateData.payment_status
          // Only update payment_status to avoid issues
          // status: updateData.status
        };

        // Add other safe fields if they exist
        if (updateData.payment_method) coreUpdateData.payment_method = updateData.payment_method;
        if (updateData.transaction_id) coreUpdateData.transaction_id = updateData.transaction_id;
        // Skip amount to avoid composite type errors

        const { error: retryError } = await supabase
          .from('orders')
          .update(coreUpdateData)
          .eq('order_id', orderIdToUse);

        if (retryError) {
          // For column errors and composite type errors, don't throw - just log and continue
          if (retryError.code === 'PGRST204' || retryError.code === '0A000') {
            return; // Don't throw error for missing columns or composite type issues
          }
          throw retryError;
        }

      }

      
      // Verify the update
      try {
        const { data: verifyData } = await supabase
          .from('orders')
          .select('order_id, status, payment_status')
          .eq('order_id', orderIdToUse)
          .single();
      } catch (verifyError) {
      }
      
      return;
    }
  } catch (error) {
    // Log the error but don't throw - allow payment success flow to continue
  }
};

// Create per-product orders after payment, grouped by product across colors
export const createVendorSplitOrders = async (
  masterOrderId: string,
  customer: { name: string; email: string; phone?: string; shippingAddress?: string; },
  items: Array<{ productId?: string; name: string; color?: string; quantity: number; price: number; image?: string }>,
  options?: { linkToMaster?: boolean }
): Promise<Order[]> => {
  const created: Order[] = [] as any;
  if (!Array.isArray(items) || items.length === 0) return created;

  // Create one child order per cart line (product + color)
  for (const it of items) {
    const lineQuantity = Math.max(1, Number(it.quantity || 1));
    const lineAmount = Number(it.price || 0) * lineQuantity;
    const colorSlug = (it.color ? String(it.color).replace(/\s+/g, '').slice(0,6) : 'nc').toUpperCase();
    const prodSuffix = (it.productId ? String(it.productId).slice(-4) : it.name.replace(/\s+/g, '').slice(0,6)).toUpperCase();
    const childOrderId = `${masterOrderId}-${prodSuffix}-${colorSlug}-${Date.now().toString().slice(-4)}`;

    const insertData: Partial<Order> = {
      order_id: childOrderId,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || null,
      product_id: it.productId || null,
      product_name: it.name,
      product_colors: it.color ? [String(it.color)] : [],
      quantity: lineQuantity,
      amount: lineAmount,
      status: 'confirmed',
      payment_method: 'phonepe',
      payment_status: 'paid',
      shipping_address: customer.shippingAddress || null,
    };

    // Enrich with vendor metadata from product if possible
    try {
      if (it.productId) {
        const { data: productData } = await supabase
          .from('products')
          .select(`*, vendors ( id, vendor_code )`)
          .eq('id', it.productId)
          .single();
        if (productData?.vendors) {
          insertData.vendor_id = productData.vendors.id;
          insertData.vendor_code = productData.vendors.vendor_code;
          insertData.saree_id = productData.saree_id;
        }
      } else {
        const baseName = it.name.split(' (')[0] || it.name;
        const { data: productData } = await supabase
          .from('products')
          .select(`*, vendors ( id, vendor_code )`)
          .eq('name', baseName)
          .single();
        if (productData?.vendors) {
          insertData.vendor_id = productData.vendors.id;
          insertData.vendor_code = productData.vendors.vendor_code;
          insertData.saree_id = productData.saree_id;
          insertData.product_id = productData.id;
        }
      }
    } catch {}

    const { data, error } = await supabase
      .from('orders')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      continue;
    }

    created.push(data as any);
  }

  return created;
};

// Customer functions
export const getCustomers = async (limit?: number): Promise<Customer[]> => {
  try {
    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const updateCustomer = async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Inventory functions - Now integrated with products table
export const getInventory = async (): Promise<Inventory[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

// Adjust product stock for specific color
export const adjustProductStock = async (productId: string, colorName: string, newStock: number): Promise<boolean> => {
  try {
    
    // Get current product data
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('color_stock')
      .eq('id', productId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // Parse current color stock
    let colorStock: Array<{ color: string; stock: number }> = [];
    try {
      colorStock = Array.isArray(product?.color_stock) ? product.color_stock : JSON.parse(product?.color_stock || '[]');
    } catch (parseError) {
      colorStock = [];
    }

    // Check if the color exists
    const colorExists = colorStock.some(item => item.color === colorName);
    if (!colorExists) {
      throw new Error(`Color ${colorName} not found for this product`);
    }

    // Update stock for the specific color
    const updatedColorStock = colorStock.map(item => 
      item.color === colorName ? { ...item, stock: newStock } : item
    );


    // Update the product
    const { error: updateError } = await supabase
      .from('products')
      .update({ color_stock: updatedColorStock })
      .eq('id', productId);

    if (updateError) {
      throw updateError;
    }

    return true;
  } catch (error) {
    throw error;
  }
};

export const createInventoryItem = async (inventoryData: Partial<Inventory>): Promise<Inventory> => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert([inventoryData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateInventoryItem = async (id: string, inventoryData: Partial<Inventory>): Promise<Inventory> => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .update(inventoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Delivery functions
export const getDeliveries = async (): Promise<Delivery[]> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const createDelivery = async (deliveryData: Partial<Delivery>): Promise<Delivery> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .insert([deliveryData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateDeliveryStatus = async (id: string, status: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('deliveries')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const updateDeliveryDetails = async (id: string, deliveryData: Partial<Delivery>): Promise<void> => {
  try {
    const { error } = await supabase
      .from('deliveries')
      .update(deliveryData)
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Vendor functions
export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const createVendor = async (vendorData: Partial<Vendor>): Promise<Vendor> => {
  try {
    
    // Validate required fields
    if (!vendorData.vendor_code || vendorData.vendor_code.trim() === '') {
      throw new Error('Vendor code is required');
    }
    
    if (!vendorData.name || vendorData.name.trim() === '') {
      throw new Error('Vendor name is required');
    }

    // Ensure is_active has a default value
    const sanitizedData = {
      ...vendorData,
      is_active: vendorData.is_active !== undefined ? vendorData.is_active : true
    };

    const { data, error } = await supabase
      .from('vendors')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create vendor: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateVendor = async (id: string, vendorData: Partial<Vendor>): Promise<Vendor> => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .update(vendorData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteVendor = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if vendor has products
    const { data: products, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('vendor_id', id)
      .limit(1);

    if (checkError) {
      return { success: false, error: 'Failed to check vendor usage' };
    }

    if (products && products.length > 0) {
      return { success: false, error: 'Cannot delete vendor with existing products' };
    }

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete vendor' };
  }
};

export const getVendorOrdersByVendor = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('vendor_orders')
      .select('*')
      .order('vendor_name', { ascending: true })
      .order('order_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Group orders by vendor
    const groupedOrders = (data || []).reduce((acc: any, order: VendorOrder) => {
      const vendorId = order.vendor_id;
      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendor: {
            id: order.vendor_id,
            name: order.vendor_name,
            vendor_code: order.vendor_ref,
            contact_person: order.contact_person,
            phone: order.vendor_phone,
            email: order.vendor_email,
            address: order.vendor_address,
            city: order.vendor_city,
            state: order.vendor_state
          },
          orders: []
        };
      }
      acc[vendorId].orders.push(order);
      return acc;
    }, {});

    return Object.values(groupedOrders);
  } catch (error) {
    throw error;
  }
};

// Testimonial functions
export const getTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const createTestimonial = async (testimonialData: Partial<Testimonial>): Promise<Testimonial> => {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .insert([testimonialData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateTestimonial = async (id: string, testimonialData: Partial<Testimonial>): Promise<Testimonial> => {
  try {
    // Sanitize payload: remove readonly or nested fields that don't exist as columns
    const sanitizedData: any = { ...testimonialData };
    ['id', 'created_at', 'updated_at'].forEach((k) => delete sanitizedData[k]);

    const { data, error } = await supabase
      .from('testimonials')
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Delivery Area functions
export const getDeliveryAreas = async (): Promise<DeliveryArea[]> => {
  try {
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('*')
      .order('pincode', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const createDeliveryArea = async (areaData: Partial<DeliveryArea>): Promise<DeliveryArea> => {
  try {
    const { data, error } = await supabase
      .from('delivery_areas')
      .insert([areaData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateDeliveryArea = async (id: string, areaData: Partial<DeliveryArea>): Promise<DeliveryArea> => {
  try {
    const { data, error } = await supabase
      .from('delivery_areas')
      .update(areaData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteDeliveryArea = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('delivery_areas')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// This function is already defined above - removing duplicate

// Update payment schedule
export const updatePaymentSchedule = async (paymentMethod: string, scheduleData: {
  schedule_enabled: boolean;
  schedule_from_date?: string | null;
  schedule_to_date?: string | null;
  schedule_timezone?: string;
}): Promise<void> => {
  try {
    // Use backend API instead of direct Supabase call
    const { updatePaymentConfig: updateConfig } = await import('./api-admin');
    await updateConfig(paymentMethod, scheduleData);
  } catch (error) {
    console.error('Error updating payment schedule:', error);
    throw error;
  }
};

// Get active payment methods based on schedule
export const getActivePaymentMethods = async (): Promise<PaymentConfig[]> => {
  try {
    // Use backend API instead of direct Supabase call
    const { fetchPaymentConfigs } = await import('./api-admin');
    const configs = await fetchPaymentConfigs();
    // Filter to only enabled ones and sort by primary
    return configs
      .filter(config => config.is_enabled)
      .sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return 0;
      });
  } catch (error) {
    console.error('Error fetching active payment methods:', error);
    return [];
  }
};

// Check if a specific payment method is currently active
export const isPaymentMethodActive = async (paymentMethod: string): Promise<boolean> => {
  try {
    // Use backend API instead of direct Supabase call
    const { fetchPaymentConfigs } = await import('./api-admin');
    const configs = await fetchPaymentConfigs();
    const config = configs.find(c => c.payment_method === paymentMethod);
    return config ? config.is_enabled : false;
  } catch (error) {
    console.error('Error checking payment method active status:', error);
    return false;
  }
};

// Settings functions
export const getSettings = async (key: string): Promise<{ value: any } | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    return null;
  }
};

export const updateSettings = async (key: string, value: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert([{ key, value }], { onConflict: 'key' });

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Function to update contact info with correct phone number
export const updateContactInfo = async (): Promise<void> => {
  try {
    const contactInfo = {
      email: 'info@omaguva.com',
      phone: '+91 7680041607',
      whatsapp: '917680041607',
      address: 'Hyderabad\nTelangana, India'
    };

    const { error } = await supabase
      .from('settings')
      .upsert([{ key: 'contact_info', value: contactInfo }], { onConflict: 'key' });

    if (error) {
      throw error;
    }
    
  } catch (error) {
    throw error;
  }
};

// Contact form submission
export const submitContactForm = async (formData: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> => {
  try {
    const { error } = await supabase
      .from('contact_submissions')
      .insert([formData]);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Image upload functions
// Helper to convert a File to a data URL in the browser
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
};

// Prefer using the Edge Function 'upload-images' which uses the service role key
// This avoids client-side RLS issues when uploading to storage.
export const uploadProductImage = async (file: File, folder: string = 'products'): Promise<string> => {
  // If running in browser, convert to data URL and call the edge function
  if (typeof window !== 'undefined' && supabase.functions) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const payload = {
        files: [{ name: file.name, data: dataUrl, type: file.type }],
        folder
      };

      const { data, error } = await supabase.functions.invoke<any>('upload-images', {
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) {
        throw error;
      }

      const json = data as any;
      if (json && json.success && Array.isArray(json.urls) && json.urls.length > 0) {
        return json.urls[0];
      }

      const errMsg = json && json.error ? json.error : 'Unknown upload error from edge function';
      throw new Error(errMsg);
    } catch (err) {
      // fall through to attempt direct upload below as a fallback
    }
  }

  // Direct upload to storage (fallback)
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `products/${fileName}`;


    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    throw error;
  }
};

export const uploadMultipleImages = async (files: File[], folder: string = 'products'): Promise<string[]> => {
  // If possible, use the edge function in batch
  if (typeof window !== 'undefined' && supabase.functions) {
    try {
      const fileDataPromises = files.map(async (file) => ({ name: file.name, data: await fileToDataUrl(file), type: file.type }));
      const fileData = await Promise.all(fileDataPromises);
      const payload = { files: fileData, folder };
      const { data, error } = await supabase.functions.invoke<any>('upload-images', {
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      });
      if (error) throw error;
      const json = data as any;
      if (json && json.success && Array.isArray(json.urls)) {
        return json.urls;
      }
      throw new Error(json && json.error ? json.error : 'Unknown upload error from edge function');
    } catch (err) {
      // fallthrough to per-file fallback
    }
  }

  // Fallback to per-file direct upload
  try {
    const uploadPromises = files.map(file => uploadProductImage(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    throw error;
  }
};

// Pincode functions
export const validatePincode = (pincode: string): boolean => {
  return /^\d{6}$/.test(pincode);
};

export const getPincodeDetails = async (pincode: string): Promise<Pincode | null> => {
  try {
    const { data, error } = await supabase
      .from('pincodes')
      .select('*')
      .eq('pincode', pincode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    return null;
  }
};

export const isPincodeServiceable = async (pincode: string): Promise<boolean> => {
  try {
    const details = await getPincodeDetails(pincode);
    return details?.delivery === 'Yes';
  } catch (error) {
    return false;
  }
};

export const searchPincodes = async (searchTerm: string, limit: number = 10): Promise<PincodeSearchResult[]> => {
  try {
    const { data, error } = await supabase
      .from('pincodes')
      .select('pincode, office_name, district, state, delivery')
      .or(`office_name.ilike.%${searchTerm}%,district.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const getStatesWithPincodeCoverage = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('pincodes')
      .select('state')
      .not('state', 'is', null);

    if (error) {
      throw error;
    }

    const uniqueStates = [...new Set((data || []).map(item => item.state))];
    return uniqueStates.sort();
  } catch (error) {
    throw error;
  }
};

// Delivery Pincode functions (simplified table)
export const validateDeliveryPincode = (pincode: string): boolean => {
  return /^\d{6}$/.test(pincode);
};

// This function is already defined above - removing duplicate

export const isDeliveryPincodeAvailable = async (pincode: string): Promise<boolean> => {
  try {
    const details = await getDeliveryPincodeDetails(pincode);
    return details !== null;
  } catch (error) {
    return false;
  }
};

export const searchDeliveryPincodes = async (searchTerm: string, limit: number = 10): Promise<DeliveryPincodeDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('delivery_pincodes')
      .select('*')
      .or(`area.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const getDeliveryStates = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('delivery_pincodes')
      .select('state')
      .not('state', 'is', null);

    if (error) {
      throw error;
    }

    const uniqueStates = [...new Set((data || []).map(item => item.state))];
    return uniqueStates.sort();
  } catch (error) {
    throw error;
  }
};

export const getDeliveryCitiesByState = async (stateName: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('delivery_pincodes')
      .select('city')
      .eq('state', stateName)
      .not('city', 'is', null);

    if (error) {
      throw error;
    }

    const uniqueCities = [...new Set((data || []).map(item => item.city))];
    return uniqueCities.sort();
  } catch (error) {
    throw error;
  }
};

export const createDeliveryPincode = async (pincodeData: Partial<DeliveryPincode>): Promise<{ success: boolean; data: any }> => {
  try {
    const { data, error } = await supabase
      .from('delivery_pincodes')
      .insert([pincodeData])
      .select()
      .single();

    if (error) {
      return { success: false, data: error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, data: error };
  }
};

export const updateDeliveryPincode = async (pincode: string, pincodeData: Partial<DeliveryPincode>): Promise<{ success: boolean; data: any }> => {
  try {
    const { data, error } = await supabase
      .from('delivery_pincodes')
      .update(pincodeData)
      .eq('pincode', pincode)
      .select()
      .single();

    if (error) {
      return { success: false, data: error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, data: error };
  }
};

export const deleteDeliveryPincode = async (pincode: string): Promise<{ success: boolean; data: any }> => {
  try {
    const { error } = await supabase
      .from('delivery_pincodes')
      .delete()
      .eq('pincode', pincode);

    if (error) {
      return { success: false, data: error };
    }

    return { success: true, data: null };
  } catch (error) {
    return { success: false, data: error };
  }
};

// Homepage sections functions
export const getHomepageSections = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('homepage_sections')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const updateHomepageSection = async (id: string, sectionData: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from('homepage_sections')
      .update(sectionData)
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Blog functions
export const getBlogPosts = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const createBlogPost = async (postData: any): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([postData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateBlogPost = async (id: string, postData: any): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(postData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteBlogPost = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Authentication functions
export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function sendPasswordReset(email: string) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://omaguva.com/reset-password',
  });
}

export async function updatePassword(newPassword: string) {
  return await supabase.auth.updateUser({ password: newPassword });
}

export function getUser() {
  return supabase.auth.getUser();
}

// Enhanced order confirmation email service
export const sendOrderConfirmationEmail = async (orderData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  items: Array<{
    name: string;
    color: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: string;
  paymentMethod: string;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-order-confirmation', {
      body: orderData
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Payment failure email service
export const sendPaymentFailureEmail = async (failureData: {
  customerName: string;
  customerEmail: string;
  orderId: string;
  amount: number;
  failureReason: string;
  retryLink: string;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-payment-failure', {
      body: failureData
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export async function uploadResume(file: File, userId: string) {
  const fileExt = file.name.split('.').pop();
  const filePath = `resumes/${userId}/${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('resumes')
    .upload(filePath, file);
  if (error) throw error;
  return data?.path || '';
}

interface JobApplicationData {
  userId: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
}

export async function applyForJob({ userId, jobId, name, email, phone, resumeUrl }: JobApplicationData) {
  const { data, error } = await supabase
    .from('job_applications')
    .insert([
      { user_id: userId, job_id: jobId, name, email, phone, resume_url: resumeUrl }
    ]);
  if (error) throw error;
  return data;
}

// Payment Configuration Types
export interface PaymentConfig {
  id: string;
  payment_method: string;
  is_enabled: boolean;
  is_primary: boolean;
  display_name: string;
  description?: string;
  configuration: any;
  encrypted_keys?: Record<string, any>;
  schedule_enabled?: boolean;
  schedule_from_date?: string;
  schedule_to_date?: string;
  schedule_timezone?: string;
  created_at: string;
  updated_at: string;
}


// Payment Configuration Functions
export const getPaymentConfigs = async (): Promise<PaymentConfig[]> => {
  try {
    // Use backend API instead of direct Supabase call
    const { fetchPaymentConfigs } = await import('./api-admin');
    const configs = await fetchPaymentConfigs();
    if (configs && configs.length > 0) {
      return configs;
    }
    // Return fallback configurations if no data
    return [
        {
          id: 'phonepe-fallback',
          payment_method: 'phonepe',
          is_enabled: true,
          is_primary: true,
          display_name: 'PhonePe',
          description: 'PhonePe UPI and wallet payments',
          configuration: { "supports_upi": true, "supports_wallet": true, "supports_cards": true },
          encrypted_keys: {
            encrypted_data: {
              clientId: 'SU2509051710184980134621',
              clientSecret: 'ad3291bf-7400-4818-83a4-1cd8038ab515',
              environment: 'production'
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'easebuzz-fallback',
          payment_method: 'easebuzz',
          is_enabled: false,
          is_primary: false,
          display_name: 'Easebuzz',
          description: 'Easebuzz payment gateway with multiple options',
          configuration: { "supports_upi": true, "supports_cards": true, "supports_netbanking": true, "supports_wallets": true },
          encrypted_keys: {
            encrypted_data: {
              merchantKey: 'UHKRL9TONR',
              salt: 'KXAS1C8V2H',
              environment: 'prod',
              useLegacyEndpoint: 'true'
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
  } catch (error) {
    console.error('Error fetching payment configs:', error);
    // Return fallback configurations on any error
    return [
      {
        id: 'phonepe-fallback',
        payment_method: 'phonepe',
        is_enabled: true,
        is_primary: true,
        display_name: 'PhonePe',
        description: 'PhonePe UPI and wallet payments',
        configuration: { "supports_upi": true, "supports_wallet": true, "supports_cards": true },
        encrypted_keys: {
          encrypted_data: {
            clientId: 'SU2509051710184980134621',
            clientSecret: 'ad3291bf-7400-4818-83a4-1cd8038ab515',
            environment: 'production'
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'easebuzz-fallback',
        payment_method: 'easebuzz',
        is_enabled: false,
        is_primary: false,
        display_name: 'Easebuzz',
        description: 'Easebuzz payment gateway with multiple options',
        configuration: { "supports_upi": true, "supports_cards": true, "supports_netbanking": true, "supports_wallets": true },
        encrypted_keys: {
          encrypted_data: {
            merchantKey: 'UHKRL9TONR',
            salt: 'KXAS1C8V2H',
            environment: 'prod',
            useLegacyEndpoint: 'true'
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }
};

export const getEnabledPaymentMethods = async (): Promise<PaymentConfig[]> => {
  try {
    // Use backend API instead of direct Supabase call
    const { fetchPaymentConfigs } = await import('./api-admin');
    const configs = await fetchPaymentConfigs();
    // Filter to only enabled ones
    return configs.filter(config => config.is_enabled);
  } catch (error) {
    console.error('Error fetching enabled payment methods:', error);
    return [];
  }
};

export const getPrimaryPaymentMethod = async (): Promise<PaymentConfig | null> => {
  try {
    // Use backend API instead of direct Supabase call
    const { fetchPaymentConfigs } = await import('./api-admin');
    const configs = await fetchPaymentConfigs();
    // Find primary and enabled payment method
    const primary = configs.find(config => config.is_primary && config.is_enabled);
    if (primary) {
      return primary;
    }
    
    // No primary payment method found, return fallback
    return {
      id: 'phonepe-fallback',
      payment_method: 'phonepe',
      is_enabled: true,
      is_primary: true,
      display_name: 'PhonePe',
      description: 'PhonePe UPI and wallet payments',
      configuration: { "supports_upi": true, "supports_wallet": true, "supports_cards": true },
      encrypted_keys: {
        encrypted_data: {
          clientId: 'SU2509051710184980134621',
          clientSecret: 'ad3291bf-7400-4818-83a4-1cd8038ab515',
          environment: 'production'
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in getPrimaryPaymentMethod:', error);
    return null;
  }
};

export const updatePaymentConfig = async (id: string, configData: Partial<PaymentConfig>): Promise<PaymentConfig> => {
  try {
    // Use backend API instead of direct Supabase call
    const { updatePaymentConfig: updateConfig, fetchPaymentConfigs } = await import('./api-admin');
    // Backend API uses payment_method, not id - need to find payment_method from id
    let paymentMethod = (configData as any).payment_method;
    if (!paymentMethod && id) {
      const configs = await fetchPaymentConfigs();
      const config = configs.find(c => c.id === id);
      if (config) {
        paymentMethod = config.payment_method;
      }
    }
    if (!paymentMethod) {
      throw new Error('payment_method is required');
    }
    return await updateConfig(paymentMethod, configData);
  } catch (error) {
    console.error('Error updating payment config:', error);
    throw error;
  }
};

export const togglePaymentMethod = async (paymentMethod: string, isEnabled: boolean): Promise<PaymentConfig | null> => {
  try {
    // Use backend API instead of direct Supabase call
    const { togglePaymentMethod: toggleMethod } = await import('./api-admin');
    return await toggleMethod(paymentMethod, isEnabled);
  } catch (error) {
    console.error('Error toggling payment method:', error);
    throw error;
  }
};

export const createPaymentConfig = async (paymentMethod: string, configData: Partial<PaymentConfig>): Promise<PaymentConfig> => {
  try {
    const defaultConfig = {
      payment_method: paymentMethod,
      is_enabled: false,
      is_primary: false,
      display_name: paymentMethod === 'phonepe' 
        ? 'PhonePe' 
        : paymentMethod === 'easebuzz' 
          ? 'Easebuzz' 
          : paymentMethod === 'zohopay'
            ? 'Zoho Pay'
            : paymentMethod,
      description: paymentMethod === 'phonepe' 
        ? 'PhonePe UPI and wallet payments' 
        : paymentMethod === 'easebuzz' 
          ? 'Easebuzz payment gateway with multiple options' 
          : paymentMethod === 'zohopay'
            ? 'Zoho Pay UPI/Cards/NetBanking'
            : `${paymentMethod} payment gateway`,
      configuration: {},
      encrypted_keys: {},
      admin_password_hash: null,
      ...configData
    };

    // Use backend API instead of direct Supabase call
    const { createPaymentConfig } = await import('./api-admin');
    return await createPaymentConfig(defaultConfig);
  } catch (error) {
    throw error;
  }
};

export const setPrimaryPaymentMethod = async (paymentMethod: string): Promise<PaymentConfig | null> => {
  try {
    // Use backend API instead of direct Supabase call
    const { setPrimaryPaymentMethod: setPrimary } = await import('./api-admin');
    return await setPrimary(paymentMethod);
  } catch (error) {
    console.error('Error setting primary payment method:', error);
    throw error;
  }
};

// Update payment gateway keys (requires admin password verification)
export const updatePaymentGatewayKeys = async (
  paymentMethod: string, 
  keys: Record<string, any>, 
  adminPassword: string
): Promise<boolean> => {
  try {
    // Verify admin password first
    const { verifyAdminPassword } = await import('@/lib/admin-auth');
    const isValidPassword = await verifyAdminPassword(adminPassword);
    
    if (!isValidPassword) {
      throw new Error('Invalid admin password');
    }

    // TODO: Encryption should be handled by backend
    // For now, store keys directly (backend should handle encryption)
    // Update the payment config with encrypted keys via backend API
    const { updatePaymentConfig: updateConfig } = await import('./api-admin');
    await updateConfig(paymentMethod, { 
      encrypted_keys: keys, // Backend should encrypt this
      updated_at: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Get payment gateway keys (requires admin password verification)
export const getPaymentGatewayKeys = async (
  paymentMethod: string, 
  adminPassword: string
): Promise<Record<string, any> | null> => {
  try {
    // Verify admin password first
    const { verifyAdminPassword } = await import('@/lib/admin-auth');
    const isValidPassword = await verifyAdminPassword(adminPassword);
    
    if (!isValidPassword) {
      throw new Error('Invalid admin password');
    }

    // Get the encrypted keys via backend API
    const { fetchPaymentConfigs } = await import('./api-admin');
    const configs = await fetchPaymentConfigs();
    const config = configs.find(c => c.payment_method === paymentMethod);
    if (!config || !config.encrypted_keys) {
      return null;
    }
    const data = { encrypted_keys: config.encrypted_keys };

    // Decrypt the keys
    const { data: decryptedData, error: decryptError } = await supabase.rpc('decrypt_payment_keys', {
      encrypted_data: data.encrypted_keys
    });

    if (decryptError) {
      throw decryptError;
    }

    return decryptedData;
  } catch (error) {
    throw error;
  }
};
