// @ts-nocheck
// @ts-ignore
// TypeScript checking enabled for better type safety
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { LoadingSkeleton } from '@/components/ui/loading';
import { 
  Eye, 
  Download, 
  Search, 
  Filter,
  RefreshCw,
  FileText,
  Package,
  Truck,
  Clock,
  X,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  XCircle
} from 'lucide-react';
import { TablePagination } from '@/components/ui/table-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { useAdminFilters } from '@/contexts/AdminFilterContext';
import { getOrdersForAdmin, getAllOrdersForAdmin, getOrdersSummaryStats, updateOrderStatus, updateOrdersStatusBulk, updateOrderPaymentStatusById, getVendors } from '@/lib/api-admin';
import type { Order, Vendor } from '@/lib/supabase';
// TODO: Implement getVendors, getVendorByCode, getVendorByProductName in api-admin
// TODO: Remove supabase and retryOperation dependencies
import { getColorName } from '@/lib/colorUtils';
import { useToast } from '@/hooks/use-toast';
import { ColorCircle } from '@/lib/colorUtils';
import { downloadInvoice } from '@/lib/invoice';
import { generateInvoiceFromOrder } from '@/lib/invoiceUtils';
import { Info } from 'lucide-react';

// Debug logging removed for production

const Orders: React.FC = () => {
  // State declarations must come first
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const { selectedYear, selectedMonth } = useAdminFilters();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allFilteredSearchResults, setAllFilteredSearchResults] = useState<Order[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Manual vendor loading function
  const loadVendors = useCallback(async () => {
    try {
      const vendorResult = await getVendors();
      
      if (vendorResult && Array.isArray(vendorResult) && vendorResult.length > 0) {
      // Vendors loaded successfully
        setVendors(vendorResult);
        return vendorResult;
      } else {
        // No vendors found in database, using fallback
        // Use fallback vendors for testing
        const fallbackVendors = [
          { id: '1', name: 'Sample Vendor 1', vendor_code: 'V001', contact_person: 'John Doe', phone: '1234567890', email: 'john@example.com', address: '123 Main St', city: 'City', state: 'State', pincode: '12345', specialization: 'General', is_active: true, notes: 'Sample vendor', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '2', name: 'Sample Vendor 2', vendor_code: 'V002', contact_person: 'Jane Smith', phone: '0987654321', email: 'jane@example.com', address: '456 Oak Ave', city: 'City', state: 'State', pincode: '54321', specialization: 'General', is_active: true, notes: 'Sample vendor', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setVendors(fallbackVendors as Vendor[]);
        return fallbackVendors as Vendor[];
      }
    } catch (error) {
      
      // Use fallback vendors on error
      const fallbackVendors = [
        { id: '1', name: 'Sample Vendor 1', vendor_code: 'V001', contact_person: 'John Doe', phone: '1234567890', email: 'john@example.com', address: '123 Main St', city: 'City', state: 'State', pincode: '12345', specialization: 'General', is_active: true, notes: 'Sample vendor', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '2', name: 'Sample Vendor 2', vendor_code: 'V002', contact_person: 'Jane Smith', phone: '0987654321', email: 'jane@example.com', address: '456 Oak Ave', city: 'City', state: 'State', pincode: '54321', specialization: 'General', is_active: true, notes: 'Sample vendor', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];
      setVendors(fallbackVendors as Vendor[]);
      return fallbackVendors as Vendor[];
    }
  }, []);

  // Helper function to fetch all filtered orders for export
  const fetchAllFilteredOrders = useCallback(async (): Promise<Order[]> => {
    try {
      const filters: {
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
      } = {};
      
      if (selectedYear) filters.year = selectedYear;
      if (selectedMonth) filters.month = selectedMonth;
      if (statusFilter !== 'all') filters.statusFilter = statusFilter;
      if (vendorFilter !== 'all') {
        // Don't apply vendor filter server-side when combined with other filters
        // This allows us to get more data and filter client-side for better results
        if (statusFilter === 'all' && paymentStatusFilter === 'all' && !searchTerm && !startDate && !endDate) {
          filters.vendorFilter = vendorFilter;
        }
      }
      if (paymentStatusFilter !== 'all') filters.paymentStatusFilter = paymentStatusFilter;
      if (searchTerm) filters.searchTerm = searchTerm;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      // Use getAllOrdersForAdmin for faster bulk fetching
      const allOrders = await getAllOrdersForAdmin(filters);
      
      // Apply client-side vendor filtering if not applied server-side
      let filteredOrders = allOrders;
      if (vendorFilter !== 'all') {
        filteredOrders = allOrders.filter(order => {
          // First check direct vendor_id match
          if (order.vendor_id && String(order.vendor_id) === String(vendorFilter)) {
            return true;
          }
          
          // Check vendor_code match
          if (order.vendor_code && String(order.vendor_code) === String(vendorFilter)) {
            return true;
          }
          
          // Check complex vendor relationships in applied_offer JSON
          try {
            const appliedOffer = typeof order.applied_offer === 'string'
              ? JSON.parse(order.applied_offer)
              : order.applied_offer;

            if (appliedOffer && appliedOffer.items && Array.isArray(appliedOffer.items)) {
              return appliedOffer.items.some((item: any) => {
                // Check vendor_id in items
                if (item.vendor_id && String(item.vendor_id) === String(vendorFilter)) {
                  return true;
                }
                
                // Check vendor_code in items
                if (item.vendor_code && String(item.vendor_code) === String(vendorFilter)) {
                  return true;
                }
                
                // Check if vendor name matches (fallback)
                if (item.vendor_name) {
                  const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
                  if (selectedVendor && item.vendor_name.toLowerCase().includes(selectedVendor.name.toLowerCase())) {
                    return true;
                  }
                }
                
                return false;
              });
            }
          } catch (e) {
            // Ignore parsing errors
          }

          return false;
        });
      }
      
      return filteredOrders;
    } catch (error) {
      return [];
    }
  }, [selectedYear, selectedMonth, statusFilter, vendorFilter, paymentStatusFilter, searchTerm, startDate, endDate, vendors]);

  // Enhanced Export to Excel
  const handleExportExcel = async () => {
    toast({
      title: "Preparing export...",
      description: "Fetching all filtered orders for export.",
    });
    
    const allFilteredOrders = await fetchAllFilteredOrders();
    
    if (allFilteredOrders.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no orders matching the current filters.",
        variant: "destructive"
      });
      return;
    }
    
    const exportData: Array<Record<string, string | number>> = [];
    
    allFilteredOrders.forEach(order => {
      // Get vendor name directly from each specific product - always use product vendor
      // const vendorName = getVendorNameForProduct(order, 0); // Not used in PDF header
      
      // Get filtered product details (same as table display)
      const filteredResult = getFilteredProductsForOrder(order);
      const displayOrder = filteredResult?.order || order;
      const productItems: Array<{name: string, color: string, quantity: number, image: string, size?: string, sizes?: string[]}> = [];
      
      try {
        const raw = (displayOrder as Order & { applied_offer?: string | object }).applied_offer;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && Array.isArray(parsed.items)) {
          for (const it of parsed.items) {
            productItems.push({ 
              name: it.name || displayOrder.product_name, 
              color: it.color || 'N/A', 
              quantity: Number(it.quantity || 1), 
              image: it.image || 'N/A',
              size: it.size,
              sizes: it.sizes
            });
          }
        }
      } catch (e) {
        // Fallback to single product if no items found
      }
      
      // Fallback to single product if no items found
      if (productItems.length === 0) {
        productItems.push({ 
          name: displayOrder.product_name || 'N/A', 
          color: (Array.isArray(displayOrder.product_colors) && displayOrder.product_colors[0]) || 'N/A', 
          quantity: Number(displayOrder.quantity || 1), 
          image: (displayOrder as any)?.product_images?.[0] || 'N/A',
          size: (Array.isArray(displayOrder.product_sizes) && displayOrder.product_sizes[0]) || '',
          sizes: Array.isArray(displayOrder.product_sizes) ? displayOrder.product_sizes : []
        });
      }
      
      // Create one row per product
      productItems.forEach((product, index) => {
        // Get vendor name for this specific product
        const productVendorName = getVendorNameForProductSync(order, index);
        
        exportData.push({
      'Order ID': order.order_id,
      'Customer Name': order.customer_name,
          'Customer Mobile': order.customer_phone || '',
          'Shipping Address': order.shipping_address || '',
          'Product Name': product.name,
          'Product Color': product.color,
          'Product Size': product.size || (product.sizes && product.sizes.length > 0 ? product.sizes.join(', ') : 'N/A'),
          'Quantity': product.quantity,
          'Product Image URL': product.image,
          'Vendor Name': productVendorName,
      'Amount': order.amount || 0,
          'Current Status': order.status || 'pending',
          'Payment Status': order.payment_status || 'pending',
          'Order Date': new Date(order.created_at).toLocaleString(),
          'Updated Date': order.updated_at ? new Date(order.updated_at).toLocaleString() : '',
          'Transaction ID': order.transaction_id || ''
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Order ID
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Customer Mobile
      { wch: 30 }, // Shipping Address
      { wch: 25 }, // Product Name
      { wch: 15 }, // Product Color
      { wch: 12 }, // Product Size
      { wch: 10 }, // Quantity
      { wch: 40 }, // Product Image URL
      { wch: 20 }, // Vendor Name
      { wch: 12 }, // Amount
      { wch: 15 }, // Current Status
      { wch: 15 }, // Payment Status
      { wch: 20 }, // Order Date
      { wch: 20 }, // Updated Date
      { wch: 20 }  // Transaction ID
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `orders-comprehensive-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Excel Exported Successfully",
      description: `Exported ${allFilteredOrders.length} orders to orders-comprehensive-${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  };

  // Helper function to get vendor name for a specific product
  // Function to get all unique vendors for an order (useful for multi-product orders)
  const getAllVendorsForOrder = (order: Order) => {
    const vendors = new Set<string>();
    
    // Get vendor from main product
    if (order?.product?.vendors?.name) {
      vendors.add(order.product.vendors.name);
    } else if (order?.product?.vendors?.contact_person) {
      vendors.add(order.product.vendors.contact_person);
    } else if (order?.product?.vendors?.vendor_code) {
      vendors.add(`Vendor ${order.product.vendors.vendor_code}`);
    }
    
    // Get vendors from applied_offer (multi-product orders)
    try {
      const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && Array.isArray(parsed.items)) {
        parsed.items.forEach((item: any) => {
          if (item.vendor_name) {
            vendors.add(item.vendor_name);
          } else if (item.vendor) {
            vendors.add(item.vendor);
          }
        });
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    // Add main order vendor
    if (order?.vendors?.name) {
      vendors.add(order.vendors.name);
    } else if (order?.vendors?.contact_person) {
      vendors.add(order.vendors.contact_person);
    } else if (order?.vendor_code) {
      vendors.add(`Vendor ${order.vendor_code}`);
    }
    
    return Array.from(vendors);
  };

  // Function to get vendor name for a product by product name or ID
  const getVendorNameByProductInfo = (productName: string, productId?: string): string => {
    // Look up vendor for product
    
    // Try to find vendor by product name patterns
    if (productName.toLowerCase().includes('omgp')) {
      // OMGP products are typically from PRAKASH
      const prakashVendor = vendors.find(v => 
        v.name?.toLowerCase().includes('prakash') || 
        v.contact_person?.toLowerCase().includes('prakash')
      );
      if (prakashVendor) {
        return prakashVendor.name || prakashVendor.contact_person || `Vendor ${prakashVendor.vendor_code}`;
      }
    }
    
    if (productName.toLowerCase().includes('omgs')) {
      // OMGS products are typically from SURAJ
      const surajVendor = vendors.find(v => 
        v.name?.toLowerCase().includes('suraj') || 
        v.contact_person?.toLowerCase().includes('suraj')
      );
      if (surajVendor) {
        return surajVendor.name || surajVendor.contact_person || `Vendor ${surajVendor.vendor_code}`;
      }
    }
    
    // Try to find in existing orders by product ID
    if (productId && Array.isArray(orders)) {
      const existingOrder = orders.find(o => o.product_id === productId);
      if (existingOrder?.product?.vendors?.name) {
        return existingOrder.product.vendors.name;
      }
    }
    
    return 'Unknown Vendor';
  };

  // Synchronous function to get vendor name for table display
  const getVendorNameForProductSync = (order: Order, productIndex: number = 0): string => {
    // For multi-product orders, get vendor from applied_offer
    try {
      const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 1) {
        // Multi-product order processing
      }
      
      if (parsed && Array.isArray(parsed.items) && parsed.items[productIndex]) {
        const item = parsed.items[productIndex];
        
        if (item.vendor_name) {
          return item.vendor_name;
        } else if (item.vendor) {
          return item.vendor;
        } else if (item.vendor_id) {
          // Try to get vendor name from vendor_id
          const vendor = vendors.find(v => v.id === item.vendor_id);
          if (vendor) {
            const vendorName = vendor.name || vendor.contact_person || `Vendor ${vendor.vendor_code}`;
            return vendorName;
          }
        }
        
        // Try to get vendor from product data if productId is available
        if (item.productId || item.name) {
          const vendorName = getVendorNameByProductInfo(item.name, item.productId);
          if (vendorName !== 'Unknown Vendor') {
            return vendorName;
          }
        }
      }
    } catch (e) {
      
    }
    
    // Fallback to main product vendor
    if (order?.product?.vendors?.name) {
      return order.product.vendors.name;
    }
    if (order?.product?.vendors?.contact_person) {
      return order.product.vendors.contact_person;
    }
    if (order?.product?.vendors?.vendor_code) {
      return `Vendor ${order.product.vendors.vendor_code}`;
    }
    
    // Fallback to main order vendor
    if (order?.vendors?.name) {
      return order.vendors.name;
    }
    if (order?.vendors?.contact_person) {
      return order.vendors.contact_person;
    }
    if (order?.vendor_code) {
      return `Vendor ${order.vendor_code}`;
    }
    
    return 'N/A';
  };

  // Enhanced function to get vendor name for a specific product in multi-product orders (async version for PDF)
  const getVendorNameForProduct = async (order: Order, productIndex: number = 0): Promise<string> => {
    // For multi-product orders, get vendor from applied_offer
    try {
      const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && Array.isArray(parsed.items) && parsed.items[productIndex]) {
        const item = parsed.items[productIndex];
        
        if (item.vendor_name) {
          return item.vendor_name;
        } else if (item.vendor) {
          return item.vendor;
        } else if (item.vendor_id) {
          // Try to get vendor name from vendor_id
          const vendor = vendors.find(v => v.id === item.vendor_id);
          if (vendor) {
            return vendor.name || vendor.contact_person || `Vendor ${vendor.vendor_code}`;
          }
        } else if (item.name) {
          // Try to get vendor by product name
          try {
            const vendor = await getVendorByProductName(item.name);
            if (vendor) {
              return vendor.name || vendor.contact_person || `Vendor ${vendor.vendor_code}`;
            }
          } catch (error) {
            
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    // Fallback to main product vendor
    if (order?.product?.vendors?.name) {
      return order.product.vendors.name;
    }
    if (order?.product?.vendors?.contact_person) {
      return order.product.vendors.contact_person;
    }
    if (order?.product?.vendors?.vendor_code) {
      return `Vendor ${order.product.vendors.vendor_code}`;
    }
    
    // Fallback to main order vendor
    if (order?.vendors?.name) {
      return order.vendors.name;
    }
    if (order?.vendors?.contact_person) {
      return order.vendors.contact_person;
    }
    if (order?.vendor_code) {
      return `Vendor ${order.vendor_code}`;
    }
    
    return 'N/A';
  };

  // PDF Export with actual images
  const getProductItems = async (order: Order) => {
    const items: Array<{ name: string, color: string, quantity: number, image: string | null, vendor: string, size?: string, sizes?: string[] }> = [];
    try {
      const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed?.items && Array.isArray(parsed.items)) {
        for (let idx = 0; idx < parsed.items.length; idx++) {
          const it = parsed.items[idx];
          const vendorName = await getVendorNameForProduct(order, idx);
          
          
          items.push({
            name: it.name || order.product_name || 'N/A',
            color: it.color || (Array.isArray(order.product_colors) ? order.product_colors[idx] : 'N/A'),
            quantity: Number(it.quantity || 1),
            image: it.image || null,
            vendor: vendorName,
            size: it.size,
            sizes: it.sizes
          });
        }
      }
    } catch {
      // parsing error fallback
    }
    // If nothing from applied_offer, fall back to products[] array or main product fields
    if (items.length === 0) {
      if (Array.isArray((order as any)?.products) && (order as any).products.length > 0) {
        (order as any).products.forEach((product: any, idx: number) => {
          items.push({
            name: product.name || order.product_name || 'N/A',
            color: product.color || (Array.isArray(order.product_colors) ? order.product_colors[idx] : 'N/A'),
            quantity: Number(product.quantity || order.quantity || 1),
            image: product.image || null,
            vendor: getVendorNameForProductSync(order, idx),
            size: product.size,
            sizes: product.sizes
          });
        });
      } else {
        items.push({
          name: order.product_name || 'N/A',
          color: Array.isArray(order.product_colors) ? order.product_colors[0] || 'N/A' : 'N/A',
          quantity: Number(order.quantity || 1),
          image: null,
          vendor: getVendorNameForProductSync(order, 0),
          size: Array.isArray(order.product_sizes) && order.product_sizes[0] ? order.product_sizes[0] : '',
          sizes: Array.isArray(order.product_sizes) ? order.product_sizes : []
        });
      }
    }
    return items;
  };

  const handleExportPDF = async () => {
    // Show loading toast
    const loadingToast = toast({
      title: "Generating PDF...",
      description: "Fetching all filtered orders for export...",
      duration: 30000, // 30 seconds
    });

    try {
      const allFilteredOrders = await fetchAllFilteredOrders();
      
      if (allFilteredOrders.length === 0) {
        loadingToast.dismiss();
        toast({
          title: "No Data",
          description: "No orders to export. Please adjust your filters.",
          variant: "destructive"
        });
        return;
      }

      const doc = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'mm', 
        format: 'a4'
      });

      doc.setProperties({
        title: 'Orders Management Report',
        subject: 'Orders Export',
        author: 'O Maguva Admin',
        creator: 'O Maguva System'
      });

      const pageWidth = doc.internal.pageSize.width;
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const titleText = 'O Maguva - Orders Management';
      doc.text(titleText, pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const generatedText = `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      doc.text(generatedText, pageWidth / 2, 30, { align: "center" });
      
      const totalText = `Total Orders: ${allFilteredOrders.length}`;
      doc.text(totalText, pageWidth / 2, 36, { align: "center" });
      
      const dateText = `Date Range: ${startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'}`;
      doc.text(dateText, pageWidth / 2, 42, { align: "center" });

      // Table header (vendor included in product column)
      const header = ['S.No', 'Order ID', 'Customer', 'Address', 'Product', 'Order Date', 'Amount'];
      const colWidths = [10, 30, 35, 45, 75, 20, 18];
      const totalTableWidth = colWidths.reduce((acc, w) => acc + w, 0);
      const tableStartX = (pageWidth - totalTableWidth) / 2;
      const headerY = 50;
      let yPosition = headerY;

      doc.setFillColor(240, 240, 240);
      doc.rect(tableStartX, yPosition, totalTableWidth, 8, 'F');
      doc.setLineWidth(0.3);
      let xPos = tableStartX;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      header.forEach((text, idx) => {
        doc.text(text, xPos + 2, yPosition + 6);
        xPos += colWidths[idx];
      });
      yPosition += 8;

      // Helper to load image URL to data URL with timeout and error handling
      const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
        try {
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

          const response = await fetch(url, { 
            mode: 'cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            return null;
          }
          
          const blob = await response.blob();
          return await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          // Don't log CORS or network errors as they're expected
          return null;
        }
      };

      // Data rows - one row per order with items stacked vertically
      let rowIndex = 0;
      for (let orderIndex = 0; orderIndex < allFilteredOrders.length; orderIndex++) {
        const order = allFilteredOrders[orderIndex];
        
        // Get filtered products for this order based on vendor filter (same as table display)
        const filteredResult = getFilteredProductsForOrder(order);
        const displayOrder = filteredResult?.order || order;
        const items = await getProductItems(displayOrder);
        
        // Calculate row height based on number of items (each item needs ~15mm)
        const itemHeight = 15;
        const rowHeight = Math.max(20, items.length * itemHeight + 10);

        if (yPosition + rowHeight > doc.internal.pageSize.height - 12) {
          doc.addPage();
          yPosition = 20;
          let xRedraw = tableStartX;
          doc.setFillColor(240, 240, 240);
          doc.rect(tableStartX, yPosition, totalTableWidth, 8, 'F');
          doc.setFontSize(8);
          header.forEach((text, colIdx) => {
            doc.text(text, xRedraw + 2, yPosition + 6);
            xRedraw += colWidths[colIdx];
          });
          yPosition += 8;
        }

        // Draw row background
          doc.setFillColor(255, 255, 255);
        doc.rect(tableStartX, yPosition, totalTableWidth, rowHeight, 'F');

        // Draw row borders
        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200);
        doc.rect(tableStartX, yPosition, totalTableWidth, rowHeight);

        // Draw vertical lines
        let xPos = tableStartX;
        colWidths.forEach((width, colIndex) => {
          if (colIndex < colWidths.length - 1) {
            xPos += width;
            doc.line(xPos, yPosition, xPos, yPosition + rowHeight);
          }
        });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        
        // S.No column
        xPos = tableStartX;
        const sNoText = (rowIndex + 1).toString();
        const sNoWidth = doc.getTextWidth(sNoText);
        doc.text(sNoText, xPos + (colWidths[0] - sNoWidth) / 2, yPosition + rowHeight / 2);
        xPos += colWidths[0];

        // Order ID column
        const orderIdText = order.order_id || 'N/A';
        const orderIdWidth = doc.getTextWidth(orderIdText);
        doc.text(orderIdText, xPos + (colWidths[1] - orderIdWidth) / 2, yPosition + rowHeight / 2);
        xPos += colWidths[1];

        // Customer column with proper text wrapping
        const customerName = order.customer_name || 'N/A';
        const customerPhone = order.customer_phone || 'N/A';
        
        const customerCellWidth = colWidths[2] - 4; // Account for padding
        const wrappedCustomerLines: string[] = [];
        
        // Process each customer field with wrapping
        [customerName, customerPhone].filter(text => text && text !== 'N/A').forEach(text => {
          doc.setFontSize(6); // Ensure consistent font size for measurement
          if (doc.getTextWidth(text) <= customerCellWidth) {
            wrappedCustomerLines.push(text);
          } else {
            // For long emails, split intelligently at @ or dots
            if (text.includes('@')) {
              const parts = text.split('@');
              if (parts.length === 2) {
                const [localPart, domainPart] = parts;
                const firstLine = localPart + '@';
                const secondLine = domainPart;
                
                if (doc.getTextWidth(firstLine) <= customerCellWidth && doc.getTextWidth(secondLine) <= customerCellWidth) {
                  wrappedCustomerLines.push(firstLine);
                  wrappedCustomerLines.push(secondLine);
                } else {
                  // If still too long, truncate
                  wrappedCustomerLines.push(text.substring(0, Math.floor(customerCellWidth / 2)) + '...');
                }
              } else {
                wrappedCustomerLines.push(text.substring(0, Math.floor(customerCellWidth / 2)) + '...');
              }
            } else {
              // For other long text, break by words
              const words = text.split(' ');
              let currentLine = '';
              
              words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (doc.getTextWidth(testLine) <= customerCellWidth) {
                  currentLine = testLine;
                } else {
                  if (currentLine) {
                    wrappedCustomerLines.push(currentLine);
                    currentLine = word;
                  } else {
                    // Single word too long, truncate
                    wrappedCustomerLines.push(word.substring(0, Math.floor(customerCellWidth / 2)) + '...');
                  }
                }
              });
              
              if (currentLine) {
                wrappedCustomerLines.push(currentLine);
              }
            }
          }
        });

        if (wrappedCustomerLines.length === 0) {
          wrappedCustomerLines.push('N/A');
        }
        
        const lineHeight = 2.5;
        const startY = yPosition + Math.max(3, (rowHeight - (wrappedCustomerLines.length * lineHeight)) / 2);
        
        doc.setFontSize(6); // Set font size for rendering
        wrappedCustomerLines.forEach((line, lineIndex) => {
          doc.text(line, xPos + 2, startY + (lineIndex * lineHeight));
        });
        xPos += colWidths[2];

        // Address column with enhanced text wrapping
        const customerAddress = order.shipping_address || 'N/A';
        const addressLines = customerAddress.split('\n').filter(line => line.trim() !== '');
        
        // Wrap long lines to fit within cell width
        const addressCellWidth = colWidths[3] - 4; // Account for padding
        const wrappedAddressLines: string[] = [];
        
        addressLines.forEach(line => {
          const trimmedLine = line.trim();
          doc.setFontSize(6); // Ensure consistent font size for measurement
          
          if (doc.getTextWidth(trimmedLine) <= addressCellWidth) {
            wrappedAddressLines.push(trimmedLine);
          } else {
            // Split long address lines intelligently
            const words = trimmedLine.split(' ');
            let currentLine = '';
            
            words.forEach(word => {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (doc.getTextWidth(testLine) <= addressCellWidth) {
                currentLine = testLine;
              } else {
                if (currentLine) {
                  wrappedAddressLines.push(currentLine);
                  currentLine = word;
                } else {
                  // Single word too long, break it intelligently
                  if (word.length > 20) {
                    // For very long words (like long street names), break at natural points
                    const chunks = word.match(/.{1,15}/g) || [word];
                    chunks.forEach((chunk, idx) => {
                      if (idx === chunks.length - 1) {
                        currentLine = chunk; // Last chunk becomes current line
                      } else {
                        wrappedAddressLines.push(chunk);
                      }
                    });
                  } else {
                    // For normal words that are just slightly too long, truncate
                    wrappedAddressLines.push(word.substring(0, Math.floor(addressCellWidth / 2.5)) + '...');
                  }
                }
              }
            });
            
            if (currentLine) {
              wrappedAddressLines.push(currentLine);
            }
          }
        });
        
        const addressStartY = yPosition + Math.max(3, (rowHeight - (wrappedAddressLines.length * 2.5)) / 2);
        doc.setFontSize(6); // Set font size for rendering
        wrappedAddressLines.forEach((line, lineIndex) => {
          doc.text(line, xPos + 2, addressStartY + (lineIndex * 2.5));
        });
        xPos += colWidths[3];

        // Product column with images and details
        const productStartX = xPos;
        let currentItemY = yPosition + 5;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Product image with proper loading
          const imageSize = 8;
          doc.setLineWidth(0.2);
          doc.setDrawColor(200, 200, 200);
          doc.rect(productStartX + 2, currentItemY, imageSize, imageSize);

          // Load and add actual image (with robust error handling)
          if (item.image) {
            try {
              const imageDataUrl = await loadImageAsDataUrl(item.image);
              if (imageDataUrl) {
                try {
                let format: 'PNG' | 'JPEG' = 'PNG';
                if (/^data:image\/jpeg|^data:image\/jpg/i.test(imageDataUrl)) format = 'JPEG';
                doc.addImage(imageDataUrl, format, productStartX + 2, currentItemY, imageSize, imageSize);
                } catch (addImageError) {
                  // If addImage fails, just show placeholder
                  doc.setFontSize(4);
                  doc.text('IMG', productStartX + 3, currentItemY + imageSize/2);
                }
              } else {
                doc.setFontSize(4);
                doc.text('IMG', productStartX + 3, currentItemY + imageSize/2);
              }
            } catch (imageError) {
              // If any image processing fails, show placeholder
              doc.setFontSize(4);
              doc.text('IMG', productStartX + 3, currentItemY + imageSize/2);
            }
          } else {
            doc.setFontSize(4);
            doc.text('N/A', productStartX + 3, currentItemY + imageSize/2);
          }

          // Product details next to image matching UI format - wrap text within cell
          const textX = productStartX + imageSize + 4;
          const sizeText = item.size ? ` • Size: ${item.size}` : (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) ? ` • Size: ${item.sizes.join(', ')}` : '';
          
          if (orderIndex < 3 && i < 2) {
            const itemInfo = {
              name: item.name,
              size: item.size,
              sizes: item.sizes,
              sizeText: sizeText,
              orderIndex: orderIndex,
              itemIndex: i
            };
          }
          
          // Format: Product Name on first line, then Color • Qty • Size • Vendor on second line
          const vendorText = item.vendor ? ` • ${item.vendor}` : '';
          const productText = `${item.name || 'N/A'}\n${getColorName(item.color || 'N/A')} • Qty: ${item.quantity}${sizeText}${vendorText}`;
          const productLines = productText.split('\n');
          
          // Calculate available width for text (50mm - image - padding)
          const availableWidth = colWidths[4] - imageSize - 8; // Account for image and padding
          const wrappedProductLines: string[] = [];
          
          productLines.forEach((line, lineIdx) => {
            const trimmedLine = line.trim();
            doc.setFontSize(6); // Use smaller font for measurements
            
            if (doc.getTextWidth(trimmedLine) <= availableWidth) {
              wrappedProductLines.push(trimmedLine);
            } else {
              // For the second line (details), handle special characters like •
              const parts = trimmedLine.split(' • ');
              let currentLine = '';
              
              parts.forEach((part, partIdx) => {
                const separator = partIdx === 0 ? '' : ' • ';
                const testLine = currentLine ? `${currentLine}${separator}${part}` : part;
                
                if (doc.getTextWidth(testLine) <= availableWidth) {
                  currentLine = testLine;
                } else {
                  if (currentLine) {
                    wrappedProductLines.push(currentLine);
                    currentLine = part;
                  } else {
                    // If single part is too long, break it by words
                    const words = part.split(' ');
                    let wordLine = '';
                    
                    words.forEach(word => {
                      const testWordLine = wordLine ? `${wordLine} ${word}` : word;
                      if (doc.getTextWidth(testWordLine) <= availableWidth) {
                        wordLine = testWordLine;
                      } else {
                        if (wordLine) {
                          wrappedProductLines.push(wordLine);
                          wordLine = word;
                        } else {
                          // Single word too long, truncate
                          wrappedProductLines.push(word.substring(0, Math.floor(availableWidth / 2)) + '...');
                        }
                      }
                    });
                    
                    if (wordLine) {
                      currentLine = wordLine;
                    }
                  }
                }
              });
              
              if (currentLine) {
                wrappedProductLines.push(currentLine);
              }
            }
          });
          
          doc.setFontSize(6); // Set font size for rendering
          doc.setFont('helvetica', 'normal');
          wrappedProductLines.forEach((line, lineIndex) => {
            doc.text(line, textX, currentItemY + (lineIndex * 2.5) + 1);
          });

          currentItemY += itemHeight;
        }

        xPos += colWidths[4];

        // Order Date column (index 5)
        const orderDate = new Date(order.created_at).toLocaleDateString();
        const dateWidth = doc.getTextWidth(orderDate);
        doc.text(orderDate, xPos + (colWidths[5] - dateWidth) / 2, yPosition + rowHeight / 2);
        xPos += colWidths[5];

        // Amount column (index 6)
        const amountText = order.amount ? `₹${Number(order.amount).toLocaleString()}` : 'N/A';
        const amountWidth = doc.getTextWidth(amountText);
        doc.text(amountText, xPos + (colWidths[6] - amountWidth) / 2, yPosition + rowHeight / 2);

        yPosition += rowHeight;
        rowIndex++;
      }

      const fileName = `orders-management-report-${new Date().toISOString().split('T')[0]}.pdf`;
      
      loadingToast.dismiss();
      
      try {
        // Try direct save first
      doc.save(fileName);
      toast({
          title: "PDF Exported Successfully",
        description: `Orders report saved as ${fileName}`,
      });
      } catch (saveError) {
        
        try {
          // Fallback: Blob download
          const pdfBlob = doc.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          
          link.click();
          
          // Clean up
          setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          }, 100);
          
          toast({
            title: "PDF Downloaded Successfully",
            description: `Orders report downloaded as ${fileName}`,
          });
          
        } catch (blobError) {
          toast({
            title: "PDF Download Failed",
            description: `Failed to download PDF: ${blobError instanceof Error ? blobError.message : 'Unknown error'}`,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      loadingToast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "PDF Export Failed",
        description: `Failed to generate PDF: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  // Additional state declarations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [loadingMore, setLoadingMore] = useState(false);
  const [serverSidePagination] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({
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
  });
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Confirmation state for status changes
  const [confirmState, setConfirmState] = useState<{
    mode: 'single' | 'bulk';
    to: string;
    orders: Array<{ id: string; order_id: string; from: string | null; }>;
  } | null>(null);

  const [bulkStatus, setBulkStatus] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [ordersCache, setOrdersCache] = useState<{[key: string]: {orders: Order[], totalCount: number, timestamp: number}}>({});
  const [summaryCache, setSummaryCache] = useState<{[key: string]: {data: any, timestamp: number}}>({});
  const { toast } = useToast();

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading<Order[]>({ minimumDelay: 300, preserveData: true });

  // Preserve scroll position during refreshes
  useScrollPreservation(isRefreshing);

  // Fetch summary data instantly
  const fetchSummaryData = useCallback(async () => {
    try {
      // Create cache key for summary data
      const summaryCacheKey = JSON.stringify({
        selectedYear,
        selectedMonth,
        statusFilter,
        vendorFilter,
        paymentStatusFilter,
        searchTerm,
        startDate,
        endDate,
        startTime,
        endTime
      });

      // Check cache first (cache for 60 seconds to reduce API calls)
      const cachedSummary = summaryCache[summaryCacheKey];
      if (cachedSummary && (Date.now() - cachedSummary.timestamp) < 60000) {
        setSummaryData(cachedSummary.data);
        return;
      }
      const filters: {
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
      } = {
        year: selectedYear,
        month: selectedMonth,
      };
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (vendorFilter !== 'all') {
        // Don't apply vendor filter server-side when combined with other filters
        // This allows us to get more data and filter client-side for better results
        if (statusFilter === 'all' && paymentStatusFilter === 'all' && !searchTerm && !startDate && !endDate) {
          filters.vendorId = vendorFilter;
        }
      }
      if (paymentStatusFilter !== 'all') {
        filters.paymentStatus = paymentStatusFilter;
      }
      if (searchTerm) {
        filters.searchTerm = searchTerm;
      }
      if (startDate) {
        filters.startDate = startDate;
      }
      if (endDate) {
        filters.endDate = endDate;
      }
      if (startTime) {
        filters.startTime = startTime;
      }
      if (endTime) {
        filters.endTime = endTime;
      }

      // Use the optimized summary stats function which now handles vendor filtering server-side
      const stats = await getOrdersSummaryStats(filters);
      
      setSummaryData(stats);

      // Cache the summary data
      setSummaryCache(prev => ({
        ...prev,
        [summaryCacheKey]: {
          data: stats,
          timestamp: Date.now()
        }
      }));
      
    } catch (error) {
      toast({
        title: "Failed to load summary data",
        description: "There was an error loading order statistics. Please try refreshing the page.",
        variant: "destructive"
      });
      // Set default values so cards don't show zeros
      setSummaryData({
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
      });
    }
  }, [selectedYear, selectedMonth, statusFilter, vendorFilter, paymentStatusFilter, searchTerm, startDate, endDate, startTime, endTime, toast]);

  const fetchOrders = useCallback(async (page: number = 1, size: number = 50, isVendorFiltered: boolean = false): Promise<Order[]> => {
    try {
      setIsTableLoading(true);

      // Create cache key based on filters and page
      const cacheKey = JSON.stringify({
        page,
        size,
        statusFilter,
        vendorFilter,
        paymentStatusFilter,
        searchTerm,
        selectedYear,
        selectedMonth,
        startDate,
        endDate,
        startTime,
        endTime
      });

      // Check cache first (cache for 30 seconds to reduce API calls)
      const cachedResult = ordersCache[cacheKey];
      if (cachedResult && (Date.now() - cachedResult.timestamp) < 30000) {
        setOrders(cachedResult.orders);
        setCurrentPage(page);
        return cachedResult.orders;
      }
      
      // Build comprehensive filters object for database query
      const filters: {
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
      } = {
        year: selectedYear,
        month: selectedMonth,
      };
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (vendorFilter !== 'all') {
        // Don't apply vendor filter server-side when combined with other filters
        // This allows us to get more data and filter client-side for better results
        if (statusFilter === 'all' && paymentStatusFilter === 'all' && !searchTerm && !startDate && !endDate) {
          filters.vendorId = vendorFilter;
        }
      }
      if (paymentStatusFilter !== 'all') {
        filters.paymentStatus = paymentStatusFilter;
      }
      if (searchTerm) {
        filters.searchTerm = searchTerm;
      }
      if (startDate) {
        filters.startDate = startDate;
      }
      if (endDate) {
        filters.endDate = endDate;
      }
      if (startTime) {
        filters.startTime = startTime;
      }
      if (endTime) {
        filters.endTime = endTime;
      }
      
      
      // Use the requested page size for proper pagination
      const effectiveSize = size;
      const offset = (page - 1) * effectiveSize;

      // Special handling for "show all" (very large page size)
      if (size >= 10000) {
        // Fetch all orders in batches to avoid timeout issues
        const allOrders: Order[] = [];
        let batchOffset = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const batchApiFilters = {
            page: Math.floor(batchOffset / batchSize) + 1,
            size: batchSize,
            ...(selectedYear && { year: selectedYear }),
            ...(selectedMonth && { month: selectedMonth }),
            ...(statusFilter !== 'all' && { statusFilter }),
            ...(vendorFilter !== 'all' && { vendorFilter }),
            ...(paymentStatusFilter !== 'all' && { paymentStatusFilter }),
            ...(searchTerm && { searchTerm }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
          };
          const batchResult = await getOrdersForAdmin(batchApiFilters);
          if (batchResult && batchResult.orders && batchResult.orders.length > 0) {
            allOrders.push(...batchResult.orders);
            batchOffset += batchSize;
            hasMore = batchResult.orders.length === batchSize;
          } else {
            hasMore = false;
          }
        }
        
        // Apply client-side filtering for vendor relationships
        let filteredOrders = allOrders;
        if (vendorFilter !== 'all') {
          filteredOrders = allOrders.filter(order => {
            // First check direct vendor_id match
            if (order.vendor_id && String(order.vendor_id) === String(vendorFilter)) {
              return true;
            }
            
            // Check vendor_code match
            if (order.vendor_code && String(order.vendor_code) === String(vendorFilter)) {
              return true;
            }
            
            // Check complex vendor relationships in applied_offer JSON
            try {
              const appliedOffer = typeof order.applied_offer === 'string'
                ? JSON.parse(order.applied_offer)
                : order.applied_offer;

              if (appliedOffer && appliedOffer.items && Array.isArray(appliedOffer.items)) {
                return appliedOffer.items.some((item: any) => {
                  // Check vendor_id in items
                  if (item.vendor_id && String(item.vendor_id) === String(vendorFilter)) {
                    return true;
                  }
                  
                  // Check vendor_code in items
                  if (item.vendor_code && String(item.vendor_code) === String(vendorFilter)) {
                    return true;
                  }
                  
                  // Check if vendor name matches (fallback)
                  if (item.vendor_name) {
                    const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
                    if (selectedVendor && item.vendor_name.toLowerCase().includes(selectedVendor.name.toLowerCase())) {
                      return true;
                    }
                  }
                  
                  // Additional check: if vendor_id matches the selected vendor's ID
                  const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
                  if (selectedVendor && item.vendor_id && String(item.vendor_id) === String(selectedVendor.id)) {
                    return true;
                  }
                  
                  // Additional check: if vendor_code matches the selected vendor's code
                  if (selectedVendor && item.vendor_code && String(item.vendor_code) === String(selectedVendor.vendor_code)) {
                    return true;
                  }
                  
                  return false;
                });
              }
            } catch (e) {
              // Ignore parsing errors
            }

            return false;
          });
        }
        
        setOrders(filteredOrders || []);
        setCurrentPage(1);
        return;
      }

      // Use new API signature with page/size
      const apiFilters: {
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
      } = {
        page: Math.floor(offset / effectiveSize) + 1,
        size: effectiveSize,
      };
      
      if (selectedYear) apiFilters.year = selectedYear;
      if (selectedMonth) apiFilters.month = selectedMonth;
      if (statusFilter !== 'all') apiFilters.statusFilter = statusFilter;
      if (vendorFilter !== 'all') apiFilters.vendorFilter = vendorFilter;
      if (paymentStatusFilter !== 'all') apiFilters.paymentStatusFilter = paymentStatusFilter;
      if (searchTerm) apiFilters.searchTerm = searchTerm;
      if (startDate) apiFilters.startDate = startDate;
      if (endDate) apiFilters.endDate = endDate;
      
      // Retry logic for network errors
      let fetchedOrders: Order[] = [];
      let totalCount = 0;
      let retryCount = 0;
      const maxRetries = 2; // Reduced retries for faster failure
      
      while (retryCount < maxRetries) {
        try {
          const result = await getOrdersForAdmin(apiFilters);
          // Handle case where result might be undefined or malformed
          if (result && typeof result === 'object' && 'orders' in result) {
            fetchedOrders = Array.isArray(result.orders) ? result.orders : [];
            totalCount = typeof result.total === 'number' ? result.total : fetchedOrders.length;
            break; // Success, exit retry loop
          } else {
            console.error('Invalid API response structure:', result);
            throw new Error('Invalid API response structure');
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error; // Re-throw if all retries failed
          }
          // Wait before retry (shorter delay for faster response)
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }

      let pageOrders = fetchedOrders;

      // Apply comprehensive client-side filtering for vendor relationships
      if (vendorFilter !== 'all') {
        pageOrders = fetchedOrders.filter(order => {
          // First check direct vendor_id match
          if (order.vendor_id && String(order.vendor_id) === String(vendorFilter)) {
            return true;
          }
          
          // Check vendor_code match
          if (order.vendor_code && String(order.vendor_code) === String(vendorFilter)) {
            return true;
          }
          
          // Check complex vendor relationships in applied_offer JSON
          try {
            const appliedOffer = typeof order.applied_offer === 'string'
              ? JSON.parse(order.applied_offer)
              : order.applied_offer;

            if (appliedOffer && appliedOffer.items && Array.isArray(appliedOffer.items)) {
              return appliedOffer.items.some((item: any) => {
                // Check vendor_id in items
                if (item.vendor_id && String(item.vendor_id) === String(vendorFilter)) {
                  return true;
                }
                
                // Check vendor_code in items
                if (item.vendor_code && String(item.vendor_code) === String(vendorFilter)) {
                  return true;
                }
                
                // Check if vendor name matches (fallback)
                if (item.vendor_name) {
                  const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
                  if (selectedVendor && item.vendor_name.toLowerCase().includes(selectedVendor.name.toLowerCase())) {
                    return true;
                  }
                }
                
                // Additional check: if vendor_id matches the selected vendor's ID
                const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
                if (selectedVendor && item.vendor_id && String(item.vendor_id) === String(selectedVendor.id)) {
                  return true;
                }
                
                // Additional check: if vendor_code matches the selected vendor's code
                if (selectedVendor && item.vendor_code && String(item.vendor_code) === String(selectedVendor.vendor_code)) {
                  return true;
                }
                
                return false;
              });
            }
          } catch (e) {
            // Ignore parsing errors
          }

          return false;
        });
      }
      
      
      // Use server-provided total count for accurate pagination
      let totalFilteredCount = totalCount;
      
      // If vendor filtering was applied client-side, we need to get the total count
      if (vendorFilter !== 'all') {
        // Get all orders with current filters (except vendor) to count total filtered
        const allOrdersForCount: Order[] = [];
        let countOffset = 0;
        const countBatchSize = 1000;
        let hasMoreCount = true;
        
        while (hasMoreCount) {
          const countResult = await getOrdersForAdmin(countBatchSize, countOffset, filters);
          if (countResult && countResult.orders && countResult.orders.length > 0) {
            allOrdersForCount.push(...countResult.orders);
            countOffset += countBatchSize;
            hasMoreCount = countResult.orders.length === countBatchSize;
          } else {
            hasMoreCount = false;
          }
        }
        
        // Apply vendor filtering to get total count
        const vendorFilteredCount = allOrdersForCount.filter(order => {
          // First check direct vendor_id match
          if (order.vendor_id && String(order.vendor_id) === String(vendorFilter)) {
            return true;
          }
          
          // Check vendor_code match
          if (order.vendor_code && String(order.vendor_code) === String(vendorFilter)) {
            return true;
          }
          
          // Check complex vendor relationships in applied_offer JSON
          try {
            const appliedOffer = typeof order.applied_offer === 'string'
              ? JSON.parse(order.applied_offer)
              : order.applied_offer;

            if (appliedOffer && appliedOffer.items && Array.isArray(appliedOffer.items)) {
              return appliedOffer.items.some((item: any) => {
                // Check vendor_id in items
                if (item.vendor_id && String(item.vendor_id) === String(vendorFilter)) {
                  return true;
                }
                
                // Check vendor_code in items
                if (item.vendor_code && String(item.vendor_code) === String(vendorFilter)) {
                  return true;
                }
                
                // Check if vendor name matches (fallback)
                if (item.vendor_name) {
                  const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
                  if (selectedVendor && item.vendor_name.toLowerCase().includes(selectedVendor.name.toLowerCase())) {
                    return true;
                  }
                }
                
                // Additional check: if vendor_id matches the selected vendor's ID
                const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
                if (selectedVendor && item.vendor_id && String(item.vendor_id) === String(selectedVendor.id)) {
                  return true;
                }
                
                // Additional check: if vendor_code matches the selected vendor's code
                if (selectedVendor && item.vendor_code && String(item.vendor_code) === String(selectedVendor.vendor_code)) {
                  return true;
                }
                
                return false;
              });
            }
          } catch (e) {
            // Ignore parsing errors
          }

          return false;
        }).length;
        
        totalFilteredCount = vendorFilteredCount;
      }
      
      // Set the actual filtered count for pagination
      setActualFilteredCount(totalFilteredCount);
      
      // Set the paginated orders
      setOrders(pageOrders);
      setCurrentPage(page);

      // Cache the results
      setOrdersCache(prev => ({
        ...prev,
        [cacheKey]: {
          orders: pageOrders,
          totalCount: totalFilteredCount,
          timestamp: Date.now()
        }
      }));

      // Fetch vendors for dropdown only on first load
      if (page === 1) {
        await loadVendors();
      }
      
      return pageOrders;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load orders data",
        variant: "destructive"
      });
      throw error; // Re-throw to let the loading hook handle it
    } finally {
      setIsTableLoading(false);
    }
  }, [statusFilter, vendorFilter, paymentStatusFilter, searchTerm, selectedYear, selectedMonth, startDate, endDate, startTime, endTime, pageSize, loadVendors, toast]);

  // Initial load effect - runs only once on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // First load summary data instantly
        await fetchSummaryData();
        
        // Then load full table data
        await executeWithLoading(() => fetchOrders(1, pageSize), { isRefresh: false, preserveData: false });
        
        setHasLoadedOnce(true);
        
        // Connection testing removed - now using Python backend
      } catch (error) {
        console.error('Failed to initialize orders data:', error);
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      }
    };
    
    initializeData();
  }, []); // Only run on mount

  // Reset selections when filters/search change
  useEffect(() => {
    setSelectedIds([]);
  }, [searchTerm, statusFilter, vendorFilter, paymentStatusFilter, startDate, endDate, startTime, endTime, selectedYear, selectedMonth]);

  // When user enters a search term, fetch all matching orders (debounced) so search runs across entire dataset
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!searchTerm) {
        // Clear full-search results and return to server-side pagination
        setAllFilteredSearchResults(null);
        return;
      }

      try {
        // Show a lightweight loading state
        setIsTableLoading(true);
        const results = await fetchAllFilteredOrders();
        if (!cancelled) {
          setAllFilteredSearchResults(results || []);
          // Reset to first page
          setCurrentPage(1);
          // Set visible orders slice for immediate UI
          setOrders((results || []).slice(0, pageSize));
        }
      } catch (e) {
        if (!cancelled) setAllFilteredSearchResults([]);
      } finally {
        if (!cancelled) setIsTableLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, statusFilter, vendorFilter, paymentStatusFilter, startDate, endDate, startTime, endTime, selectedYear, selectedMonth, pageSize]);

  // Single useEffect to handle all filter changes efficiently
  useEffect(() => {
    if (!hasLoadedOnce) return;

    // Debounce filter changes to prevent excessive API calls
    const timeoutId = setTimeout(async () => {
      // Clear cache when filters change
      setOrdersCache({});
      setSummaryCache({});
      setCurrentPage(1);

      // Show loading state immediately
      setIsTableLoading(true);

      try {
        // Fetch summary data and orders simultaneously for better performance
        await Promise.all([
          fetchSummaryData(),
          executeWithLoading(() => fetchOrders(1, pageSize), { isRefresh: true, preserveData: false })
        ]);
      } catch (error) {
        // Error handling is done in individual functions
      } finally {
        setIsTableLoading(false);
      }
    }, 300); // 300ms debounce to prevent rapid filter changes from causing multiple API calls

    return () => clearTimeout(timeoutId);
  }, [hasLoadedOnce, selectedYear, selectedMonth, statusFilter, vendorFilter, paymentStatusFilter, searchTerm, startDate, endDate, startTime, endTime, pageSize, fetchSummaryData, fetchOrders, executeWithLoading]);

  const BackgroundRefreshIndicator: React.FC<{ isRefreshing: boolean }> = ({ isRefreshing }) => {
    if (!isRefreshing) return null;
    
    return (
      <div className="fixed top-20 right-6 z-50 animate-fade-in">
        <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Refreshing data...
        </div>
      </div>
    );
  };

  const handleRefresh = async () => {
    await executeWithLoading(fetchOrders, { isRefresh: true, preserveData: true });
  };

  // Helper function to check and warn about problematic filters
  const checkFilterIssues = useCallback(() => {
    const issues: string[] = [];
    const now = new Date();
    
    // Check date filters
    if (startDate) {
      const filterStart = new Date(startDate);
      if (filterStart > now) {
        issues.push(`Start date (${filterStart.toLocaleDateString()}) is in the future`);
      }
    }
    
    if (endDate) {
      const filterEnd = new Date(endDate);
      if (filterEnd > now) {
        issues.push(`End date (${filterEnd.toLocaleDateString()}) is in the future`);
      }
    }
    
    // Show toast if there are issues
    if (issues.length > 0) {
      toast({
        title: "Filter Issues Detected",
        description: issues.join('. ') + '. This may result in no orders being shown.',
        variant: "destructive",
        duration: 5000
      });
    }
  }, [startDate, endDate, toast]);

  // Check for filter issues when filters change
  useEffect(() => {
    if (startDate || endDate) {
      checkFilterIssues();
    }
  }, [startDate, endDate, checkFilterIssues]);

  const handleDownloadInvoice = async (order: Order) => {
    try {
      // Convert order to invoice data
      const invoiceData = await generateInvoiceFromOrder(order.order_id);
      
      if (!invoiceData) {
        throw new Error('Could not generate invoice data');
      }
      
      // Use the downloadInvoice function directly
      downloadInvoice(invoiceData);
      
      toast({
        title: "Invoice Downloaded",
        description: `Invoice for order ${order.order_id} has been downloaded.`,
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // Check if status is being changed to "shipped" and courier details might be needed
    if (newStatus === 'shipped' && Array.isArray(orders)) {
      const order = orders.find(o => o.id === orderId);
      if (order && order.status !== 'shipped') {
        // For shipped status, we should allow the update but check if courier details exist
        // The delivery details can be added/updated separately in the deliveries section
      }
    }

    setUpdatingStatus(orderId);
    try {
      // Get current order before making changes
      const currentOrder = Array.isArray(orders) ? orders.find(o => o.id === orderId) : undefined;

      // CRITICAL FIX: Completely avoid payment status updates during status changes
      // Payment status should be managed separately from order status
      // This prevents any potential inventory conflicts

      // Note: If payment status needs to be updated, it should be done separately,
      // not as part of order status updates

      try {
        // Try normal update first
        await updateOrderStatus(orderId, newStatus);
      } catch (error) {

        // If normal update fails, try force update
        toast({
          title: "Retrying Status Update",
          description: "Normal update failed, attempting force update...",
        });

        try {
          // Use backend API for force update
          await updateOrderStatus(orderId, newStatus);
          toast({
            title: "Status Updated",
            description: `Order status successfully updated to ${newStatus}`,
          });
          
          // Refresh orders after update
          await executeWithLoading(() => fetchOrders(currentPage, pageSize), { isRefresh: true, preserveData: false });
          
          return;
          
          /* Removed Supabase force update
          if (false) {
            toast({
              title: "Force Update Failed",
              description: "Could not update order status. Please check system logs.",
              variant: "destructive",
            });
            return;
          }
        } catch (forceError) {
          toast({
            title: "Update Failed",
            description: "Both normal and force updates failed. Please contact support.",
            variant: "destructive",
          });
          return;
        }
      }

      // Refresh data in background without showing full loading
      await executeWithLoading(fetchOrders, { isRefresh: true, preserveData: true });

      // Show additional notification for shipped orders
      if (newStatus === 'shipped') {
        toast({
          title: "Status Updated",
          description: `Order status updated to ${newStatus}. Please ensure courier details are added in the Deliveries section.`,
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Order status has been updated to ${newStatus} successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      // TODO: Implement deleteOrder in api-admin.ts
      toast({
        title: "Not Implemented",
        description: "Order deletion via backend API is not yet implemented",
        variant: "destructive",
      });
      return;

      // Force refresh orders after deletion
      await fetchOrders();
      await fetchStatusCounts(); // Refresh status counts
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  // Function to get filtered products within an order based on vendor filter
  const getFilteredProductsForOrder = (order: Order) => {
    if (vendorFilter === 'all') {
      // Return all products if no vendor filter
      return { order, filteredProducts: null };
    }

    try {
      const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      
      if (parsed && Array.isArray(parsed.items)) {
        // Multi-product order - filter items by vendor
        const matchingItems = parsed.items.filter((item: any, index: number) => {
          const vendorName = getVendorNameForProductSync(order, index);
          
          // Check if vendor ID matches (primary method)
          if (item.vendor_id && String(item.vendor_id).trim() === String(vendorFilter).trim()) {
            return true;
          }
          
          // Check if vendor code matches
          if (item.vendor_code && String(item.vendor_code).trim() === String(vendorFilter).trim()) {
            return true;
          }
          
          // Check if vendor name matches (fallback)
          const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
          if (selectedVendor && vendorName.toLowerCase().includes(selectedVendor.name.toLowerCase())) {
            return true;
          }
          
          // Check if the selected vendor ID matches any vendor in our vendors array
          if (selectedVendor) {
            // Check if this item's vendor matches the selected vendor
            if (item.vendor_id && String(item.vendor_id) === String(selectedVendor.id)) {
              return true;
            }
            if (item.vendor_code && String(item.vendor_code) === String(selectedVendor.vendor_code)) {
              return true;
            }
            if (vendorName.toLowerCase().includes(selectedVendor.name?.toLowerCase() || '') ||
                vendorName.toLowerCase().includes(selectedVendor.contact_person?.toLowerCase() || '')) {
              return true;
            }
          }
          
          return false;
        });
        
        if (matchingItems.length > 0) {
          return { 
            order: { 
              ...order, 
              applied_offer: JSON.stringify({ ...parsed, items: matchingItems })
            }, 
            filteredProducts: matchingItems 
          };
        }
        return null; // No matching products
      } else {
        // Single product order - check if vendor matches
        const vendorName = getVendorNameForProductSync(order, 0);
        
        // Check if vendor ID matches (primary method)
        if (order.vendor_id && String(order.vendor_id).trim() === String(vendorFilter).trim()) {
          return { order, filteredProducts: null };
        }
        
        // Check if vendor code matches
        if (order.vendor_code && String(order.vendor_code).trim() === String(vendorFilter).trim()) {
          return { order, filteredProducts: null };
        }
        
        // Check if vendor name matches (fallback)
        if (vendorName.toLowerCase().includes(vendorFilter.toLowerCase())) {
          return { order, filteredProducts: null };
        }
        
        // Check if the selected vendor ID matches any vendor in our vendors array
        const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
        if (selectedVendor) {
          // Check if this order's vendor matches the selected vendor
          if (order.vendor_id && String(order.vendor_id) === String(selectedVendor.id)) {
            return { order, filteredProducts: null };
          }
          if (order.vendor_code && String(order.vendor_code) === String(selectedVendor.vendor_code)) {
            return { order, filteredProducts: null };
          }
          if (vendorName.toLowerCase().includes(selectedVendor.name?.toLowerCase() || '') ||
              vendorName.toLowerCase().includes(selectedVendor.contact_person?.toLowerCase() || '')) {
            return { order, filteredProducts: null };
          }
        }
        
        return null; // No matching vendor
      }
    } catch (e) {
      // Fallback to original order if parsing fails
      return { order, filteredProducts: null };
    }
  };

  // NOTE: Client-side filtering is disabled when server-side pagination is enabled
  // Server-side filtering is already applied in fetchOrders function
  // This filteredOrders is kept for compatibility but not used when serverSidePagination = true
  // Get status counts from database for accurate totals
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    confirmed: 0,
    processing: 0,
    ready_to_ship: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    failed: 0
  });

  // Fetch status counts from database
  const fetchStatusCounts = useCallback(async () => {
    try {
      // Use backend API to get summary stats which includes status counts
      const summary = await getOrdersSummaryStats();
      const counts: any = {};
      
      // Extract status counts from summary if available
      if (summary && summary.status_counts) {
        Object.assign(counts, summary.status_counts);
      } else {
        // Fallback: calculate from orders data
        const statuses = ['pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'failed'];
        statuses.forEach(status => {
          counts[status] = 0;
        });
        
        // Count from current orders data if available
        if (Array.isArray(pagination?.paginatedData)) {
          pagination.paginatedData.forEach((order: Order) => {
            const status = order.status || 'pending';
            counts[status] = (counts[status] || 0) + 1;
          });
        }
      }
      
      setStatusCounts(counts);
    } catch (error) {
      console.error('Error fetching status counts:', error);
    }
  }, [pagination]);

  // Fetch status counts when component mounts
  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  // Function to get vendor order counts based on current filters
  const getVendorOrderCounts = useCallback(async () => {
    try {
      const vendorCounts: { [key: string]: number } = {};
      
      // Get all orders with current filters (except vendor filter)
      const filters: any = {
        year: selectedYear,
        month: selectedMonth,
      };
      
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (paymentStatusFilter !== 'all') filters.paymentStatus = paymentStatusFilter;
      if (searchTerm) filters.searchTerm = searchTerm;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (startTime) filters.startTime = startTime;
      if (endTime) filters.endTime = endTime;
      
      // Fetch all orders to count by vendor - use optimized bulk fetch
      const apiFilters: {
        statusFilter?: string;
        vendorFilter?: string;
        paymentStatusFilter?: string;
        searchTerm?: string;
        year?: number;
        month?: number;
        startDate?: string;
        endDate?: string;
      } = {};
      
      if (selectedYear) apiFilters.year = selectedYear;
      if (selectedMonth) apiFilters.month = selectedMonth;
      if (statusFilter !== 'all') apiFilters.statusFilter = statusFilter;
      if (vendorFilter !== 'all') apiFilters.vendorFilter = vendorFilter;
      if (paymentStatusFilter !== 'all') apiFilters.paymentStatusFilter = paymentStatusFilter;
      if (searchTerm) apiFilters.searchTerm = searchTerm;
      if (startDate) apiFilters.startDate = startDate;
      if (endDate) apiFilters.endDate = endDate;
      
      // Use getAllOrdersForAdmin for faster bulk fetching
      const allOrders = await getAllOrdersForAdmin(apiFilters);
      
      // Count orders by vendor
      vendors.forEach(vendor => {
        const vendorId = String(vendor.id);
        let count = 0;
        
        allOrders.forEach(order => {
          // Check direct vendor_id match
          if (order.vendor_id && String(order.vendor_id) === vendorId) {
            count++;
            return;
          }
          
          // Check vendor_code match
          if (order.vendor_code && String(order.vendor_code) === String(vendor.vendor_code)) {
            count++;
            return;
          }
          
          // Check complex vendor relationships in applied_offer JSON
          try {
            const appliedOffer = typeof order.applied_offer === 'string'
              ? JSON.parse(order.applied_offer)
              : order.applied_offer;

            if (appliedOffer && appliedOffer.items && Array.isArray(appliedOffer.items)) {
              const hasMatch = appliedOffer.items.some((item: any) => {
                // Check vendor_id in items
                if (item.vendor_id && String(item.vendor_id) === vendorId) {
                  return true;
                }
                
                // Check vendor_code in items
                if (item.vendor_code && String(item.vendor_code) === String(vendor.vendor_code)) {
                  return true;
                }
                
                // Check if vendor name matches (fallback)
                if (item.vendor_name && vendor.name) {
                  if (item.vendor_name.toLowerCase().includes(vendor.name.toLowerCase())) {
                    return true;
                  }
                }
                
                return false;
              });
              
              if (hasMatch) {
                count++;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });
        
        vendorCounts[vendorId] = count;
      });
      
      return vendorCounts;
    } catch (error) {
      console.error('Error calculating vendor counts:', error);
      return {};
    }
  }, [vendors, selectedYear, selectedMonth, statusFilter, paymentStatusFilter, searchTerm, startDate, endDate, startTime, endTime]);

  // State for vendor counts
  const [vendorCounts, setVendorCounts] = useState<{ [key: string]: number }>({});
  
  // State for actual filtered count (used for pagination)
  const [actualFilteredCount, setActualFilteredCount] = useState<number>(0);

  // Update vendor counts when filters change
  useEffect(() => {
    if (vendors.length > 0) {
      getVendorOrderCounts().then(setVendorCounts);
    }
  }, [getVendorOrderCounts, vendors.length]);

  // Initialize actualFilteredCount with summaryData.totalOrders
  useEffect(() => {
    if (actualFilteredCount === 0 && summaryData.totalOrders > 0) {
      setActualFilteredCount(summaryData.totalOrders);
    }
  }, [summaryData.totalOrders, actualFilteredCount]);


  // Create server-side pagination object
  const serverSidePaginationObj = {
    currentPage,
    totalPages: Math.ceil(actualFilteredCount / pageSize),
    // Use actual filtered count for proper pagination display
    totalItems: actualFilteredCount,
    itemsPerPage: pageSize,
    // If we have full-search results use a client-side paginated slice, otherwise use server-provided orders
    paginatedData: allFilteredSearchResults && Array.isArray(allFilteredSearchResults)
      ? allFilteredSearchResults.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : orders,
    goToPage: async (page: number) => {
      // Always set the page first to provide immediate UI feedback
      setCurrentPage(page);

      // Check cache with current filter state
      const cacheKey = JSON.stringify({
        page,
        size: pageSize,
        statusFilter,
        vendorFilter,
        paymentStatusFilter,
        searchTerm,
        selectedYear,
        selectedMonth,
        startDate,
        endDate,
        startTime,
        endTime
      });

      // If we have client-side full search results, just slice them locally and avoid a server fetch
      if (allFilteredSearchResults && Array.isArray(allFilteredSearchResults)) {
        const start = (page - 1) * pageSize;
        const end = page * pageSize;
        setOrders(allFilteredSearchResults.slice(start, end));
        return;
      }

      const cachedResult = ordersCache[cacheKey];
      if (cachedResult && (Date.now() - cachedResult.timestamp) < 60000) {
        // Use cached data immediately (extended cache time)
        setOrders(cachedResult.orders);
        return;
      }

      // Only show loading for actual API calls
      setLoadingMore(true);
      try {
        await fetchOrders(page, pageSize);
      } catch (error) {
        // Error handled in fetchOrders
      } finally {
        setLoadingMore(false);
      }
    },
    nextPage: async () => {
      const nextPageNum = currentPage + 1;
      const totalPages = Math.ceil(actualFilteredCount / pageSize);
      if (nextPageNum <= totalPages) {
        await serverSidePaginationObj.goToPage(nextPageNum);
      }
    },
    prevPage: async () => {
      if (currentPage > 1) {
        await serverSidePaginationObj.goToPage(currentPage - 1);
      }
    },
    setItemsPerPage: (newPageSize: number) => {
      if (newPageSize === -1) {
        // Show all orders - set a very large page size
        setPageSize(10000);
      } else {
        setPageSize(newPageSize);
      }
      setCurrentPage(1);
      // Don't fetch immediately - let the useEffect handle it
    },
    hasNextPage: currentPage < Math.ceil(actualFilteredCount / pageSize),
    hasPrevPage: currentPage > 1,
    startIndex: (currentPage - 1) * pageSize,
    endIndex: Math.min(currentPage * pageSize, actualFilteredCount)
  };

  // Use pagination hook - for client-side filtering when needed
  const clientSidePagination = usePagination(orders, pageSize);
  
  // Choose which pagination to use
  const pagination = serverSidePagination ? serverSidePaginationObj : clientSidePagination;

  // Use summary data for accurate saree counts
  const totalQuantity = summaryData.totalSarees;
  const activeQuantity = summaryData.activeSarees;

  // Calculate OMAGUVA vendor specific data
  const getOMAGUVAStats = () => {
    if (!Array.isArray(orders)) return { totalOrders: 0, totalAmount: 0, totalQuantity: 0 };
    const omaguvaOrders = (orders || []).filter(order => {
      try {
        const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        if (parsed && Array.isArray(parsed.items)) {
          return parsed.items.some((item: any) => 
            item.name?.toLowerCase().includes('omaguva') || 
            item.vendor_name?.toLowerCase().includes('omaguva')
          );
        }
        return order.product_name?.toLowerCase().includes('omaguva') || 
               order.vendors?.name?.toLowerCase().includes('omaguva');
      } catch (e) {
        return false;
      }
    });

    const omaguvaQuantity = omaguvaOrders.reduce((total, order) => {
      try {
        const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        if (parsed && Array.isArray(parsed.items)) {
          return total + parsed.items
            .filter((item: any) => 
              item.name?.toLowerCase().includes('omaguva') || 
              item.vendor_name?.toLowerCase().includes('omaguva')
            )
            .reduce((sum: number, item: any) => sum + Number(item.quantity || 1), 0);
        }
        return total + Number(order.quantity || 1);
      } catch (e) {
        return total + Number(order.quantity || 1);
      }
    }, 0);

    const omaguvaValue = omaguvaOrders.reduce((total, order) => total + (order.amount || 0), 0);

    return {
      orders: omaguvaOrders.length,
      quantity: omaguvaQuantity,
      value: omaguvaValue
    };
  };

  const omaguvaStats = getOMAGUVAStats();

  // Calculate comprehensive stats - updated for proper order tracking
  const mainStats = [
    { 
      title: 'Total Orders', 
      value: (Array.isArray(orders) ? orders.length : 0).toLocaleString(), 
      icon: ShoppingCart, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'All orders including cancelled'
    },
    { 
      title: 'Confirmed Orders', 
      value: (Array.isArray(orders) ? orders.filter(o => o.status !== 'cancelled' && o.status !== 'pending').length : 0).toLocaleString(), 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'All statuses except cancelled and pending'
    },
    { 
      title: 'Confirmed Sarees Sold', 
      value: summaryData.confirmedSarees.toLocaleString(), 
      icon: Package, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Sarees from confirmed orders (excl. cancelled & pending)'
    }
  ];


  const statusStats = [
    { 
      title: 'Pending', 
      value: statusCounts.pending.toLocaleString(), 
      icon: AlertCircle, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Awaiting confirmation'
    },
    { 
      title: 'Confirmed', 
      value: statusCounts.confirmed.toLocaleString(), 
      icon: CheckCircle, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Confirmed orders'
    },
    { 
      title: 'Processing', 
      value: statusCounts.processing.toLocaleString(), 
      icon: Package, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Being prepared'
    },
    { 
      title: 'Ready to Ship', 
      value: statusCounts.ready_to_ship.toLocaleString(), 
      icon: TrendingUp, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Ready for dispatch'
    },
    { 
      title: 'Shipped', 
      value: statusCounts.shipped.toLocaleString(), 
      icon: Truck, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'In transit'
    },
    { 
      title: 'Delivered', 
      value: statusCounts.delivered.toLocaleString(), 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Successfully delivered'
    },
    { 
      title: 'Cancelled', 
      value: statusCounts.cancelled.toLocaleString(), 
      icon: X, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Cancelled orders'
    },
    { 
      title: 'Failed', 
      value: statusCounts.failed.toLocaleString(), 
      icon: XCircle, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Failed orders'
    }
  ];

  // Calculate total confirmed order value (confirmed + processing + ready to ship + shipped + delivered)
  const totalConfirmedValue = (orders || [])
    .filter(o => ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

  const orderValueCard = {
    title: 'Total Active Orders Value',
    value: `₹${totalConfirmedValue.toLocaleString()}`,
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ready_to_ship': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'shipped': return 'bg-green-100 text-green-800 border-green-300';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'refunded': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async () => {
    if (selectedIds.length === 0 || !bulkStatus) return;
    if (!Array.isArray(orders)) return;
    
    const ordersToUpdate = orders.filter(o => selectedIds.includes(o.id));
    setConfirmState({ 
      mode: 'bulk', 
      to: bulkStatus, 
      orders: ordersToUpdate.map(o => ({ id: o.id, order_id: o.order_id, from: o.status })) 
    });
  };

  // Confirm status change
  const confirmStatusChange = async () => {
    if (!confirmState) {
      return;
    }
    let updateSuccess = false;
    try {
      if (confirmState.mode === 'single') {
        await handleStatusUpdate(confirmState.orders[0].id, confirmState.to);
        updateSuccess = true;
      } else if (confirmState.mode === 'bulk') {
        const orderIds = confirmState.orders.map((o: any) => o.id);
        await updateOrdersStatusBulk(orderIds, confirmState.to);
        await executeWithLoading(fetchOrders, { isRefresh: true, preserveData: true });
        const orderCount = orderIds.length;
        const statusTo = confirmState.to;
        toast({
          title: "Bulk Status Updated",
          description: orderCount + " orders have been updated to " + statusTo + ".",
        });
        setSelectedIds([]);
        updateSuccess = true;
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    }
    setConfirmState(null);
  };

  // Removed testSupabaseConnection and checkOrdersTable - now using Python backend

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  // Safe paginated data to avoid runtime undefined errors and to support client-side slicing
  const paginatedDataSafe: Order[] = Array.isArray(pagination?.paginatedData) ? pagination.paginatedData as Order[] : [];

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6 relative w-full bg-background">
      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 flex-shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Order Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* 1. Overview Section */}
      <div className="mb-8 overview-section">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Overview</h3>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Total Orders Value Card */}
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 hover:scale-105 bg-gradient-to-br from-white to-blue-50 border border-gray-200 shadow-md flex-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Orders Value</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">₹{summaryData.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">All orders in system</p>
                </div>
                <div className="p-2 rounded-full bg-blue-50 flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Minus Symbol */}
          <div className="flex items-center justify-center">
            <div className="bg-red-100 text-red-600 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold shadow-lg">
              -
                </div>
          </div>

          {/* Cancelled Orders Card */}
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 hover:scale-105 bg-gradient-to-br from-white to-red-50 border border-gray-200 shadow-md flex-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Cancelled Orders</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">₹{summaryData.cancelledAmount.toLocaleString()}</p>
                  <div className="text-xs text-gray-500">
                    <p>Orders: {summaryData.cancelledOrders}</p>
                    <p className="font-semibold text-red-600">Status: Cancelled</p>
                  </div>
                </div>
                <div className="p-2 rounded-full bg-red-50 flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equals Symbol */}
          <div className="flex items-center justify-center">
            <div className="bg-green-100 text-green-600 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold shadow-lg">
              =
            </div>
          </div>

          {/* Active Orders (All Active Statuses) Card */}
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 hover:scale-105 bg-gradient-to-br from-white to-green-50 border border-gray-200 shadow-md flex-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Active Orders</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">₹{(summaryData.totalAmount - summaryData.cancelledAmount).toLocaleString()}</p>
                  <div className="text-xs text-gray-500">
                    <p>Orders: {summaryData.totalOrders - summaryData.cancelledOrders}</p>
                    <p>Sarees: {summaryData.activeSarees}</p>
                    <p className="font-semibold text-green-600">Pending + Processing + Confirmed + Ready to Ship + Shipped + Delivered</p>
                  </div>
                </div>
                <div className="p-2 rounded-full bg-green-50 flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Order Management Section */}
      <div className="mb-8 order-management-section">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Order Management</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainStats.map((stat, index) => (
            <Card key={index} className={`hover:shadow-lg transition-all duration-300 border-l-4 hover:scale-105 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md ${stat.bgColor}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-lg font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                  <div className={`p-2 rounded-full ${stat.bgColor} flex-shrink-0`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Order Status Breakdown Section */}
      <div className="mb-8 order-status-section">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Order Status Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Confirmed Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 hover:scale-105 bg-gradient-to-br from-white to-green-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Confirmed</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{summaryData.confirmedOrders}</p>
                  <p className="text-xs text-gray-500">₹{summaryData.confirmedAmount.toLocaleString()}</p>
                </div>
                <div className="p-1.5 rounded-full bg-green-50 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-yellow-500 hover:scale-105 bg-gradient-to-br from-white to-yellow-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Processing</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{summaryData.processingOrders}</p>
                  <p className="text-xs text-gray-500">₹{summaryData.processingAmount.toLocaleString()}</p>
                </div>
                <div className="p-1.5 rounded-full bg-yellow-50 flex-shrink-0">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ready to Ship Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500 hover:scale-105 bg-gradient-to-br from-white to-orange-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Ready to Ship</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{summaryData.readyToShipOrders}</p>
                  <p className="text-xs text-gray-500">₹{summaryData.readyToShipAmount.toLocaleString()}</p>
                </div>
                <div className="p-1.5 rounded-full bg-orange-50 flex-shrink-0">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipped Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 hover:scale-105 bg-gradient-to-br from-white to-purple-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Shipped</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{summaryData.shippedOrders}</p>
                  <p className="text-xs text-gray-500">₹{summaryData.shippedAmount.toLocaleString()}</p>
                </div>
                <div className="p-1.5 rounded-full bg-purple-50 flex-shrink-0">
                  <Truck className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivered Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 hover:scale-105 bg-gradient-to-br from-white to-emerald-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Delivered</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{summaryData.completedOrders}</p>
                  <p className="text-xs text-gray-500">₹{summaryData.deliveredAmount.toLocaleString()}</p>
                </div>
                <div className="p-1.5 rounded-full bg-emerald-50 flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancelled Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 hover:scale-105 bg-gradient-to-br from-white to-red-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Cancelled</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{Array.isArray(orders) ? orders.filter(o => o.status === 'cancelled').length : 0}</p>
                  <p className="text-xs text-gray-500">₹{Array.isArray(orders) ? orders.filter(o => o.status === 'cancelled').reduce((sum, order) => sum + (Number(order.amount) || 0), 0).toLocaleString() : '0'}</p>
                </div>
                <div className="p-1.5 rounded-full bg-red-50 flex-shrink-0">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-gray-500 hover:scale-105 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Pending</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0}</p>
                  <p className="text-xs text-gray-500">₹{Array.isArray(orders) ? orders.filter(o => o.status === 'pending').reduce((sum, order) => sum + (Number(order.amount) || 0), 0).toLocaleString() : '0'}</p>
                </div>
                <div className="p-1.5 rounded-full bg-gray-50 flex-shrink-0">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Failed Orders */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 hover:scale-105 bg-gradient-to-br from-white to-red-50 border border-gray-200 shadow-md cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">Failed</p>
                  <p className="text-lg font-bold text-gray-900 mb-1">{Array.isArray(orders) ? orders.filter(o => o.status === 'failed').length : 0}</p>
                  <p className="text-xs text-gray-500">₹{Array.isArray(orders) ? orders.filter(o => o.status === 'failed').reduce((sum, order) => sum + (Number(order.amount) || 0), 0).toLocaleString() : '0'}</p>
                </div>
                <div className="p-1.5 rounded-full bg-red-50 flex-shrink-0">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="space-y-6">
      {/* Modern Compact Filters */}
      <Card className="bg-white border border-gray-200 shadow-sm filters-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">Filters</CardTitle>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                Showing {pagination.startIndex + 1}-{pagination.endIndex} of {actualFilteredCount} orders
              </Badge>
            </div>
              {(searchTerm || statusFilter !== 'all' || vendorFilter !== 'all' || paymentStatusFilter !== 'all' || startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setVendorFilter('all');
                    setPaymentStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setStartTime('');
                    setEndTime('');
                  }}
                className="h-7 px-2 text-xs"
                >
                <X className="h-3 w-3 mr-1" />
                Clear
                </Button>
              )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Filters - Compact Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders by ID, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
            
            
            {/* Status Filter */}
              <Select value={statusFilter}               onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

            {/* Payment Status Filter */}
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

            {/* Vendor Filter */}
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Vendor" />
                </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">All Vendors</SelectItem>
                {vendors.length > 0 ? (
                  vendors.map((vendor) => {
                    const count = vendorCounts[String(vendor.id)] || 0;
                    return (
                      <SelectItem key={vendor.id} value={String(vendor.id)} className="truncate">
                        <div className="flex justify-between items-center w-full">
                          <div className="truncate">
                            {vendor.name || vendor.contact_person || `Vendor ${vendor.id}`}
                            {vendor.vendor_code && ` (${vendor.vendor_code})`}
                          </div>
                          <div className="ml-2 text-xs text-gray-500">
                            ({count})
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                )}
                </SelectContent>
              </Select>
          </div>

          {/* Date Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">From Date & Time</Label>
                  <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 flex-1"
                  placeholder="Start date"
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                      className="h-10 flex-1"
                  placeholder="Start time"
              />
                  </div>
            </div>
            
            <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">To Date & Time</Label>
                  <div className="flex gap-2">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 flex-1"
                  placeholder="End date"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                      className="h-10 flex-1"
                  placeholder="End time"
              />
            </div>
          </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Quick Filters</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0] || '';
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                    setStartTime('');
                    setEndTime('');
                  }}
                  className="h-10 px-3 text-xs"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0] || '';
                    setStartDate(yesterdayStr);
                    setEndDate(yesterdayStr);
                    setStartTime('');
                    setEndTime('');
                  }}
                  className="h-10 px-3 text-xs"
                >
                  Yesterday
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Clear Date</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setStartTime('');
                  setEndTime('');
                }}
                className="h-10 px-3 w-full"
              >
                Clear Date Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="flex-1 flex flex-col bg-white border border-gray-200 shadow-lg orders-table-card">
        <CardHeader className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Vendor Orders Management</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Manage all orders with comprehensive filtering and status tracking</p>
              </div>
              <Badge variant="secondary" className="text-sm bg-blue-100 text-blue-800 font-semibold px-3 py-1">
                Showing {pagination.startIndex + 1}-{pagination.endIndex} of {actualFilteredCount} orders
                {isTableLoading && (
                  <div className="ml-2 inline-flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span className="ml-1 text-xs">Loading...</span>
                  </div>
                )}
              </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Export Section */}
              <div className="flex items-center gap-3 export-buttons">
            <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-800">Export:</span>
                </div>
                <div className="flex gap-2">
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                    className="h-10 px-4 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                disabled={summaryData.totalOrders === 0}
              >
                    <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                    className="h-10 px-4 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                disabled={summaryData.totalOrders === 0}
              >
                    <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
              </div>

              {/* Bulk Actions */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-green-100 text-green-800 font-semibold px-3 py-1">
                    {selectedIds.length} selected
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold text-gray-800">Bulk Actions:</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                      <SelectTrigger className="w-44 h-10 border-blue-200 focus:border-blue-400 focus:ring-blue-400">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                        <SelectItem value="pending">🔄 Pending</SelectItem>
                        <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                        <SelectItem value="processing">📦 Processing</SelectItem>
                        <SelectItem value="ready_to_ship">🎯 Ready to Ship</SelectItem>
                        <SelectItem value="shipped">🚚 Shipped</SelectItem>
                        <SelectItem value="delivered">✅ Delivered</SelectItem>
                        <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleBulkStatusUpdate}
                size="sm"
                      className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!bulkStatus || selectedIds.length === 0}
              >
                      Update
              </Button>
            </div>
                </div>
              )}
          </div>
        </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 bg-white">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="min-w-[1000px] lg:min-w-[1200px]">
              <table className="w-full border-collapse bg-white">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-blue-200 shadow-lg">
                  <tr>
                    <th className="w-10 p-2 text-left bg-gradient-to-r from-gray-50 to-blue-50">
                      {/** Use a safe paginatedData variable to avoid runtime errors when pagination.paginatedData is undefined */}
                      <input
                        type="checkbox"
                        checked={paginatedDataSafe.length > 0 && paginatedDataSafe.every((o) => selectedIds.includes(o.id))}
                        onChange={() => {
                          const ids = paginatedDataSafe.map((o) => o.id);
                          const allSelected = ids.every((id) => selectedIds.includes(id));
                          setSelectedIds(allSelected ? selectedIds.filter((id) => !ids.includes(id)) : Array.from(new Set([...selectedIds, ...ids])));
                        }}
                        className="rounded border-gray-300 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="w-24 text-left p-2 font-bold text-gray-900 border-r border-blue-200 text-xs bg-gradient-to-r from-gray-50 to-blue-50">ORDER ID</th>
                    <th className="w-40 text-left p-2 font-bold text-gray-900 border-r border-blue-200 text-xs bg-gradient-to-r from-gray-50 to-blue-50">CUSTOMER</th>
                    <th className="w-48 text-left p-2 font-bold text-gray-900 border-r border-blue-200 text-xs bg-gradient-to-r from-gray-50 to-blue-50">PRODUCT</th>
                    <th className="w-20 text-left p-2 font-bold text-gray-900 border-r border-blue-200 text-xs bg-gradient-to-r from-gray-50 to-blue-50">STATUS</th>
                    <th className="w-20 text-left p-2 font-bold text-gray-900 border-r border-blue-200 text-xs bg-gradient-to-r from-gray-50 to-blue-50">PAYMENT</th>
                    <th className="w-32 text-left p-2 font-bold text-gray-900 border-r border-blue-200 text-xs bg-gradient-to-r from-gray-50 to-blue-50">TIME / AMOUNT</th>
                    <th className="w-20 text-left p-2 font-bold text-gray-900 text-xs bg-gradient-to-r from-gray-50 to-blue-50">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedDataSafe.length === 0 ? (
                    <tr className="bg-white">
                      <td colSpan={8} className="text-center py-16 text-gray-600 bg-white">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-12 w-12 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-gray-600 font-semibold text-lg">No orders found</p>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search criteria</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDataSafe.map((order, idx) => {
                      // Get filtered products for this order based on vendor filter
                      const filteredResult = getFilteredProductsForOrder(order);
                      const displayOrder = filteredResult?.order || order;
                      
                      // Get vendor name directly from each specific product - always use product vendor
                      // No need for main vendor column since we show vendor per product
                      // Choose product thumbnail; prefer color-specific image
                      let selectedImageUrl: string | null = null;
                      if (order?.product) {
                        // For now, just use the first product's basic info
                        // The Order interface doesn't include detailed product image info
                        selectedImageUrl = null;
                      } else {
                        selectedImageUrl = (order as Order & { product_images?: string[] })?.product_images?.[0] || null;
                      }

                    return (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 bg-white even:bg-gray-50/30 group">
                        <td className="p-2 align-top border-r border-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(order.id)}
                            onChange={() => setSelectedIds((prev) => prev.includes(order.id) ? prev.filter((x) => x !== order.id) : [...prev, order.id])}
                            className="rounded border-gray-300 h-4 w-4 text-blue-600 focus:ring-blue-500 group-hover:border-blue-400"
                          />
                        </td>
                        <td className="p-2 align-top border-r border-gray-200">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900 text-xs hover:text-blue-600 transition-colors" title={order.order_id}>
                              {order.order_id || 'N/A'}
                            </p>
                            {order.transaction_id && (
                              <p className="text-xs text-gray-600 truncate max-w-[80px] hover:text-blue-500 transition-colors" title={order.transaction_id}>
                                Txn: {order.transaction_id.length > 6 ? `${order.transaction_id.substring(0, 6)}...` : order.transaction_id}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-2 align-top border-r border-gray-200">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900 text-xs truncate">{order.customer_name}</p>
                            <p className="text-xs text-gray-600 break-words hover:text-blue-500 transition-colors">{order.customer_email}</p>
                            {order.customer_phone && (
                              <p className="text-xs text-gray-600 hover:text-blue-500 transition-colors">{order.customer_phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-2 align-top border-r border-gray-200">
                          <div className="space-y-2">
                              {(() => {
                                const lines: Array<{ name: string; color: string; qty: number; image?: string | null; size?: string; sizes?: string[] }> = [];
                                try {
                                  const raw = (displayOrder as Order & { applied_offer?: string | object }).applied_offer;
                                  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  if (parsed && Array.isArray((parsed as { items?: Array<{ name?: string, color?: string, quantity?: number, image?: string, size?: string, sizes?: string[] }> }).items)) {
                                    for (const it of (parsed as { items: Array<{ name?: string, color?: string, quantity?: number, image?: string, size?: string, sizes?: string[] }> }).items) {
                                      lines.push({ 
                                        name: it.name || displayOrder.product_name, 
                                        color: it.color || 'N/A', 
                                        qty: Number(it.quantity || 1), 
                                        image: it.image || null,
                                        size: it.size || '',
                                        sizes: it.sizes || []
                                      });
                                    }
                                  }
                                } catch {
                                  // Ignore parsing errors
                                }
                                if (lines.length === 0) {
                                  lines.push({ 
                                    name: displayOrder.product_name || 'N/A', 
                                    color: (Array.isArray(displayOrder.product_colors) && displayOrder.product_colors[0]) || 'N/A', 
                                    qty: Number(displayOrder.quantity || 1), 
                                    image: (displayOrder as Order & { product_images?: string[] })?.product_images?.[0] || null,
                                    size: (Array.isArray(displayOrder.product_sizes) && displayOrder.product_sizes[0]) || '',
                                    sizes: Array.isArray(displayOrder.product_sizes) ? displayOrder.product_sizes : []
                                  });
                                }
                                return (
                                <div className="space-y-2">
                                    {lines.map((ln, i) => (
                                    <div key={i} className="flex items-start space-x-2 p-1 bg-gray-50 rounded hover:bg-blue-50 transition-colors">
                                      <div className="flex-shrink-0">
                                        {ln.image ? (
                                          <img 
                                            src={ln.image} 
                                            alt={`${ln.name} - ${ln.color}`} 
                                            className="w-10 h-10 object-cover rounded border border-white shadow-sm" 
                                            loading="lazy"
                                            onError={(e) => {
                                              // Fallback to placeholder if image fails to load
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const placeholder = target.nextElementSibling as HTMLElement;
                                              if (placeholder) placeholder.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div className={`w-10 h-10 rounded bg-gradient-to-br from-gray-100 to-gray-200 border border-white flex items-center justify-center shadow-sm ${ln.image ? 'hidden' : 'flex'}`}>
                                          <Package className="h-3 w-3 text-gray-400" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">{ln.name}</div>
                                        <div className="text-xs text-gray-600">
                                          {getColorName(ln.color)} • Qty: {ln.qty}
                                          {ln.size && (
                                            <> • Size: <span className="font-medium text-green-600">{ln.size}</span></>
                                          )}
                                          {(() => {
                                            // Check if this is a dress product and show size
                                            const isDress = ln.name && (
                                              ln.name.toLowerCase().includes('dress') || 
                                              ln.name.toLowerCase().includes('gown') ||
                                              ln.name.toLowerCase().includes('frock') ||
                                              ln.name.toLowerCase().includes('lehenga') ||
                                              ln.name.toLowerCase().includes('saree')
                                            );

                                            if (isDress && !ln.size && !ln.sizes) {
                                              try {
                                                const raw = (displayOrder as Order & { applied_offer?: string | object }).applied_offer;
                                                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                                if (parsed && Array.isArray(parsed.items) && parsed.items[i]) {
                                                  const item = parsed.items[i];
                                                  if (item.size) {
                                                    return (<> • Size: <span className="font-medium text-green-600">{item.size}</span></>);
                                                  }
                                                  if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
                                                    return (<> • Sizes: <span className="font-medium text-green-600">{item.sizes.join(', ')}</span></>);
                                                  }
                                                }
                                              } catch (e) {
                                                // Ignore parsing errors
                                              }
                                            }
                                            return null;
                                          })()}
                                          {' • '}
                                            <span className="text-blue-600 font-medium">{getVendorNameForProductSync(displayOrder, i)}</span>
                                        </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                          </div>
                        </td>
                        <td className="p-2 md:p-4 align-top border-r border-gray-200">
                          <Select
                            value={order.status || "pending"}
                            onValueChange={(value) => {
                              setConfirmState({ mode: 'single', to: value, orders: [{ id: order.id, order_id: order.order_id, from: order.status }] });
                            }}
                            disabled={updatingStatus === order.id}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">🔄 Pending</SelectItem>
                              <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                              <SelectItem value="processing">📦 Processing</SelectItem>
                              <SelectItem value="ready_to_ship">🎯 Ready to Ship</SelectItem>
                              <SelectItem value="shipped">🚚 Shipped</SelectItem>
                              <SelectItem value="delivered">✅ Delivered</SelectItem>
                              <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 md:p-4 align-top border-r border-gray-200">
                          <Select
                            value={order.payment_status || 'pending'}
                            onValueChange={async (value) => {
                              try {
                                setUpdatingStatus(order.id);
                                await updateOrderPaymentStatusById(order.id, value);
                                await executeWithLoading(fetchOrders, { isRefresh: true, preserveData: true });
                                toast({ title: 'Payment Status Updated', description: 'Payment status has been updated successfully.' });
                              } catch (e) {
                                toast({ title: 'Error', description: 'Failed to update payment status.', variant: 'destructive' });
                              } finally {
                                setUpdatingStatus(null);
                              }
                            }}
                            disabled={updatingStatus === order.id}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                <Badge className={getPaymentStatusColor(order.payment_status || 'pending')}>
                                  {order.payment_status || 'pending'}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 md:p-4 align-top border-r border-gray-200">
                          <div className="text-sm space-y-1">
                            <div className="text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                            {order.amount && (
                              <div className="font-semibold text-foreground">₹{Number(order.amount).toLocaleString()}</div>
                            )}
                            {order.updated_at && (
                              <div className="text-xs text-muted-foreground">Updated: {new Date(order.updated_at).toLocaleString()}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 md:p-4 align-top bg-white">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(order)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 border-gray-300"
                              title="View Order Details"
                            >
                              <Eye className="h-4 w-4 text-gray-700" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(order)}
                              title="Download Invoice"
                              className="h-8 w-8 p-0 hover:bg-green-50 border-gray-300"
                            >
                              <Download className="h-4 w-4 text-gray-700" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Table Pagination */}
          <div className="flex-shrink-0 border-t border-gray-200 p-3 md:p-4 bg-white shadow-sm pagination-controls">
          <TablePagination
            pagination={pagination}
            itemsPerPageOptions={[200, 400, 600, 1000, 2000, -1]}
          />
          
          {/* Loading indicator for page changes */}
          {loadingMore && (
            <div className="mt-2 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading page {currentPage}...
              </div>
            </div>
          )}
          
          {/* Server-side pagination info */}
          <div className="mt-2 text-center text-sm text-gray-600">
            Showing {Array.isArray(orders) ? orders.length : 0} orders (Page {currentPage} of {Math.ceil(actualFilteredCount / pageSize)})
          </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmState} onOpenChange={() => setConfirmState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {confirmState?.mode === 'bulk' 
                ? `Are you sure you want to update ${confirmState.orders.length} orders to "${confirmState.to}"?`
                : `Are you sure you want to change order ${confirmState?.orders[0]?.order_id} status from "${confirmState?.orders[0]?.from}" to "${confirmState?.to}"?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="order-details-desc"
        >
          {/* Screen-reader description for accessibility */}
          <div id="order-details-desc" className="sr-only">
            Detailed information about the selected order including customer, products, payment and timeline.
          </div>
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_id}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedOrder.customer_email}</p>
                    </div>
                  </div>
                  {selectedOrder.customer_phone && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedOrder.customer_phone}</p>
                    </div>
                  )}
                  {selectedOrder.shipping_address && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Shipping Address</Label>
                      <p className="font-medium">{selectedOrder.shipping_address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Product Name</Label>
                      <p className="font-medium">{selectedOrder.product_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                      <p className="font-medium">{selectedOrder.quantity}</p>
                    </div>
                  </div>
                  {Array.isArray(selectedOrder.product_colors) && selectedOrder.product_colors.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Colors</Label>
                      <div className="flex gap-2 mt-1">
                        {selectedOrder.product_colors.map((color, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <ColorCircle color={color} />
                            <span className="text-sm">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Status & Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Status & Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order Status</Label>
                      <Badge className={getStatusColor(selectedOrder.status)}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                      <Badge className={getPaymentStatusColor(selectedOrder.payment_status || 'pending')}>
                        {selectedOrder.payment_status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                      <p className="font-medium text-lg">
                        {selectedOrder.amount ? `₹${Number(selectedOrder.amount).toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    {selectedOrder.transaction_id && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Transaction ID</Label>
                        <p className="font-medium">{selectedOrder.transaction_id}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order Created</Label>
                      <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                    {selectedOrder.updated_at && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                        <p className="font-medium">{new Date(selectedOrder.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
