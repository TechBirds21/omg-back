import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Stock utility functions
export interface ProductStock {
  color_stock?: { color: string; stock: number }[]
  total_stock?: number
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock'
}

/**
 * Get stock for a specific color variant
 */
export function getColorStock(product: ProductStock, color: string): number {
  // For dress products with color_size_stock, calculate total stock for the color
  if ((product as any).color_size_stock && (product as any).color_size_stock.length > 0) {
    const colorVariant = (product as any).color_size_stock.find((variant: any) => variant.color === color);
    if (colorVariant && colorVariant.sizes && colorVariant.sizes.length > 0) {
      return colorVariant.sizes.reduce((sum: number, sizeItem: any) => sum + (sizeItem.stock || 0), 0);
    }
    return 0;
  }
  
  // For regular products, use color_stock
  if (!product.color_stock || product.color_stock.length === 0) {
    return product.total_stock || 0
  }
  
  const colorStock = product.color_stock.find(cs => cs.color === color)
  return colorStock?.stock || 0
}

/**
 * Check if a specific color variant is in stock
 */
export function isColorInStock(product: ProductStock, color: string): boolean {
  return getColorStock(product, color) > 0
}

/**
 * Check if the entire product is sold out (all variants)
 */
export function isProductSoldOut(product: ProductStock): boolean {
  // For dress products with color_size_stock, calculate total stock first
  if ((product as any).color_size_stock && (product as any).color_size_stock.length > 0) {
    const totalStock = calculateTotalStockFromColorSizeStock((product as any).color_size_stock);
    return totalStock === 0;
  }
  
  // If color_stock exists, check if all colors are out of stock
  if (product.color_stock && product.color_stock.length > 0) {
    return product.color_stock.every(cs => cs.stock === 0)
  }
  
  // Check total_stock
  if ((product.total_stock || 0) === 0) {
    return true;
  }
  
  // Finally check stock_status as fallback
  return product.stock_status === 'out_of_stock';
}

/**
 * Calculate total stock from color_size_stock data (for dress products)
 */
export function calculateTotalStockFromColorSizeStock(colorSizeStock: Array<{ color: string; sizes: Array<{ size: string; stock: number }> }>): number {
  if (!colorSizeStock || colorSizeStock.length === 0) {
    return 0;
  }
  
  let totalStock = 0;
  colorSizeStock.forEach(colorVariant => {
    if (colorVariant.sizes && colorVariant.sizes.length > 0) {
      colorVariant.sizes.forEach(sizeVariant => {
        totalStock += sizeVariant.stock || 0;
      });
    }
  });
  
  return totalStock;
}

/**
 * Get the correct total stock for any product (handles both regular and dress products)
 */
export function getProductTotalStock(product: any): number {
  // For dress products with color_size_stock, calculate from that
  if (product.color_size_stock && product.color_size_stock.length > 0) {
    return calculateTotalStockFromColorSizeStock(product.color_size_stock);
  }
  
  // For regular products, use total_stock or calculate from color_stock
  if (product.color_stock && product.color_stock.length > 0) {
    return product.color_stock.reduce((sum: number, cs: any) => sum + (cs.stock || 0), 0);
  }
  
  // Fallback to total_stock
  return product.total_stock || 0;
}

/**
 * Check if product has low stock
 */
export function isProductLowStock(product: ProductStock): boolean {
  // For dress products with color_size_stock, calculate total stock first
  if ((product as any).color_size_stock && (product as any).color_size_stock.length > 0) {
    const totalStock = calculateTotalStockFromColorSizeStock((product as any).color_size_stock);
    return totalStock > 0 && totalStock <= 5;
  }
  
  // If color_stock exists, calculate total stock from it
  if (product.color_stock && product.color_stock.length > 0) {
    const totalStock = product.color_stock.reduce((sum, cs) => sum + (cs.stock || 0), 0);
    return totalStock > 0 && totalStock <= 5;
  }
  
  // Check total_stock
  const totalStock = product.total_stock || 0;
  if (totalStock > 0 && totalStock <= 5) {
    return true;
  }
  
  // Finally check stock_status as fallback
  return product.stock_status === 'low_stock';
}

/**
 * Return a safe image URL (fallback to placeholder if missing)
 */
export function getSafeImageUrl(url?: string): string {
  if (!url) return 'https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg'
  return url
}

/**
 * Generate an optimized (resized/compressed) image URL for Supabase Storage public URLs.
 * Falls back to the original URL if transformation is not applicable.
 */
export function getOptimizedImageUrl(url: string, width: number, quality: number = 75): string {
  if (!url) return url
  try {
    const u = new URL(url)
    // Only transform Supabase storage public URLs
    if (u.pathname.includes('/storage/v1/object/public/')) {
      // Convert to render endpoint for resizing: /storage/v1/render/image/public/...
      u.pathname = u.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      u.searchParams.set('width', String(width))
      u.searchParams.set('quality', String(quality))
      return u.toString()
    }
    return url
  } catch {
    return url
  }
}
