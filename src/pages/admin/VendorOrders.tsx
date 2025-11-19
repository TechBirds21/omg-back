// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { 
  Search, 
  Building2, 
  Package, 
  Phone,
  Mail,
  MapPin,
  Printer,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Receipt,
  Send,
  RefreshCw,
  Clock,
  CheckCircle,
  ShoppingCart
} from 'lucide-react';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { getAllOrdersForAdmin, getVendors } from '@/lib/api-admin';
import type { Order, Vendor } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getColorName } from '@/lib/colorUtils';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';

interface VendorOrderGroup {
  vendorName: string;
  vendorId?: string;
  vendorCode?: string;
  orders: Order[];
}

const VendorOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading<{
    orders: Order[];
    vendors: Vendor[];
  }>({ minimumDelay: 300, preserveData: true });

  // Preserve scroll position during refreshes
  useScrollPreservation(isRefreshing);

  useEffect(() => {
    // Initial load - only run once on mount
    executeWithLoading(fetchData, { isRefresh: false, preserveData: false })
      .then(() => {
        setHasLoadedOnce(true);
      })
      .catch(() => {
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      });
  }, [executeWithLoading]);

  const fetchData = async () => {
    try {
      // Fetch all orders using the same optimized function as vendor performance page
      const orders = await getAllOrdersForAdmin();
      
      // Fetch vendors data for filtering
      const vendorsData = await getVendors();

      // Update state
      setOrders(orders);
      setVendors((vendorsData || []) as Vendor[]);

      return {
        orders,
        vendors: vendorsData || []
      };
    } catch (error) {
      
      throw error;
    }
  };

  const handleRefresh = async () => {
    try {
      // This will show the background refresh indicator instead of full loading
      await executeWithLoading(fetchData, { isRefresh: true, preserveData: true });
      toast({
        title: "Data Refreshed",
        description: "Vendor orders data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh vendor orders data.",
        variant: "destructive",
      });
    }
  };

  // Enhanced function to get vendor name for a product with better fallbacks
  const getVendorNameForProductSync = (order: Order, productIndex: number = 0): string => {
    try {
      const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      
      if (parsed && Array.isArray(parsed.items) && parsed.items[productIndex]) {
        const item = parsed.items[productIndex];
        
        // Try vendor_name first
        if (item.vendor_name && item.vendor_name.trim() !== '') {
          return item.vendor_name.trim();
        }
        
        // Try vendor field
        if (item.vendor && item.vendor.trim() !== '') {
          return item.vendor.trim();
        }
        
        // Try vendor_id lookup
        if (item.vendor_id) {
          const vendor = vendors.find(v => v.id === item.vendor_id);
          if (vendor) {
            return vendor.name || vendor.contact_person || `Vendor ${vendor.vendor_code}`;
          }
        }
        
        // Try vendor_code lookup
        if (item.vendor_code) {
          const vendor = vendors.find(v => v.vendor_code === item.vendor_code);
          if (vendor) {
            return vendor.name || vendor.contact_person || `Vendor ${vendor.vendor_code}`;
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
    if (order?.vendors?.vendor_code) {
      return `Vendor ${order.vendors.vendor_code}`;
    }
    if (order?.vendor_code) {
      return `Vendor ${order.vendor_code}`;
    }
    
    // Enhanced fallback - try to determine vendor from product name patterns
    const productName = order.product_name || '';
    if (productName.toLowerCase().includes('omgp')) {
      const prakashVendor = vendors.find(v => 
        v.name?.toLowerCase().includes('prakash') || 
        v.contact_person?.toLowerCase().includes('prakash')
      );
      if (prakashVendor) {
        return prakashVendor.name || prakashVendor.contact_person || `Vendor ${prakashVendor.vendor_code}`;
      }
    }
    
    if (productName.toLowerCase().includes('omgs')) {
      const surajVendor = vendors.find(v => 
        v.name?.toLowerCase().includes('suraj') || 
        v.contact_person?.toLowerCase().includes('suraj')
      );
      if (surajVendor) {
        return surajVendor.name || surajVendor.contact_person || `Vendor ${surajVendor.vendor_code}`;
      }
    }
    
    // Last resort - use first available vendor or create a generic name
    if (vendors.length > 0) {
      const firstVendor = vendors[0];
      return firstVendor.name || firstVendor.contact_person || `Vendor ${firstVendor.vendor_code}`;
    }
    
    return 'Unassigned Vendor';
  };

  // Function to get vendor orders grouped by vendor (excluding cancelled orders)
  const getVendorOrdersGrouped = (): VendorOrderGroup[] => {
    if (!Array.isArray(orders)) return [];
    
    const vendorGroups: { [vendorKey: string]: { vendorName: string; vendorId?: string; vendorCode?: string; orders: Order[] } } = {};
    
    // Filter out cancelled and refunded orders
    const activeOrders = orders.filter(order => 
      order.status !== 'cancelled' && order.status !== 'refunded'
    );
    
    activeOrders.forEach(order => {
      let vendorKey = '';
      let vendorName = '';
      let vendorId = '';
      let vendorCode = '';
      
      // Get vendor info from multiple sources - prioritize vendor_id for consistency
      if (order.vendor_id) {
        vendorId = order.vendor_id;
        vendorKey = vendorId; // Use vendor ID as key for consistency
        const vendor = vendors.find(v => v.id === vendorId);
        vendorName = vendor?.name || vendor?.contact_person || `Vendor ${vendorId}`;
        vendorCode = vendor?.vendor_code || order.vendor_code || '';
      } else if (order.product?.vendor_id) {
        vendorId = order.product.vendor_id;
        vendorKey = vendorId; // Use vendor ID as key for consistency
        const vendor = vendors.find(v => v.id === vendorId);
        vendorName = vendor?.name || vendor?.contact_person || `Vendor ${vendorId}`;
        vendorCode = vendor?.vendor_code || '';
      } else if (order.vendor_code) {
        vendorCode = order.vendor_code;
        const vendor = vendors.find(v => v.vendor_code === vendorCode);
        if (vendor) {
          vendorId = vendor.id;
          vendorKey = vendorId; // Use vendor ID as key for consistency
          vendorName = vendor.name || vendor.contact_person || `Vendor ${vendorCode}`;
        } else {
          vendorKey = `code_${vendorCode}`;
          vendorName = `Vendor ${vendorCode}`;
        }
      } else {
        // Try to get vendor from applied_offer
        try {
          const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          
          if (parsed && Array.isArray(parsed.items) && parsed.items[0]) {
            const item = parsed.items[0];
            if (item.vendor_id) {
              vendorId = item.vendor_id;
              vendorKey = vendorId; // Use vendor ID as key for consistency
              const vendor = vendors.find(v => v.id === vendorId);
              vendorName = vendor?.name || vendor?.contact_person || item.vendor_name || `Vendor ${vendorId}`;
              vendorCode = vendor?.vendor_code || item.vendor_code || '';
            } else if (item.vendor_code) {
              vendorCode = item.vendor_code;
              const vendor = vendors.find(v => v.vendor_code === vendorCode);
              if (vendor) {
                vendorId = vendor.id;
                vendorKey = vendorId; // Use vendor ID as key for consistency
                vendorName = vendor.name || vendor.contact_person || item.vendor_name || `Vendor ${vendorCode}`;
              } else {
                vendorKey = `code_${vendorCode}`;
                vendorName = item.vendor_name || `Vendor ${vendorCode}`;
              }
            } else if (item.vendor_name) {
              vendorName = item.vendor_name;
              // Try to find vendor by name
              const vendor = vendors.find(v => 
                v.name?.toLowerCase() === item.vendor_name.toLowerCase() ||
                v.contact_person?.toLowerCase() === item.vendor_name.toLowerCase()
              );
              if (vendor) {
                vendorId = vendor.id;
                vendorKey = vendorId;
                vendorCode = vendor.vendor_code;
              } else {
                vendorKey = `name_${vendorName}`;
              }
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Fallback if no vendor info found
      if (!vendorKey) {
        vendorName = getVendorNameForProductSync(order, 0);
        // Try to find vendor by name for fallback
        const vendor = vendors.find(v => 
          v.name?.toLowerCase() === vendorName.toLowerCase() ||
          v.contact_person?.toLowerCase() === vendorName.toLowerCase()
        );
        if (vendor) {
          vendorId = vendor.id;
          vendorKey = vendorId;
          vendorCode = vendor.vendor_code;
        } else {
          vendorKey = `name_${vendorName}`;
        }
      }
      
      // Create or update vendor group
      if (!vendorGroups[vendorKey]) {
        vendorGroups[vendorKey] = {
          vendorName,
          vendorId: vendorId || undefined,
          vendorCode: vendorCode || undefined,
          orders: []
        };
      }
      
      // Check if this order is already in this vendor's group
      const existingOrder = vendorGroups[vendorKey].orders.find(o => o.id === order.id);
      if (!existingOrder) {
        vendorGroups[vendorKey].orders.push(order);
      }
    });
    
    return Object.values(vendorGroups);
  };

  const toggleVendorExpansion = (vendorName: string) => {
    const newExpanded = new Set(expandedVendors);
    if (newExpanded.has(vendorName)) {
      newExpanded.delete(vendorName);
    } else {
      newExpanded.add(vendorName);
    }
    setExpandedVendors(newExpanded);
  };

  // Export vendor orders to Excel (same format as main Orders page)
  const handleExportVendorOrdersExcel = (vendorGroup: VendorOrderGroup) => {
    const { vendorName, orders } = vendorGroup;
    
    const exportData: Array<Record<string, string | number>> = [];
    
    orders.forEach(order => {
      // Get filtered product details
      try {
        const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        if (parsed && Array.isArray(parsed.items)) {
          parsed.items.forEach((item: any, index: number) => {
            const itemVendorName = getVendorNameForProductSync(order, index);
            if (itemVendorName === vendorName) {
              exportData.push({
                'S.No': exportData.length + 1,
                'Order ID': order.order_id || 'N/A',
                'Customer Name': order.customer_name || 'N/A',
                'Customer Phone': order.customer_phone || 'N/A',
                'Customer Address': order.shipping_address || 'N/A',
                'Product Name': item.name || order.product_name || 'N/A',
                'Product Color': getColorName(item.color || 'N/A'),
                'Product Size': item.size || (item.sizes && item.sizes.length > 0 ? item.sizes.join(', ') : 'N/A'),
                'Product Image': item.image || 'N/A',
                'Quantity': Number(item.quantity || 1),
                'Vendor': vendorName,
                'Status': order.status || 'N/A',
                'Payment Status': order.payment_status || 'N/A',
                'Amount': order.amount || 0,
                'Order Date': new Date(order.created_at).toLocaleDateString()
              });
            }
          });
        } else {
          // Single product order
          const orderVendorName = getVendorNameForProductSync(order, 0);
          if (orderVendorName === vendorName) {
            exportData.push({
              'S.No': exportData.length + 1,
              'Order ID': order.order_id || 'N/A',
              'Customer Name': order.customer_name || 'N/A',
              'Customer Phone': order.customer_phone || 'N/A',
              'Customer Address': order.shipping_address || 'N/A',
              'Product Name': order.product_name || 'N/A',
              'Product Color': getColorName((Array.isArray(order.product_colors) && order.product_colors[0]) || 'N/A'),
              'Product Size': (Array.isArray(order.product_sizes) && order.product_sizes[0]) || 'N/A',
              'Product Image': 'N/A',
              'Quantity': Number(order.quantity || 1),
              'Vendor': vendorName,
              'Status': order.status || 'N/A',
              'Payment Status': order.payment_status || 'N/A',
              'Amount': order.amount || 0,
              'Order Date': new Date(order.created_at).toLocaleDateString()
            });
          }
        }
      } catch (e) {
        // Fallback for parsing errors
        const orderVendorName = getVendorNameForProductSync(order, 0);
        if (orderVendorName === vendorName) {
          exportData.push({
            'S.No': exportData.length + 1,
            'Order ID': order.order_id || 'N/A',
            'Customer Name': order.customer_name || 'N/A',
            'Customer Phone': order.customer_phone || 'N/A',
            'Customer Address': order.shipping_address || 'N/A',
            'Product Name': order.product_name || 'N/A',
            'Product Color': getColorName((Array.isArray(order.product_colors) && order.product_colors[0]) || 'N/A'),
            'Product Image': 'N/A',
            'Quantity': Number(order.quantity || 1),
            'Vendor': vendorName,
            'Status': order.status || 'N/A',
            'Payment Status': order.payment_status || 'N/A',
            'Amount': order.amount || 0,
            'Order Date': new Date(order.created_at).toLocaleDateString()
          });
        }
      }
    });
    
    // Create and download Excel file
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths for better presentation
    const colWidths = [
      { wch: 8 },  // S.No
      { wch: 15 }, // Order ID
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Customer Phone
      { wch: 30 }, // Customer Address
      { wch: 25 }, // Product Name
      { wch: 15 }, // Product Color
      { wch: 12 }, // Product Size
      { wch: 40 }, // Product Image
      { wch: 10 }, // Quantity
      { wch: 20 }, // Vendor
      { wch: 12 }, // Status
      { wch: 15 }, // Payment Status
      { wch: 12 }, // Amount
      { wch: 20 }  // Order Date
    ];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${vendorName} Orders`);
    XLSX.writeFile(wb, `vendor-orders-${vendorName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Vendor Orders Exported",
      description: `Orders for ${vendorName} exported to Excel successfully.`,
    });
  };

  // Export vendor orders to PDF (same format as main Orders page)
  const handleExportVendorOrdersPDF = async (vendorGroup: VendorOrderGroup) => {
    const { vendorName, orders } = vendorGroup;

    // Show loading toast
    const loadingToast = toast({
      title: "Generating PDF...",
      description: `Please wait while we prepare the vendor orders report for ${vendorName}.`,
      duration: 30000, // 30 seconds
    });

    try {
      const doc = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'mm', 
        format: 'a4'
      });

      doc.setProperties({
        title: 'Vendor Orders Report',
        subject: 'Vendor Orders Export',
        author: 'O Maguva Admin',
        creator: 'O Maguva System'
      });

      const pageWidth = doc.internal.pageSize.width;
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const titleText = 'O Maguva - Vendor Orders Report';
      doc.text(titleText, pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const generatedText = `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      doc.text(generatedText, pageWidth / 2, 30, { align: "center" });
      
      const vendorText = `Vendor: ${vendorName}`;
      doc.text(vendorText, pageWidth / 2, 36, { align: "center" });
      
      const totalText = `Total Orders: ${orders.length}`;
      doc.text(totalText, pageWidth / 2, 42, { align: "center" });

      // Table header (vendor-specific - no vendor column, no amount column)
      const header = ['S.No', 'Order ID', 'Customer', 'Address', 'Product', 'Order Date'];
      const colWidths = [10, 30, 35, 45, 65, 25];
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

      // Helper to get product items for an order (same as main Orders page)
      const getProductItems = async (order: Order) => {
        const items: Array<{name: string, color: string, quantity: number, image: string | null, vendor: string, size?: string, sizes?: string[]}> = [];
        
        try {
          const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          
          if (parsed && Array.isArray(parsed.items)) {
            for (const item of parsed.items) {
              const itemVendorName = getVendorNameForProductSync(order, parsed.items.indexOf(item));
              if (itemVendorName === vendorName) {
                items.push({
                  name: item.name || order.product_name || 'N/A',
                  color: item.color || 'N/A',
                  quantity: Number(item.quantity || 1),
                  image: item.image || null,
                  vendor: itemVendorName,
                  size: item.size,
                  sizes: item.sizes
                });
              }
            }
          } else {
            // Single product order
            const orderVendorName = getVendorNameForProductSync(order, 0);
            if (orderVendorName === vendorName) {
              items.push({
                name: order.product_name || 'N/A',
                color: Array.isArray(order.product_colors) ? order.product_colors[0] : 'N/A',
                quantity: Number(order.quantity || 1),
                image: null,
                vendor: orderVendorName,
                size: Array.isArray(order.product_sizes) && order.product_sizes[0] ? order.product_sizes[0] : undefined,
                sizes: Array.isArray(order.product_sizes) ? order.product_sizes : undefined
              });
            }
          }
        } catch (e) {
          // Fallback for parsing errors
          const orderVendorName = getVendorNameForProductSync(order, 0);
          if (orderVendorName === vendorName) {
            items.push({
              name: order.product_name || 'N/A',
              color: Array.isArray(order.product_colors) ? order.product_colors[0] : 'N/A',
              quantity: Number(order.quantity || 1),
              image: null,
              vendor: orderVendorName,
              size: Array.isArray(order.product_sizes) && order.product_sizes[0] ? order.product_sizes[0] : undefined,
              sizes: Array.isArray(order.product_sizes) ? order.product_sizes : undefined
            });
          }
        }
        return items;
      };

      // Data rows - one row per order with items stacked vertically (same as main Orders page)
      let rowIndex = 0;
      for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {
        const order = orders[orderIndex];
        const items = await getProductItems(order);
        
        if (items.length === 0) continue; // Skip if no items for this vendor
        
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
        [customerName, customerPhone].forEach(text => {
          doc.setFontSize(6); // Ensure consistent font size for measurement
          if (doc.getTextWidth(text) <= customerCellWidth) {
            wrappedCustomerLines.push(text);
          } else {
            // For long text, break by words
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
        });
        
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

        yPosition += rowHeight;
        rowIndex++;
      }

      const fileName = `vendor-orders-${vendorName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      loadingToast.dismiss();
      
      try {
        // Try direct save first
        doc.save(fileName);
        toast({
          title: "PDF Exported Successfully",
          description: `Vendor orders report saved as ${fileName}`,
        });
      } catch (saveError) {
        // Direct save failed, trying blob method
        
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
            description: `Vendor orders report downloaded as ${fileName}`,
          });
          
        } catch (blobError) {
          console.error('PDF download error:', blobError);
          toast({
            title: "Export Failed",
            description: "Failed to download PDF. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      loadingToast.dismiss();
      console.error('PDF generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Export Failed",
        description: `Failed to generate PDF: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  // Export all vendor orders to Excel (same format as main Orders page)
  const handleExportAllVendorOrdersExcel = () => {
    const vendorGroups = getVendorOrdersGrouped();
    const exportData: Array<Record<string, string | number>> = [];
    
    if (!Array.isArray(vendorGroups)) return;
    
    vendorGroups.forEach(vendorGroup => {
      const { vendorName, orders } = vendorGroup;
      
      orders.forEach(order => {
        // Get filtered product details
        try {
          const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          
          if (parsed && Array.isArray(parsed.items)) {
            parsed.items.forEach((item: any, index: number) => {
              const itemVendorName = getVendorNameForProductSync(order, index);
              if (itemVendorName === vendorName) {
                exportData.push({
                  'S.No': exportData.length + 1,
                  'Order ID': order.order_id || 'N/A',
                  'Customer Name': order.customer_name || 'N/A',
                  'Customer Phone': order.customer_phone || 'N/A',
                  'Customer Address': order.shipping_address || 'N/A',
                  'Product Name': item.name || order.product_name || 'N/A',
                  'Product Color': getColorName(item.color || 'N/A'),
                  'Product Size': item.size || (item.sizes && item.sizes.length > 0 ? item.sizes.join(', ') : 'N/A'),
                  'Product Image': item.image || 'N/A',
                  'Quantity': Number(item.quantity || 1),
                  'Vendor': vendorName,
                  'Status': order.status || 'N/A',
                  'Payment Status': order.payment_status || 'N/A',
                  'Amount': order.amount || 0,
                  'Order Date': new Date(order.created_at).toLocaleDateString()
                });
              }
            });
          } else {
            // Single product order
            const orderVendorName = getVendorNameForProductSync(order, 0);
            if (orderVendorName === vendorName) {
              exportData.push({
                'S.No': exportData.length + 1,
                'Order ID': order.order_id || 'N/A',
                'Customer Name': order.customer_name || 'N/A',
                'Customer Phone': order.customer_phone || 'N/A',
                'Customer Address': order.shipping_address || 'N/A',
                'Product Name': order.product_name || 'N/A',
                'Product Color': getColorName((Array.isArray(order.product_colors) && order.product_colors[0]) || 'N/A'),
                'Product Size': (Array.isArray(order.product_sizes) && order.product_sizes[0]) || 'N/A',
                'Product Image': 'N/A',
                'Quantity': Number(order.quantity || 1),
                'Vendor': vendorName,
                'Status': order.status || 'N/A',
                'Payment Status': order.payment_status || 'N/A',
                'Amount': order.amount || 0,
                'Order Date': new Date(order.created_at).toLocaleDateString()
              });
            }
          }
        } catch (e) {
          // Fallback for parsing errors
          const orderVendorName = getVendorNameForProductSync(order, 0);
          if (orderVendorName === vendorName) {
            exportData.push({
              'S.No': exportData.length + 1,
              'Order ID': order.order_id || 'N/A',
              'Customer Name': order.customer_name || 'N/A',
              'Customer Phone': order.customer_phone || 'N/A',
              'Customer Address': order.shipping_address || 'N/A',
              'Product Name': order.product_name || 'N/A',
              'Product Color': getColorName((Array.isArray(order.product_colors) && order.product_colors[0]) || 'N/A'),
              'Product Size': (Array.isArray(order.product_sizes) && order.product_sizes[0]) || 'N/A',
              'Product Image': 'N/A',
              'Quantity': Number(order.quantity || 1),
              'Vendor': vendorName,
              'Status': order.status || 'N/A',
              'Payment Status': order.payment_status || 'N/A',
              'Amount': order.amount || 0,
              'Order Date': new Date(order.created_at).toLocaleDateString()
            });
          }
        }
      });
    });
    
    // Create and download Excel file
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths for better presentation
    const colWidths = [
      { wch: 8 },  // S.No
      { wch: 15 }, // Order ID
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Customer Phone
      { wch: 30 }, // Customer Address
      { wch: 25 }, // Product Name
      { wch: 15 }, // Product Color
      { wch: 12 }, // Product Size
      { wch: 40 }, // Product Image
      { wch: 10 }, // Quantity
      { wch: 20 }, // Vendor
      { wch: 12 }, // Status
      { wch: 15 }, // Payment Status
      { wch: 12 }, // Amount
      { wch: 20 }  // Order Date
    ];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Vendor Orders');
    XLSX.writeFile(wb, `all-vendor-orders-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "All Vendor Orders Exported",
      description: `All vendor orders exported to Excel successfully.`,
    });
  };

  // Filter vendor groups based on search, vendor filter, status filter, and date filters
  const filteredVendorGroups = useMemo(() => {
    const allGroups = getVendorOrdersGrouped();
    // Debug logging removed for production
    
    return allGroups
      .map(group => {
        const { vendorName, vendorId, vendorCode, orders } = group;
        
        // Filter by vendor - use the group's vendor info for direct matching
        if (vendorFilter !== 'all') {
          const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
          
          if (selectedVendor) {
            // Check if this vendor group matches the selected vendor
            let isVendorMatch = false;
            
            // Direct vendor ID match (most reliable)
            if (vendorId && String(vendorId) === String(selectedVendor.id)) {
              isVendorMatch = true;
            }
            // Vendor code match
            else if (vendorCode && String(vendorCode) === String(selectedVendor.vendor_code)) {
              isVendorMatch = true;
            }
            // Exact vendor name match (more strict)
            else if (vendorName === selectedVendor.name || vendorName === selectedVendor.contact_person) {
              isVendorMatch = true;
            }
            // Partial vendor name match (fallback, but more strict)
            else if (selectedVendor.name && vendorName.toLowerCase() === selectedVendor.name.toLowerCase()) {
              isVendorMatch = true;
            }
            else if (selectedVendor.contact_person && vendorName.toLowerCase() === selectedVendor.contact_person.toLowerCase()) {
              isVendorMatch = true;
            }
            
            // Debug logging removed for production
            
            if (!isVendorMatch) {
              return null; // Exclude this vendor group
            }
          }
        }
        
        // Filter orders within the group by status, search, and date/time
        const filteredOrders = orders.filter(order => {
          // Search filter
          const lowerSearch = searchTerm.toLowerCase();
          const searchMatch = !lowerSearch ||
            order.order_id?.toLowerCase().includes(lowerSearch) ||
            order.customer_name?.toLowerCase().includes(lowerSearch) ||
            order.product_name?.toLowerCase().includes(lowerSearch) ||
            vendorName.toLowerCase().includes(lowerSearch);
          
          // Status filter
          const statusMatch = statusFilter === 'all' || order.status === statusFilter;
          
          // Debug status filtering
          if (statusFilter !== 'all' && order.status !== statusFilter) {
            // Filtering out order based on status
          }
          
          // Date and time filter
          const dateTimeMatch = (() => {
            if (!startDate && !endDate && !startTime && !endTime) return true;
            
            const orderDate = new Date(order.created_at);
            
            // Date filtering
            if (startDate || endDate) {
              const start = startDate ? new Date(startDate) : null;
              const end = endDate ? new Date(endDate) : null;
              
              // Set start to beginning of day
              if (start) {
                start.setHours(0, 0, 0, 0);
              }
              
              // Set end to end of day
              if (end) {
                end.setHours(23, 59, 59, 999);
              }
              
              if (start && end) {
                const isInRange = orderDate >= start && orderDate <= end;
                if (!isInRange) return false;
              } else if (start) {
                const isAfterStart = orderDate >= start;
                if (!isAfterStart) return false;
              } else if (end) {
                const isBeforeEnd = orderDate <= end;
                if (!isBeforeEnd) return false;
              }
            }
            
            // Time filtering (within the same day)
            if (startTime || endTime) {
              const orderTime = orderDate.getHours() * 60 + orderDate.getMinutes();
              
              if (startTime) {
                const timeParts = startTime.split(':');
                if (timeParts.length >= 2) {
                  const startHour = parseInt(timeParts[0]) || 0;
                  const startMinute = parseInt(timeParts[1]) || 0;
                  const startTimeMinutes = startHour * 60 + startMinute;
                  const isAfterStartTime = orderTime >= startTimeMinutes;
                  if (!isAfterStartTime) return false;
                }
              }
              
              if (endTime) {
                const timeParts = endTime.split(':');
                if (timeParts.length >= 2) {
                  const endHour = parseInt(timeParts[0]) || 0;
                  const endMinute = parseInt(timeParts[1]) || 0;
                  const endTimeMinutes = endHour * 60 + endMinute;
                  const isBeforeEndTime = orderTime <= endTimeMinutes;
                  if (!isBeforeEndTime) return false;
                }
              }
            }
            return true;
          })();
          
          return searchMatch && statusMatch && dateTimeMatch;
        });

        const result = filteredOrders.length > 0 ? { vendorName, vendorId, vendorCode, orders: filteredOrders } : null;
        
        if (result) {
          // Including vendor group
        } else {
          // Excluding vendor group - no orders after filtering
        }
        
        return result;
      })
      .filter(Boolean) as VendorOrderGroup[];
      
    // Final filtering results
    
    if (filtered.length === 0) {
      // No results found - check filters
    }
    
    return filtered;
  }, [vendorFilter, statusFilter, searchTerm, startDate, endDate, startTime, endTime, vendors, orders]);

  // Calculate total orders (excluding cancelled and refunded for consistency)
  const totalOrders = orders.filter(order => 
    order.status !== 'cancelled' && order.status !== 'refunded'
  ).length;
  const totalVendors = getVendorOrdersGrouped().length;

  // Calculate total quantity (sarees sold) - exclude cancelled and refunded for consistency
  const getTotalQuantity = () => {
    let totalQuantity = 0;
    orders.forEach(order => {
      if (order.status !== 'cancelled' && order.status !== 'refunded') {
        try {
          // First check if order has items array directly
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              totalQuantity += Number(item.quantity || 1);
            });
          }
          // Fallback to applied_offer if items not present
          else {
            const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            
            if (parsed && Array.isArray(parsed.items)) {
              // Multi-product order - sum all quantities
              parsed.items.forEach((item: any) => {
                totalQuantity += Number(item.quantity || 1);
              });
            } else {
              // Single product order
              totalQuantity += Number(order.quantity || 1);
            }
          }
        } catch (e) {
          // Fallback to single quantity if parsing fails
          totalQuantity += Number(order.quantity || 1);
        }
      }
    });
    return totalQuantity;
  };

  const totalQuantity = getTotalQuantity();

  // Calculate active quantity (excluding cancelled and refunded)
  const getActiveQuantity = () => {
    let activeQuantity = 0;
    orders.forEach(order => {
      if (order.status !== 'cancelled' && order.status !== 'refunded') {
        try {
          // First check if order has items array directly
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              activeQuantity += Number(item.quantity || 1);
            });
          }
          // Fallback to applied_offer if items not present
          else {
            const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            
            if (parsed && Array.isArray(parsed.items)) {
              parsed.items.forEach((item: any) => {
                activeQuantity += Number(item.quantity || 1);
              });
            } else {
              activeQuantity += Number(order.quantity || 1);
            }
          }
        } catch (e) {
          activeQuantity += Number(order.quantity || 1);
        }
      }
    });
    return activeQuantity;
  };

  const activeQuantity = getActiveQuantity();

  // Calculate status counts and quantities (excluding cancelled and refunded)
  const getStatusCounts = () => {
    const statusCounts = {
      pending: { orders: 0, quantity: 0 },
      confirmed: { orders: 0, quantity: 0 },
      processing: { orders: 0, quantity: 0 },
      ready_to_ship: { orders: 0, quantity: 0 },
      shipped: { orders: 0, quantity: 0 },
      delivered: { orders: 0, quantity: 0 }
    };

    orders.forEach(order => {
      if (order.status && 
          order.status !== 'cancelled' && 
          order.status !== 'refunded' && 
          statusCounts.hasOwnProperty(order.status)) {
        
        statusCounts[order.status as keyof typeof statusCounts].orders++;
        
        // Calculate quantity for this order
        let orderQuantity = 0;
        try {
          const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          
          if (parsed && Array.isArray(parsed.items)) {
            // Multi-product order - sum all quantities
            parsed.items.forEach((item: any) => {
              orderQuantity += Number(item.quantity || 1);
            });
          } else {
            // Single product order
            orderQuantity = Number(order.quantity || 1);
          }
        } catch (e) {
          // Fallback to single quantity if parsing fails
          orderQuantity = Number(order.quantity || 1);
        }
        
        statusCounts[order.status as keyof typeof statusCounts].quantity += orderQuantity;
      }
    });

    return statusCounts;
  };

  const statusCounts = getStatusCounts();

  const stats = [
    {
      title: 'Active Orders',
      value: totalOrders,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Excluding cancelled'
    },
    {
      title: 'Active Sarees',
      value: totalQuantity,
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Excluding cancelled'
    },
    {
      title: 'Active Vendors',
      value: totalVendors,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Vendor count'
    }
  ];

  const statusCards = [
    {
      title: 'Pending',
      orders: statusCounts.pending.orders,
      quantity: statusCounts.pending.quantity,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Confirmed',
      orders: statusCounts.confirmed.orders,
      quantity: statusCounts.confirmed.quantity,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Processing',
      orders: statusCounts.processing.orders,
      quantity: statusCounts.processing.quantity,
      icon: RefreshCw,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Ready to Ship',
      orders: statusCounts.ready_to_ship.orders,
      quantity: statusCounts.ready_to_ship.quantity,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Shipped',
      orders: statusCounts.shipped.orders,
      quantity: statusCounts.shipped.quantity,
      icon: Send,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Delivered',
      orders: statusCounts.delivered.orders,
      quantity: statusCounts.delivered.quantity,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendor Orders</h1>
          <p className="text-muted-foreground">Manage orders grouped by vendor for easy processing</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={handleExportAllVendorOrdersExcel}
            disabled={filteredVendorGroups.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All Orders
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="space-y-6">
        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 border-l-4 hover:scale-105 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  {stat.description && (
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor} flex-shrink-0`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statusCards.map((status, index) => (
            <Card key={index} className={`hover:shadow-lg transition-shadow border-l-4 border-l-primary/20 hover-scale ${status.bgColor}`}>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`p-2 rounded-lg ${status.bgColor} flex-shrink-0`}>
                    <status.icon className={`h-5 w-5 ${status.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{status.orders}</p>
                    <p className="text-xs font-medium text-muted-foreground">{status.title}</p>
                    <p className="text-xs text-muted-foreground">({status.quantity} sarees)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by order ID, customer name, product name, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Select value={vendorFilter} onValueChange={(value) => {
          // Vendor filter changed
          setVendorFilter(value);
        }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name || vendor.contact_person || `Vendor ${vendor.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
         <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="w-48">
             <SelectValue placeholder="All Status" />
           </SelectTrigger>
         <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
         </Select>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">From:</span>
            <div className="flex gap-1 items-center">
              <Input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <Input
                type="time"
                placeholder="Start Time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-28"
                title="Start Time (24-hour format)"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">To:</span>
            <div className="flex gap-1 items-center">
              <Input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
              <Input
                type="time"
                placeholder="End Time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-28"
                title="End Time (24-hour format)"
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setVendorFilter('all');
              setStatusFilter('all');
              setStartDate('');
              setEndDate('');
              setStartTime('');
              setEndTime('');
            }}
            className="px-4"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Vendor Orders */}
      <div className="space-y-4">
        {filteredVendorGroups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Vendor Orders Found</h3>
              <p className="text-muted-foreground">No orders found for the selected filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredVendorGroups.map((vendorGroup) => {
            const { vendorName, orders } = vendorGroup;
            const isExpanded = expandedVendors.has(vendorName);
            
            return (
              <Card key={vendorName} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleVendorExpansion(vendorName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{vendorName}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{orders.length} orders</span>
                          <span>{(() => {
                            let totalQuantity = 0;
                            orders.forEach(order => {
                              try {
                                const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
                                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                
                                if (parsed && Array.isArray(parsed.items)) {
                                  parsed.items.forEach((item: any) => {
                                    totalQuantity += Number(item.quantity || 1);
                                  });
                                } else {
                                  totalQuantity += Number(order.quantity || 1);
                                }
                              } catch (e) {
                                totalQuantity += Number(order.quantity || 1);
                              }
                            });
                            return `${totalQuantity} sarees`;
                          })()}</span>
                          <span>Total: ₹{orders.reduce((sum, order) => sum + (order.amount || 0), 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportVendorOrdersExcel(vendorGroup);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportVendorOrdersPDF(vendorGroup);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {/* Orders Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                         <thead>
                             <tr className="border-b">
                            <th className="text-left p-3 font-medium text-muted-foreground">ORDER ID</th>
                             <th className="text-left p-3 font-medium text-muted-foreground">CUSTOMER INFO</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">ADDRESS</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">PRODUCT DETAILS</th>
                             <th className="text-left p-3 font-medium text-muted-foreground">STATUS</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">AMOUNT</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">DATE</th>
                           </tr>
                         </thead>
                         <tbody>
                          {orders.map((order) => {
                            // Get product items for this order and vendor
                            const getOrderItems = () => {
                              const items: Array<{name: string, color: string, quantity: number, image: string | null, size?: string, sizes?: string[]}> = [];
                              
                              try {
                                const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
                                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                
                                if (parsed && Array.isArray(parsed.items)) {
                                  parsed.items.forEach((item: any, index: number) => {
                                    const itemVendorName = getVendorNameForProductSync(order, index);
                                    if (itemVendorName === vendorName) {
                                      items.push({
                                        name: item.name || order.product_name || 'N/A',
                                        color: item.color || 'N/A',
                                        quantity: Number(item.quantity || 1),
                                        image: item.image || null,
                                        size: item.size,
                                        sizes: item.sizes
                                      });
                                    }
                                  });
                                } else {
                                  // Single product order
                                  const orderVendorName = getVendorNameForProductSync(order, 0);
                                  if (orderVendorName === vendorName) {
                                    items.push({
                                      name: order.product_name || 'N/A',
                                      color: Array.isArray(order.product_colors) ? order.product_colors[0] : 'N/A',
                                      quantity: Number(order.quantity || 1),
                                      image: null,
                                      size: (Array.isArray(order.product_sizes) && order.product_sizes[0]) || undefined,
                                      sizes: Array.isArray(order.product_sizes) ? order.product_sizes : undefined
                                    });
                                  }
                                }
                              } catch (e) {
                                // Fallback for parsing errors
                                const orderVendorName = getVendorNameForProductSync(order, 0);
                                if (orderVendorName === vendorName) {
                                  items.push({
                                    name: order.product_name || 'N/A',
                                    color: Array.isArray(order.product_colors) ? order.product_colors[0] : 'N/A',
                                    quantity: Number(order.quantity || 1),
                                    image: null,
                                    size: (Array.isArray(order.product_sizes) && order.product_sizes[0]) || undefined,
                                    sizes: Array.isArray(order.product_sizes) ? order.product_sizes : undefined
                                  });
                                }
                              }
                              return items;
                            };

                            const orderItems = getOrderItems();
                            
                             return (
                             <tr key={order.id} className="border-b hover:bg-muted/30">
                               <td className="p-3">
                                  <p className="font-medium text-sm">{order.order_id}</p>
                               </td>
                               <td className="p-3">
                                 <div className="text-sm">
                                   <p className="font-medium">{order.customer_name}</p>
                                   <p className="text-muted-foreground">{order.customer_phone || 'N/A'}</p>
                                 </div>
                               </td>
                               <td className="p-3">
                                  <div className="text-sm max-w-xs">
                                    <p className="text-muted-foreground break-words" title={order.shipping_address}>
                                      {order.shipping_address || 'N/A'}
                                 </p>
                                  </div>
                               </td>
                               <td className="p-3">
                                  <div className="space-y-2">
                                    {orderItems.map((item, index) => (
                                      <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                                        {item.image && (
                                          <img 
                                            src={item.image} 
                                            alt={item.name}
                                            className="w-8 h-8 object-cover rounded"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-semibold text-gray-900 truncate">{item.name}</div>
                                          <div className="text-xs text-gray-600">
                                            {getColorName(item.color)} • Qty: {item.quantity}
                                            {item.size && (
                                              <> • Size: <span className="font-medium text-green-600">{item.size}</span></>
                                            )}
                                            {(() => {
                                              // Check if this is a dress product and show size
                                              const isDress = item.name && (
                                                item.name.toLowerCase().includes('dress') || 
                                                item.name.toLowerCase().includes('gown') ||
                                                item.name.toLowerCase().includes('frock') ||
                                                item.name.toLowerCase().includes('lehenga') ||
                                                item.name.toLowerCase().includes('saree')
                                              );
                                              
                                              if (isDress && !item.size && !item.sizes) {
                                                // Try to get size from applied_offer item
                                                try {
                                                  const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
                                                  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                                  if (parsed && Array.isArray(parsed.items)) {
                                                    const orderItem = parsed.items.find((it: any) => it.name === item.name);
                                                    if (orderItem) {
                                                      if (orderItem.size) {
                                                        return <> • Size: <span className="font-medium text-green-600">{orderItem.size}</span></>;
                                                      }
                                                      if (orderItem.sizes && Array.isArray(orderItem.sizes) && orderItem.sizes.length > 0) {
                                                        return <> • Sizes: <span className="font-medium text-green-600">{orderItem.sizes.join(', ')}</span></>;
                                                      }
                                                    }
                                                  }
                                                } catch (e) {
                                                  // Ignore parsing errors
                                                }
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {orderItems.length === 0 && (
                                      <div className="text-sm text-muted-foreground">No products for this vendor</div>
                                    )}
                                  </div>
                               </td>
                               <td className="p-3">
                                  <Badge variant={
                                    order.status === 'confirmed' ? 'default' :
                                    order.status === 'pending' ? 'secondary' :
                                    order.status === 'processing' ? 'default' :
                                    order.status === 'ready_to_ship' ? 'outline' :
                                    order.status === 'shipped' ? 'outline' : 
                                    order.status === 'delivered' ? 'default' : 'destructive'
                                  }>
                                    {order.status || 'pending'}
                                 </Badge>
                               </td>
                                <td className="p-3">
                                  <p className="font-medium">₹{order.amount || 0}</p>
                                </td>
                                <td className="p-3">
                                  <p className="text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                               </td>
                             </tr>
                             );
                           })}
                         </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VendorOrders;
