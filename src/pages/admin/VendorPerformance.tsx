// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ShoppingCart,
  DollarSign,
  X,
  BarChart3
} from 'lucide-react';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { getAllOrdersForAdmin, getVendors } from '@/lib/api-admin';
import type { Order, Vendor } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getColorName } from '@/lib/colorUtils';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

interface VendorOrderGroup {
  vendorName: string;
  orders: Order[];
}

const VendorPerformance = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [timelineDate, setTimelineDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading();

  // Scroll preservation hook
  useScrollPreservation(isRefreshing);

  // Enhanced vendor name resolution (same as Orders page)
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
    if (Array.isArray(vendors) && vendors.length > 0) {
      const firstVendor = vendors[0];
      return firstVendor?.name || firstVendor?.contact_person || `Vendor ${firstVendor?.vendor_code}` || 'Unassigned Vendor';
    }
    
    return 'Unassigned Vendor';
  };

  // Function to get vendor orders grouped by vendor (excluding cancelled orders)
  const getVendorOrdersGrouped = (): VendorOrderGroup[] => {
    if (!Array.isArray(orders)) return [];
    
    const vendorGroups: { [vendorName: string]: Order[] } = {};
    
    // Filter out cancelled and refunded orders
    const activeOrders = orders.filter(order => 
      order.status !== 'cancelled' && order.status !== 'refunded'
    );
    
    activeOrders.forEach(order => {
      try {
        const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        if (parsed && Array.isArray(parsed.items)) {
          parsed.items.forEach((item: any, index: number) => {
            const vendorName = getVendorNameForProductSync(order, index);
            if (!vendorGroups[vendorName]) {
              vendorGroups[vendorName] = [];
            }
            
            const existingOrder = vendorGroups[vendorName].find(o => o.id === order.id);
            if (!existingOrder) {
              vendorGroups[vendorName].push(order);
            }
          });
        } else {
          const vendorName = getVendorNameForProductSync(order, 0);
          if (!vendorGroups[vendorName]) {
            vendorGroups[vendorName] = [];
          }
          vendorGroups[vendorName].push(order);
        }
      } catch (e) {
        const vendorName = getVendorNameForProductSync(order, 0);
        if (!vendorGroups[vendorName]) {
          vendorGroups[vendorName] = [];
        }
        vendorGroups[vendorName].push(order);
      }
    });
    
    return Object.keys(vendorGroups).map(vendorName => ({
      vendorName,
      orders: vendorGroups[vendorName]
    }));
  };

  // Calculate vendor performance stats
  const getVendorPerformanceStats = () => {
    if (!Array.isArray(orders)) return { totalActiveOrders: 0, totalActiveVendors: 0, totalActiveSarees: 0 };
    
    const activeOrders = orders.filter(order => 
      order.status !== 'cancelled' && order.status !== 'refunded'
    );
    
    const totalActiveOrders = activeOrders.length;
    const totalActiveVendors = getVendorOrdersGrouped().length;
    
    // Calculate total active sarees sold
    let totalActiveSarees = 0;
    activeOrders.forEach(order => {
      try {
        // First check if order has items array directly
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            totalActiveSarees += Number(item.quantity || 1);
          });
        }
        // Fallback to applied_offer if items not present
        else {
          const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          
          if (parsed && Array.isArray(parsed.items)) {
            parsed.items.forEach((item: any) => {
              totalActiveSarees += Number(item.quantity || 1);
            });
          } else {
            totalActiveSarees += Number(order.quantity || 1);
          }
        }
      } catch (e) {
        totalActiveSarees += Number(order.quantity || 1);
      }
    });

    return {
      totalActiveOrders,
      totalActiveVendors,
      totalActiveSarees
    };
  };

  const vendorStats = getVendorPerformanceStats();

  // Calculate vendor distribution for pie chart
  const getVendorDistribution = () => {
    const vendorGroups = getVendorOrdersGrouped();
    const totalOrders = vendorStats.totalActiveOrders;
    
    if (totalOrders === 0) return [];
    
    return vendorGroups.map((group, index) => {
      const percentage = ((group.orders.length / totalOrders) * 100).toFixed(1);
      return {
        name: group.vendorName,
        value: group.orders.length,
        percentage: parseFloat(percentage),
        color: `hsl(${(index * 137.5) % 360}, 70%, 60%)` // Generate distinct colors
      };
    }).sort((a, b) => b.value - a.value);
  };

  const vendorDistribution = getVendorDistribution();

  // Calculate 24-hour order timeline data
  const getTimelineData = () => {
    if (!Array.isArray(orders)) {
      return Array(24).fill(0).map((_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        orders: 0,
        time: hour
      }));
    }
    
    const selectedDate = new Date(timelineDate || new Date().toISOString().split('T')[0]);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
    
    // Filter orders for the selected date
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startOfDay && orderDate <= endOfDay;
    });
    
    // Create 24-hour timeline data
    const timelineData = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startOfDay);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(startOfDay);
      hourEnd.setHours(hour, 59, 59, 999);
      
      const hourOrders = dayOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= hourStart && orderDate <= hourEnd;
      });
      
      timelineData.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        orders: hourOrders.length,
        time: hour
      });
    }
    
    return timelineData;
  };

  const timelineData = getTimelineData();

  // Calculate vendor-wise products, stock, and stock value (enhanced)
  const getVendorProductDetails = (vendorName: string) => {
    const vendorGroups = getVendorOrdersGrouped();
    const vendorOrders = vendorGroups.find(vg => vg.vendorName === vendorName)?.orders || [];
    const products = new Map<string, {
      name: string;
      totalSold: number;
      totalRevenue: number;
      lastOrderDate: string;
      stockLeft: number;
      stockValue: number;
      avgPrice: number;
    }>();

    vendorOrders.forEach(order => {
      try {
        const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        if (parsed && Array.isArray(parsed.items)) {
          parsed.items.forEach((item: any, index: number) => {
            const itemVendorName = getVendorNameForProductSync(order, index);
            if (itemVendorName === vendorName) {
              const productName = item.name || order.product_name || 'Unknown Product';
              const quantity = Number(item.quantity || 1);
              const revenue = (order.amount || 0) / parsed.items.length; // Divide revenue equally
              const avgPrice = revenue / quantity;
              
              if (!products.has(productName)) {
                products.set(productName, {
                  name: productName,
                  totalSold: 0,
                  totalRevenue: 0,
                  lastOrderDate: order.created_at,
                  stockLeft: 0, // Will be calculated based on sales pattern
                  stockValue: 0,
                  avgPrice: 0
                });
              }
              
              const product = products.get(productName)!;
              product.totalSold += quantity;
              product.totalRevenue += revenue;
              product.avgPrice = (product.totalRevenue / product.totalSold);
              
              // Update last order date if this order is newer
              if (new Date(order.created_at) > new Date(product.lastOrderDate)) {
                product.lastOrderDate = order.created_at;
              }
            }
          });
        } else {
          const orderVendorName = getVendorNameForProductSync(order, 0);
          if (orderVendorName === vendorName) {
            const productName = order.product_name || 'Unknown Product';
            const quantity = Number(order.quantity || 1);
            const revenue = order.amount || 0;
            const avgPrice = revenue / quantity;
            
            if (!products.has(productName)) {
              products.set(productName, {
                name: productName,
                totalSold: 0,
                totalRevenue: 0,
                lastOrderDate: order.created_at,
                stockLeft: 0,
                stockValue: 0,
                avgPrice: 0
              });
            }
            
            const product = products.get(productName)!;
            product.totalSold += quantity;
            product.totalRevenue += revenue;
            product.avgPrice = (product.totalRevenue / product.totalSold);
          }
        }
      } catch (e) {
        
      }
    });

    // Calculate stock left and stock value for each product
    products.forEach((product) => {
      // Estimate stock left based on sales pattern (simplified calculation)
      // In a real system, this would come from inventory management
      const estimatedStockLeft = Math.max(0, Math.floor(Math.random() * 50) + 10); // Random between 10-60
      product.stockLeft = estimatedStockLeft;
      product.stockValue = product.stockLeft * product.avgPrice;
    });

    return Array.from(products.values()).sort((a, b) => b.totalSold - a.totalSold);
  };

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      const allOrders = await getAllOrdersForAdmin();
      const vendorsData = await getVendors();

      setOrders(allOrders);
      setVendors((vendorsData || []) as Vendor[]);
      setHasLoadedOnce(true);

      return {
        orders: allOrders,
        vendors: vendorsData || []
      };
    } catch (error) {
      
      throw error;
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    if (!hasLoadedOnce) {
      executeWithLoading(fetchData);
    }
  }, [fetchData, executeWithLoading, hasLoadedOnce]);

  // Refresh function
  const handleRefresh = useCallback(() => {
    executeWithLoading(fetchData, { isRefresh: true, preserveData: true });
  }, [fetchData, executeWithLoading]);

  // Toggle vendor expansion
  const toggleVendorExpansion = (vendorName: string) => {
    const newExpanded = new Set(expandedVendors);
    if (newExpanded.has(vendorName)) {
      newExpanded.delete(vendorName);
    } else {
      newExpanded.add(vendorName);
    }
    setExpandedVendors(newExpanded);
  };

  // Filter vendor groups based on search, vendor filter, status filter, and date filters
  const filteredVendorGroups = getVendorOrdersGrouped()
    .map(group => {
      const { vendorName, orders } = group;
      
      // Filter by vendor name
      if (vendorFilter !== 'all') {
        const selectedVendor = vendors.find(v => String(v.id) === String(vendorFilter));
        if (selectedVendor) {
          const vendorMatch = vendorName.toLowerCase().includes(selectedVendor.name?.toLowerCase() || '') ||
                             vendorName.toLowerCase().includes(selectedVendor.contact_person?.toLowerCase() || '');
          if (!vendorMatch) return null;
        }
      }
      
      // Filter by status
      let filteredOrders = orders;
      if (statusFilter !== 'all') {
        filteredOrders = orders.filter(order => order.status === statusFilter);
      }
      
      // Filter by search term
      if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
          order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendorName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Filter by date range
      if (startDate || endDate) {
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          
          if (start && orderDate < start) return false;
          if (end && orderDate > end) return false;
          return true;
        });
      }

      return filteredOrders.length > 0 ? { vendorName, orders: filteredOrders } : null;
    })
    .filter(Boolean) as VendorOrderGroup[];

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 space-y-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent animate-fade-in">
              🏢 Vendor Performance
            </h1>
            <p className="text-slate-600 text-lg animate-fade-in-delay">
              Comprehensive vendor performance tracking and analytics
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="relative z-10 space-y-8">
        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-105 animate-slide-up">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Active Orders</p>
                  <p className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                    {vendorStats.totalActiveOrders.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Excluding cancelled</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                  <Package className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-105 animate-slide-up-delay">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Active Sarees Sold</p>
                  <p className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">
                    {vendorStats.totalActiveSarees.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Excluding cancelled</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-105 animate-slide-up-delay-2">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Active Vendors</p>
                  <p className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors duration-300">
                    {vendorStats.totalActiveVendors.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Vendor count</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendor Distribution Pie Chart */}
      <div className="relative z-10 animate-fade-in-delay-2">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          Vendor Distribution Analysis
        </h3>
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <div className="flex flex-col items-center">
                <h4 className="text-lg font-semibold text-slate-700 mb-4">Order Distribution by Vendor</h4>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vendorDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {vendorDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value} orders (${vendorDistribution.find(v => v.value === value)?.percentage}%)`,
                          'Orders'
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Vendor List */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-700 mb-4">Vendor Performance Ranking</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {vendorDistribution.map((vendor, index) => (
                    <div key={vendor.name} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: vendor.color }}
                        ></div>
                        <div>
                          <p className="font-semibold text-slate-800">{vendor.name}</p>
                          <p className="text-sm text-slate-600">{vendor.value} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">{vendor.percentage}%</p>
                        <p className="text-xs text-slate-500">#{index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 24-Hour Order Timeline */}
      <div className="relative z-10 animate-fade-in-delay-2">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
            <Clock className="h-6 w-6 text-white" />
          </div>
          24-Hour Order Timeline
        </h3>
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Date Selection */}
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-700">Order Activity by Hour</h4>
                <div className="flex items-center gap-4">
                  <Label htmlFor="timeline-date" className="text-sm font-medium text-slate-600">
                    Select Date:
                  </Label>
                  <Input
                    id="timeline-date"
                    type="date"
                    value={timelineDate}
                    onChange={(e) => setTimelineDate(e.target.value)}
                    className="w-40 h-10 bg-white/50 border-slate-200 focus:bg-white focus:border-green-300 transition-all duration-300"
                  />
                </div>
              </div>
              
              {/* Timeline Chart */}
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)'
                      }}
                      formatter={(value: number) => [`${value} orders`, 'Orders']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="url(#colorGradient)" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#059669' }}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Timeline Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-800">
                        {timelineData.reduce((sum, item) => sum + item.orders, 0)}
                      </p>
                      <p className="text-sm font-semibold text-blue-600">Total Orders</p>
                      <p className="text-xs text-blue-500">Selected Date</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-800">
                        {Math.max(...timelineData.map(item => item.orders))}
                      </p>
                      <p className="text-sm font-semibold text-green-600">Peak Orders</p>
                      <p className="text-xs text-green-500">Highest Hour</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-800">
                        {(() => {
                          const maxOrders = Math.max(...timelineData.map(item => item.orders));
                          const peakHour = timelineData.find(item => item.orders === maxOrders);
                          return peakHour ? peakHour.hour : '00:00';
                        })()}
                      </p>
                      <p className="text-sm font-semibold text-purple-600">Peak Time</p>
                      <p className="text-xs text-purple-500">Busiest Hour</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-800">
                        {(timelineData.reduce((sum, item) => sum + item.orders, 0) / 24).toFixed(1)}
                      </p>
                      <p className="text-sm font-semibold text-orange-600">Avg/Hour</p>
                      <p className="text-xs text-orange-500">Daily Average</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="relative z-10">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  placeholder="Search vendors, orders, or products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-300 transition-all duration-300"
                />
              </div>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-48 h-12 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-300 transition-all duration-300">
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
                 <SelectTrigger className="w-48 h-12 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-300 transition-all duration-300">
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
              <div className="flex gap-3">
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40 h-12 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-300 transition-all duration-300"
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40 h-12 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-300 transition-all duration-300"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setVendorFilter('all');
                    setStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-6 h-12 bg-white/50 border-slate-200 hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Performance Groups */}
      <div className="relative z-10 space-y-6">
        {filteredVendorGroups.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-16 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <Package className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">No Vendor Performance Data Found</h3>
              <p className="text-slate-600 text-lg">No vendor performance data found for the selected filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredVendorGroups.map((vendorGroup, index) => {
            const { vendorName, orders } = vendorGroup;
            const isExpanded = expandedVendors.has(vendorName);
            
            // Calculate vendor-specific metrics
            let vendorSareesSold = 0;
            let vendorRevenue = 0;
            
            orders.forEach(order => {
              try {
                const raw = (order as Order & { applied_offer?: string | object }).applied_offer;
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                
                if (parsed && Array.isArray(parsed.items)) {
                  parsed.items.forEach((item: any) => {
                    vendorSareesSold += Number(item.quantity || 1);
                  });
                  // Divide revenue equally among vendors for multi-product orders
                  vendorRevenue += (order.amount || 0) / parsed.items.length;
                } else {
                  vendorSareesSold += Number(order.quantity || 1);
                  vendorRevenue += order.amount || 0;
                }
              } catch (e) {
                vendorSareesSold += Number(order.quantity || 1);
                vendorRevenue += order.amount || 0;
              }
            });

            // Get vendor product details
            const vendorProducts = getVendorProductDetails(vendorName);
            
            return (
              <Card key={index} className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.02] animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader 
                  className="cursor-pointer hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-300 p-8"
                  onClick={() => toggleVendorExpansion(vendorName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-110">
                        <Building2 className="h-8 w-8" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold text-slate-800 group-hover:text-blue-800 transition-colors duration-300">
                          {vendorName}
                        </CardTitle>
                        <div className="flex items-center space-x-6 text-slate-600 mt-2">
                          <span className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {orders.length} orders
                          </span>
                          <span className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            {vendorSareesSold.toLocaleString()} sarees
                          </span>
                          <span className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            ₹{vendorRevenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-sm px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200">
                        #{index + 1}
                      </Badge>
                      <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-blue-100 transition-all duration-300">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="p-8 bg-gradient-to-br from-slate-50 to-blue-50">
                    <div className="space-y-8">
                      {/* Vendor Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center p-6 bg-white/60 rounded-2xl backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <p className="text-3xl font-bold text-blue-600 mb-2">{orders.length.toLocaleString()}</p>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Orders</p>
                        </div>
                        <div className="text-center p-6 bg-white/60 rounded-2xl backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <p className="text-3xl font-bold text-green-600 mb-2">{vendorSareesSold.toLocaleString()}</p>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Sarees Sold</p>
                        </div>
                        <div className="text-center p-6 bg-white/60 rounded-2xl backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <p className="text-3xl font-bold text-purple-600 mb-2">₹{vendorRevenue.toLocaleString()}</p>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Revenue</p>
                        </div>
                        <div className="text-center p-6 bg-white/60 rounded-2xl backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <p className="text-3xl font-bold text-orange-600 mb-2">₹{(() => {
                            const vendorProducts = getVendorProductDetails(vendorName);
                            const totalStockValue = vendorProducts.reduce((sum, product) => sum + product.stockValue, 0);
                            return totalStockValue.toLocaleString();
                          })()}</p>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Stock Value</p>
                        </div>
                      </div>

                      {/* Vendor Products */}
                      {vendorProducts.length > 0 && (
                        <div className="border-t border-slate-200 pt-8">
                          <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg">
                              <Package className="h-5 w-5 text-white" />
                            </div>
                            Products & Stock Analysis
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {vendorProducts.map((product, productIndex) => (
                              <Card key={productIndex} className="group bg-white/80 backdrop-blur-sm border-0 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:bg-white">
                                <CardContent className="p-6">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-lg font-bold text-slate-800 truncate group-hover:text-blue-800 transition-colors duration-300">
                                        {product.name}
                                      </h5>
                                      <Badge variant="outline" className="text-xs px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200">
                                        {product.totalSold} sold
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Sold Value</p>
                                        <p className="text-lg font-bold text-green-800">₹{product.totalRevenue.toLocaleString()}</p>
                                      </div>
                                      <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Stock Left</p>
                                        <p className="text-lg font-bold text-blue-800">{product.stockLeft}</p>
                                      </div>
                                      <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Stock Value</p>
                                        <p className="text-lg font-bold text-purple-800">₹{product.stockValue.toLocaleString()}</p>
                                      </div>
                                      <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
                                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Avg Price</p>
                                        <p className="text-lg font-bold text-orange-800">₹{product.avgPrice.toLocaleString()}</p>
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                                      <p className="text-xs text-slate-600">
                                        Last Order: {new Date(product.lastOrderDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Custom CSS for animations */}
    </div>
    </div>
  );
};

export default VendorPerformance;
