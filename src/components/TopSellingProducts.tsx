// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Calendar, Package, DollarSign, ShoppingCart } from 'lucide-react';

interface Order {
  id: string;
  product_name: string;
  quantity: number;
  amount: number;
  created_at: string;
  product_colors?: string[];
  status: string;
  payment_status: string;
}

interface TopSellingProductsProps {
  orders: Order[];
}

type TimeFilter = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all_time';
type SortBy = 'units' | 'revenue' | 'orders';

export const TopSellingProducts: React.FC<TopSellingProductsProps> = ({ orders }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all_time');
  const [sortBy, setSortBy] = useState<SortBy>('units');
  const [showAll, setShowAll] = useState(false);

  const getFilteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter by active order statuses (confirmed, processing, ready_to_ship, shipped, delivered)
    const activeStatuses = ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered'];
    
    return orders.filter(order => {
      // Only include orders with active statuses and paid payment status
      const hasActiveStatus = activeStatuses.includes(order.status);
      const isPaid = order.payment_status === 'paid';
      
      if (!hasActiveStatus || !isPaid) {
        return false;
      }

      const orderDate = new Date(order.created_at);
      
      switch (timeFilter) {
        case 'today':
          return orderDate >= today;
        case 'yesterday':
          return orderDate >= yesterday && orderDate < today;
        case 'this_week':
          return orderDate >= thisWeekStart;
        case 'this_month':
          return orderDate >= thisMonthStart;
        case 'all_time':
          return true;
        default:
          return orderDate >= today;
      }
    });
  }, [orders, timeFilter]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, {
      name: string;
      units: number;
      revenue: number;
      colors: string[];
      orderCount: number;
    }> = {};

    getFilteredOrders.forEach((order) => {
      // Get product name
      const productName = order.product_name?.trim() || 'Unknown Product';
      
      // Skip if unknown
      if (!productName || productName === 'Unknown Product') {
        console.warn('Skipping order with unknown product name:', order);
        return;
      }
      
      // Try multiple strategies for grouping products
      
      // Strategy 1: Use product_id if available for unique grouping
      let groupKey = '';
      let displayName = productName;
      
      if (order.product_id) {
        groupKey = order.product_id; // Use just product_id for grouping
        displayName = productName;
      } else if (order.saree_id) {
        groupKey = order.saree_id; // Use just saree_id for grouping
        displayName = productName;
      } else {
        // Strategy 2: Use product name as base, but make it more specific if needed
        const baseProductName = productName.replace(/\s*\([^)]*\)\s*$/, '').trim();
        groupKey = baseProductName || productName;
        displayName = productName;
      }
      
      if (!productSales[groupKey]) {
        productSales[groupKey] = {
          name: displayName, // Use the display name (could be full name or base name)
          units: 0,
          revenue: 0,
          colors: [],
          orderCount: 0
        };
      }
      
      productSales[groupKey].units += Number(order.quantity) || 1;
      productSales[groupKey].revenue += Number(order.amount) || 0;
      productSales[groupKey].orderCount++;
      
      // Collect unique colors
      if (order.product_colors && Array.isArray(order.product_colors)) {
        order.product_colors.forEach(color => {
          if (color && productSales[groupKey] && !productSales[groupKey].colors.includes(color)) {
            productSales[groupKey].colors.push(color);
          }
        });
      }
    });

    // Sort based on selected criteria
    const sortedProducts = Object.values(productSales).sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'orders':
          return b.orderCount - a.orderCount;
        case 'units':
        default:
          return b.units - a.units;
      }
    });

    return sortedProducts.slice(0, 10); // Show top 10 products
  }, [getFilteredOrders, sortBy]);

  const getTimeFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'this_week':
        return 'This Week';
      case 'this_month':
        return 'This Month';
      case 'all_time':
        return 'All Time';
      default:
        return 'Today';
    }
  };

  const getSortLabel = (sort: SortBy) => {
    switch (sort) {
      case 'units':
        return 'Units Sold';
      case 'revenue':
        return 'Revenue';
      case 'orders':
        return 'Order Count';
      default:
        return 'Units Sold';
    }
  };

  const totalUnits = topProducts.reduce((sum, product) => sum + product.units, 0);
  const totalRevenue = topProducts.reduce((sum, product) => sum + product.revenue, 0);

  return (
    <Card className="border bg-card/70 backdrop-blur-sm ring-1 ring-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top 5 Selling Products
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Today
                  </div>
                </SelectItem>
                <SelectItem value="yesterday">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Yesterday
                  </div>
                </SelectItem>
                <SelectItem value="this_week">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    This Week
                  </div>
                </SelectItem>
                <SelectItem value="this_month">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    This Month
                  </div>
                </SelectItem>
                <SelectItem value="all_time">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    All Time
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="units">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    Units Sold
                  </div>
                </SelectItem>
                <SelectItem value="revenue">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    Revenue
                  </div>
                </SelectItem>
                <SelectItem value="orders">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-3 w-3" />
                    Order Count
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            Total Units: {totalUnits}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Total Revenue: ₹{totalRevenue.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            Total Orders: {topProducts.reduce((sum, product) => sum + product.orderCount, 0)}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            Ranked by Units Sold
          </span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            Active Orders Only (Confirmed, Processing, Ready to Ship, Shipped, Delivered)
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No sales data for {getTimeFilterLabel(timeFilter).toLowerCase()}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(showAll ? topProducts : topProducts.slice(0, 5)).map((product, index) => (
              <div
                key={product.name}
                className="p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {/* Header with Rank and Product Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-xl shadow-lg">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <ShoppingCart className="h-4 w-4" />
                        {product.orderCount} order{product.orderCount !== 1 ? 's' : ''}
                      </span>
                      {product.colors.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-600">Colors:</span>
                          <div className="flex gap-1">
                            {product.colors.slice(0, 3).map((color, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: color.toLowerCase() }}
                                title={color}
                              />
                            ))}
                            {product.colors.length > 3 && (
                              <span className="text-sm text-gray-500">
                                +{product.colors.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sales Metrics */}
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-2">
                      <Package className="h-6 w-6" />
                      {product.units}
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1">
                      Unit{product.units !== 1 ? 's' : ''} Sold
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
                      <DollarSign className="h-6 w-6" />
                      ₹{product.revenue.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1">
                      Total Revenue
                    </div>
                  </div>
                </div>

                {/* Average per unit */}
                <div className="mt-2 text-center">
                  <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                    Average: ₹{Math.round(product.revenue / product.units).toLocaleString()} per unit
                  </div>
                </div>
              </div>
            ))}
            {topProducts.length > 5 && (
              <div className="flex justify-center pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs"
                >
                  {showAll ? 'Show Top 5' : `Show All ${topProducts.length} Products`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
