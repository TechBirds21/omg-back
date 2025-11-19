/**
 * Image configuration - centralized image URLs
 * Replace Supabase storage URLs with Cloudflare R2 or other CDN URLs
 */

// Default logo/image URL - can be overridden via environment variable
export const DEFAULT_LOGO_URL = import.meta.env.VITE_DEFAULT_LOGO_URL || 
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80';

// Default product image URL
export const DEFAULT_PRODUCT_IMAGE = import.meta.env.VITE_DEFAULT_PRODUCT_IMAGE || 
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80';

