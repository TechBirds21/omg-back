// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useAdminAuth } from '@/components/AdminAuth';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  ShoppingBag,
  Users, 
  Package, 
  AlertTriangle,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  CheckCircle2,
  Truck,
  Send,
  MapPin,
  XCircle,
  BarChart3,
  LogOut
} from 'lucide-react';
import { Select as UiSelect, SelectContent as UiSelectContent, SelectItem as UiSelectItem, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue } from '@/components/ui/select';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { getAllOrdersForAnalytics, getCustomers, getInventoryForDashboard, getProductsForAdmin, updateOrderStatus } from '@/lib/api-admin';
import type { Order, Customer, Inventory, Product } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
 
import { ColorCircle } from '@/lib/colorUtils';
import { OrderStatusTable } from '@/components/ui/order-status-table';
import { TopSellingProducts } from '@/components/TopSellingProducts';
import { useAdminFilters } from '@/contexts/AdminFilterContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    status: '',
    payment_status: '',
    notes: ''
  });
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { selectedYear, selectedMonth } = useAdminFilters();
  const { logout } = useAdminAuth();
  const { toast } = useToast();
  const { isLoading, hasLoadedOnce } = useDelayedLoading();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      
      // Build filters for orders
      const filters = {
        year: selectedYear,
        month: selectedMonth,
      };
      
      console.log('📊 Loading dashboard data with filters:', filters);
      
      // Fetch both website orders and store bills
      const [ordersData, customersData, inventoryData, productsData] = await Promise.all([
        getAllOrdersForAnalytics(filters).catch(err => {
          console.error('❌ Error fetching orders:', err);
          return [];
        }),
        getCustomers().catch(err => {
          console.error('❌ Error fetching customers:', err);
          return [];
        }),
        getInventoryForDashboard().catch(err => {
          console.error('❌ Error fetching inventory:', err);
          return [];
        }),
        getProductsForAdmin().catch(err => {
          console.error('❌ Error fetching products:', err);
          return [];
        })
      ]);
      
      console.log('✅ Data fetched:', {
        orders: ordersData?.length || 0,
        customers: customersData?.length || 0,
        inventory: inventoryData?.length || 0,
        products: productsData?.length || 0
      });
      
      // Log sample data to verify structure
      if (ordersData && ordersData.length > 0) {
        console.log('📦 Sample order:', {
          order_id: ordersData[0].order_id,
          amount: ordersData[0].amount,
          total: ordersData[0].total,
          total_amount: ordersData[0].total_amount,
          status: ordersData[0].status,
          created_at: ordersData[0].created_at,
          allFields: Object.keys(ordersData[0])
        });
      } else {
        console.warn('⚠️ No orders returned from API. Possible reasons:');
        console.warn('   - No orders in selected month/year');
        console.warn('   - Date filter too restrictive');
        console.warn('   - Database connection issue');
        console.warn('   - API endpoint error');
        
        // Try fetching all orders without date filter as fallback
        if (filters.year || filters.month) {
          console.log('🔄 Attempting to fetch all orders without date filter...');
          try {
            const allOrdersData = await getAllOrdersForAnalytics({});
            if (allOrdersData && allOrdersData.length > 0) {
              console.log(`✅ Found ${allOrdersData.length} total orders in database`);
              console.log('💡 Consider changing the month/year filter to see data');
              // Don't override - let user see that selected period has no data
            }
          } catch (err) {
            console.error('Error fetching all orders:', err);
          }
        }
      }
      
      // Fetch all store bills in batches (API max size is 100)
      let storeBillsData: any[] = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;
      
      while (hasMore) {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
          const response = await fetch(`${API_BASE}/store/billing?page=${page}&size=${pageSize}`);
          if (response.ok) {
            const data = await response.json();
            if (data.bills && data.bills.length > 0) {
              storeBillsData.push(...data.bills);
              if (data.bills.length < pageSize || page >= data.pages) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          } else {
            console.warn('Store bills API returned non-OK status:', response.status);
            hasMore = false;
          }
        } catch (error) {
          console.error('Error fetching store bills:', error);
          hasMore = false;
        }
      }
      
      console.log('✅ Store bills fetched:', storeBillsData.length);
      
      // Ensure we have arrays even if API returns null/undefined
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      
      // Store store bills in state for statistics
      (window as any).__storeBills = storeBillsData;
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Dashboard load error:', error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast({
      title: "Data refreshed",
      description: "Dashboard data has been updated.",
    });
  };

  const handleStatsCardClick = (title: string) => {
    if (title === 'Stock Alerts') {
      return;
    }
    setSelectedStatus(title);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'stock-alerts':
        // Handle stock alerts action
        toast({
          title: "Stock Alerts",
          description: "Checking stock levels...",
        });
        break;
      default:
        break;
    }
  };

  const getFilteredOrdersForStatus = (status: string) => {
    switch (status) {
      case 'Total Orders':
        return orders;
      case 'Confirmed Orders':
        return orders.filter(o => o.status === 'confirmed');
      case 'Processing Orders':
        return orders.filter(o => o.status === 'processing');
      case 'Shipped Orders':
        return orders.filter(o => o.status === 'shipped');
      case 'Delivered Orders':
        return orders.filter(o => o.status === 'delivered');
      case 'Stock Alerts':
        return [];
      default:
        return orders;
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditingOrder(false);
    setOrderFormData({
      status: order.status || '',
      payment_status: order.payment_status || '',
      notes: order.notes || ''
    });
    setShowOrderModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditingOrder(true);
    setOrderFormData({
      status: order.status || '',
      payment_status: order.payment_status || '',
      notes: order.notes || ''
    });
    setShowOrderModal(true);
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;

    try {
      // Use order_id instead of id for the API call
      await updateOrderStatus(selectedOrder.order_id || selectedOrder.id, {
        status: orderFormData.status,
        payment_status: orderFormData.payment_status,
        notes: orderFormData.notes
      });
      
      // Update local state
      setOrders(prev => prev.map(order => 
        (order.id === selectedOrder.id || order.order_id === selectedOrder.order_id)
          ? { ...order, status: orderFormData.status, payment_status: orderFormData.payment_status, notes: orderFormData.notes }
          : order
      ));

      setShowOrderModal(false);
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get store bills from window (temporary storage)
  const storeBills: any[] = (window as any).__storeBills || [];
  
  // Helper function to get order amount (handles both amount and total fields)
  const getOrderAmount = (order: any): number => {
    const amount = order.amount ?? order.total ?? order.total_amount ?? 0;
    return Number(amount) || 0;
  };
  
  // Calculate Website Stats
  const websiteOrders = orders.length;
  const websiteRevenue = orders.reduce((sum, order) => sum + getOrderAmount(order), 0);
  
  // Debug logging
  if (orders.length > 0) {
    console.log('📊 Sample order data:', {
      firstOrder: orders[0],
      totalOrders: orders.length,
      totalRevenue: websiteRevenue,
      orderFields: Object.keys(orders[0] || {})
    });
  } else {
    console.warn('⚠️ No orders found. Check date filters or database connection.');
  }
  
  // Calculate Store Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
  
  const storeBillsInMonth = storeBills.filter((bill: any) => {
    const billDate = new Date(bill.created_at);
    return billDate >= monthStart && billDate <= monthEnd;
  });
  
  const storeRevenue = storeBillsInMonth.reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0);
  const storeBillsCount = storeBillsInMonth.length;
  
  // Combined totals
  const totalOrders = websiteOrders + storeBillsCount;
  const totalRevenue = websiteRevenue + storeRevenue;
  
  // Website order status breakdown
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;
  const readyToShipOrders = orders.filter(o => o.status === 'ready_to_ship').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const refundedOrders = orders.filter(o => o.status === 'refunded').length;
  const failedOrders = orders.filter(o => o.payment_status === 'failed').length;
  const confirmedRevenue = orders.filter(o => o.status === 'confirmed').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const processingRevenue = orders.filter(o => o.status === 'processing').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const readyToShipRevenue = orders.filter(o => o.status === 'ready_to_ship').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const shippedRevenue = orders.filter(o => o.status === 'shipped').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const deliveredRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const pendingRevenue = orders.filter(o => o.status === 'pending').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const cancelledRevenue = orders.filter(o => o.status === 'cancelled').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const refundedRevenue = orders.filter(o => o.status === 'refunded').reduce((sum, order) => sum + getOrderAmount(order), 0);
  const failedRevenue = orders.filter(o => o.payment_status === 'failed').reduce((sum, order) => sum + getOrderAmount(order), 0);

  // Calculate low stock items
  const lowStockItems = inventory.filter(item => item.current_stock <= item.minimum_stock && item.current_stock > 0).length;
  const outOfStockItems = inventory.filter(item => item.current_stock === 0).length;

  // Calculate top products
  const productRevenue = orders.reduce((acc, order) => {
    const productName = order.product_name || 'Unknown Product';
    acc[productName] = (acc[productName] || 0) + getOrderAmount(order);
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productRevenue)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, revenue]) => ({ name, revenue }));

  const stats = [
    {
      title: 'Total Orders',
      value: totalOrders.toString(),
      subtitle: '₹' + totalRevenue.toLocaleString() + ' revenue',
      change: (((totalOrders / Math.max(1, totalOrders - 10)) * 100 - 100).toFixed(1)) + '%',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'Active Orders',
      value: (confirmedOrders + processingOrders + readyToShipOrders + shippedOrders + deliveredOrders).toString(),
      subtitle: '₹' + (confirmedRevenue + processingRevenue + readyToShipRevenue + shippedRevenue + deliveredRevenue).toLocaleString() + ' revenue',
      change: (((confirmedOrders + processingOrders + readyToShipOrders + shippedOrders + deliveredOrders) / Math.max(1, totalOrders - 20)) * 100 - 100).toFixed(1) + '%',
      trend: 'up' as const,
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Processing Orders',
      value: processingOrders.toString(),
      subtitle: '₹' + processingRevenue.toLocaleString() + ' revenue',
      change: (((processingOrders / Math.max(1, processingOrders - 3)) * 100 - 100).toFixed(1)) + '%',
      trend: 'up' as const,
      icon: Clock,
      color: 'yellow'
    },
    {
      title: 'Ready to Ship',
      value: readyToShipOrders.toString(),
      subtitle: '₹' + readyToShipRevenue.toLocaleString() + ' revenue',
      change: (((readyToShipOrders / Math.max(1, readyToShipOrders - 2)) * 100 - 100).toFixed(1)) + '%',
      trend: 'up' as const,
      icon: Package,
      color: 'orange'
    },
    {
      title: 'Shipped Orders',
      value: shippedOrders.toString(),
      subtitle: '₹' + shippedRevenue.toLocaleString() + ' revenue',
      change: (((shippedOrders / Math.max(1, shippedOrders - 8)) * 100 - 100).toFixed(1)) + '%',
      trend: 'up' as const,
      icon: Truck,
      color: 'purple'
    },
    {
      title: 'Delivered Orders',
      value: deliveredOrders.toString(),
      subtitle: '₹' + deliveredRevenue.toLocaleString() + ' revenue',
      change: (((deliveredOrders / Math.max(1, deliveredOrders - 12)) * 100 - 100).toFixed(1)) + '%',
      trend: 'up' as const,
      icon: CheckCircle2,
      color: 'emerald'
    },
    {
      title: 'Failed & Cancelled',
      value: (failedOrders + cancelledOrders).toString(),
      subtitle: '₹' + (failedRevenue + cancelledRevenue).toLocaleString() + ' lost',
      change: ((((failedOrders + cancelledOrders) / Math.max(1, (failedOrders + cancelledOrders) - 2)) * 100 - 100).toFixed(1)) + '%',
      trend: (failedOrders + cancelledOrders) > 0 ? 'down' as const : 'up' as const,
      icon: XCircle,
      color: 'red'
    }
  ];

  const topProductsChart = topProducts.map((p: any) => ({ name: p.name, revenue: p.revenue }));

  // Calculate daily revenue for the selected month with order status breakdown
  const getDailyRevenueData = () => {
    // Use selected year and month instead of current date
    const selectedMonthIndex = selectedMonth - 1; // Convert to 0-based index
    
    // Get all days in selected month
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    
    const dailyData = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(selectedYear, selectedMonthIndex, day);
      const dayStart = new Date(dayDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999));
      
      // Filter orders for this day (excluding pending, cancelled, refunded)
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= dayStart && 
               orderDate <= dayEnd && 
               !['pending', 'cancelled', 'refunded'].includes(order.status);
      });
      
      // Calculate revenue by status
      const processingRevenue = dayOrders
        .filter(order => order.status === 'processing')
        .reduce((sum, order) => sum + getOrderAmount(order), 0);
      
      const readyToShipRevenue = dayOrders
        .filter(order => order.status === 'ready_to_ship')
        .reduce((sum, order) => sum + getOrderAmount(order), 0);
      
      const shippedRevenue = dayOrders
        .filter(order => order.status === 'shipped')
        .reduce((sum, order) => sum + getOrderAmount(order), 0);
      
      const deliveredRevenue = dayOrders
        .filter(order => order.status === 'delivered')
        .reduce((sum, order) => sum + getOrderAmount(order), 0);
      
      const totalRevenue = dayOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
      
      dailyData.push({
        day: day,
        date: day + '/' + selectedMonth,
        processing: processingRevenue,
        ready_to_ship: readyToShipRevenue,
        shipped: shippedRevenue,
        delivered: deliveredRevenue,
        total: totalRevenue,
        orders: dayOrders.length
      });
    }
    
    return dailyData;
  };

  const dailyRevenueData = getDailyRevenueData();

  // Helper functions for card colors
  const getCardBgColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue': 'bg-blue-100',
      'green': 'bg-green-100',
      'yellow': 'bg-yellow-100',
      'orange': 'bg-orange-100',
      'purple': 'bg-purple-100',
      'emerald': 'bg-emerald-100',
      'red': 'bg-red-100'
    };
    return colorMap[color] || 'bg-gray-100';
  };

  const getCardIconColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue': 'text-blue-600',
      'green': 'text-green-600',
      'yellow': 'text-yellow-600',
      'orange': 'text-orange-600',
      'purple': 'text-purple-600',
      'emerald': 'text-emerald-600',
      'red': 'text-red-600'
    };
    return colorMap[color] || 'text-gray-600';
  };

  const toggleCardExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedCards(newExpanded);
  };

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  return (
    <div className="p-6 space-y-6 relative bg-gradient-to-b from-background to-muted/20 min-h-[calc(100vh-80px)] animate-fade-in">
      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            A real-time overview of orders, revenue and performance
            {orders.length === 0 && storeBills.length === 0 && (
              <span className="ml-2 text-amber-600 font-medium">⚠️ No data found for selected period</span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Store vs Website Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-amber-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <ShoppingBag className="h-5 w-5" />
              Store Sales (Physical Store)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Total Bills</p>
                <p className="text-2xl font-bold text-amber-800">{storeBillsCount}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-amber-800">₹{storeRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-amber-200">
              <p className="text-sm text-slate-600">
                Average per bill: <span className="font-semibold text-amber-800">₹{storeBillsCount > 0 ? (storeRevenue / storeBillsCount).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <ShoppingCart className="h-5 w-5" />
              Website Sales (Online Orders)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-blue-800">{websiteOrders}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-800">₹{websiteRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-slate-600">
                Average per order: <span className="font-semibold text-blue-800">₹{websiteOrders > 0 ? (websiteRevenue / websiteOrders).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Total */}
      <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Combined Sales</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                {totalOrders} total orders ({storeBillsCount} store bills + {websiteOrders} website orders)
              </p>
            </div>
            <div className="text-right">
              <div className="p-4 bg-white/50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Store Contribution</p>
                <p className="text-xl font-bold text-amber-800">
                  {totalRevenue > 0 ? ((storeRevenue / totalRevenue) * 100).toFixed(1) : '0'}%
                </p>
              </div>
              <div className="p-4 bg-white/50 rounded-lg mt-2">
                <p className="text-xs text-slate-600 mb-1">Website Contribution</p>
                <p className="text-xl font-bold text-blue-800">
                  {totalRevenue > 0 ? ((websiteRevenue / totalRevenue) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 hover:scale-105 hover:shadow-xl animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleStatsCardClick(stat.title)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-full mb-3 ${getCardBgColor(stat.color)}`}>
                  <stat.icon className={`h-5 w-5 ${getCardIconColor(stat.color)}`} />
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-lg font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mb-2">{stat.subtitle}</p>
                <div className="flex items-center">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={`text-xs ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Tables - Show when a status card is clicked */}
      {selectedStatus && (
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selectedStatus} Details</CardTitle>
            <Button variant="outline" onClick={() => setSelectedStatus(null)}>
              Back to Dashboard
            </Button>
          </CardHeader>
          <CardContent>
            <OrderStatusTable
              orders={getFilteredOrdersForStatus(selectedStatus)}
              title={selectedStatus}
              onViewOrder={handleViewOrder}
              onEditOrder={handleEditOrder}
            />
          </CardContent>
        </Card>
      )}

      {/* Charts and Activities - Only show if no specific status is selected */}
      {!selectedOrder && !selectedStatus && (
        <div className="space-y-6">
          {/* Existing Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Products - Primary */}
            <div className="lg:col-span-1">
              <TopSellingProducts orders={orders} />
            </div>

            {/* Top Selling Products - Secondary */}
            <div className="lg:col-span-1">
              <Card className="border bg-card/70 backdrop-blur-sm ring-1 ring-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Top Products (Revenue)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={topProductsChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide={false} />
                      <YAxis />
                      <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? 'Edit Order' : 'Order Details'} - {selectedOrder?.order_id}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {editingOrder ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Order Status</Label>
                    <Select 
                      value={orderFormData.status} 
                      onValueChange={(value) => setOrderFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment_status">Payment Status</Label>
                    <Select 
                      value={orderFormData.payment_status} 
                      onValueChange={(value) => setOrderFormData(prev => ({ ...prev, payment_status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={orderFormData.notes}
                      onChange={(e) => setOrderFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add order notes..."
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowOrderModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveOrder}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Order ID</Label>
                      <p className="text-sm text-muted-foreground">{selectedOrder.order_id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge variant="outline" className="ml-2">
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Payment Status</Label>
                      <Badge variant="outline" className="ml-2">
                        {selectedOrder.payment_status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <p className="text-sm text-muted-foreground">₹{getOrderAmount(selectedOrder).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div>
                      <Label className="text-sm font-medium">Notes</Label>
                      <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowOrderModal(false)}>
                      Close
                    </Button>
                    <Button variant="outline" onClick={() => setEditingOrder(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Order
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revenue Per Day Graph - Below Analytics Cards */}
      <Card className="border bg-card/70 backdrop-blur-sm ring-1 ring-border/40 animate-fade-in-up hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue Per Day - Order Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dailyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="day" 
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
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`, 
                  name === 'processing' ? 'Processing' :
                  name === 'ready_to_ship' ? 'Ready to Ship' :
                  name === 'shipped' ? 'Shipped' :
                  name === 'delivered' ? 'Delivered' : 'Total'
                ]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="processing" 
                stroke="#F59E0B" 
                strokeWidth={3}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#F59E0B' }}
                name="processing"
              />
              <Line 
                type="monotone" 
                dataKey="ready_to_ship" 
                stroke="#8B5CF6" 
                strokeWidth={3}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#8B5CF6' }}
                name="ready_to_ship"
              />
              <Line 
                type="monotone" 
                dataKey="shipped" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#3B82F6' }}
                name="shipped"
              />
              <Line 
                type="monotone" 
                dataKey="delivered" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10B981' }}
                name="delivered"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="animate-fade-in-up hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:scale-105 transition-all duration-300 hover:shadow-md hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/admin/orders')}
            >
              <ShoppingCart className="h-6 w-6 mb-2" />
              <span className="text-sm">View Orders</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:scale-105 transition-all duration-300 hover:shadow-md hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/admin/products')}
            >
              <Package className="h-6 w-6 mb-2" />
              <span className="text-sm">Manage Products</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:scale-105 transition-all duration-300 hover:shadow-md hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/admin/customers')}
            >
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">View Customers</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:scale-105 transition-all duration-300 hover:shadow-md hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleQuickAction('stock-alerts')}
            >
              <AlertTriangle className="h-6 w-6 mb-2" />
              <span className="text-sm">Stock Alerts</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
