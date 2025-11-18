// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  Search, 
  AlertTriangle, 
  Package, 
  TrendingDown,
  RefreshCw,
  Bell,
  Eye,
  Edit,
  ShoppingCart,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { getProductsForAdmin, getCategories, adjustProductStock } from '@/lib/api-admin';
import type { Product, Category } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getProductTotalStock } from '@/lib/utils';
import { ColorCircle } from '@/lib/colorUtils';

interface AlertProduct extends Product {
  alertLevel: 'critical' | 'high' | 'medium' | 'normal';
  lowStockColors: Array<{color: string; stock: number}>;
}

const StockAlerts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertFilter, setAlertFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { toast } = useToast();

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading<{
    products: Product[];
    categories: Category[];
  }>({ minimumDelay: 300, preserveData: true });

  // Preserve scroll position during refreshes
  useScrollPreservation(isRefreshing);

  useEffect(() => {
    executeWithLoading(fetchData, { isRefresh: false, preserveData: false })
      .then(() => {
        setHasLoadedOnce(true);
      })
      .catch(() => {
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      });
  }, []);

  const fetchData = async () => {
    const [productsData, categoriesData] = await Promise.all([
      getProductsForAdmin(),
      getCategories()
    ]);
    
    setProducts(productsData);
    setCategories(categoriesData);
    
    return {
      products: productsData,
      categories: categoriesData
    };
  };

  const handleRefresh = async () => {
    try {
      await executeWithLoading(fetchData, { isRefresh: true, preserveData: true });
      toast({
        title: "Data Refreshed",
        description: "Stock alerts data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh stock alerts data.",
        variant: "destructive",
      });
    }
  };

  // Process products to determine alert levels
  const alertProducts: AlertProduct[] = useMemo(() => {
    return products.map(product => {
      const colorStock = Array.isArray(product.color_stock) ? product.color_stock : [];
      const totalStock = getProductTotalStock(product);
      const lowStockColors = colorStock.filter(item => item.stock > 0 && item.stock <= 5);
      const outOfStockColors = colorStock.filter(item => item.stock === 0);
      
      let alertLevel: 'critical' | 'high' | 'medium' | 'normal' = 'normal';
      
      // Critical: Any color out of stock OR total stock is 0
      if (outOfStockColors.length > 0) {
        alertLevel = 'critical';
      } 
      // High: Low stock colors (1-5 units)
      else if (lowStockColors.length > 0) {
        alertLevel = 'high';
      } 
      // Medium: Total stock between 6-10 units
      else if (totalStock > 0 && totalStock <= 10) {
        alertLevel = 'medium';
      }

      return {
        ...product,
        total_stock: totalStock,
        alertLevel,
        lowStockColors: [...lowStockColors, ...outOfStockColors]
      };
    }).filter(product => product.alertLevel !== 'normal');
  }, [products]);

  // Filter alerts based on search and filters
  const filteredAlerts = useMemo(() => {
    return alertProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAlert = alertFilter === 'all' || product.alertLevel === alertFilter;
      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
      return matchesSearch && matchesAlert && matchesCategory;
    });
  }, [alertProducts, searchTerm, alertFilter, categoryFilter]);

  // Pagination
  const pagination = usePagination(filteredAlerts, 10);

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium': return <TrendingDown className="h-5 w-5 text-yellow-500" />;
      default: return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertText = (level: string) => {
    switch (level) {
      case 'critical': return 'CRITICAL';
      case 'high': return 'HIGH';
      case 'medium': return 'MEDIUM';
      default: return 'NORMAL';
    }
  };

  const handleQuickRestock = async (productId: string, color: string) => {
    try {
      // Find the current product to get the current stock
      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      const colorStock = Array.isArray(product.color_stock) ? product.color_stock : [];
      const currentStockItem = colorStock.find((item: any) => item.color === color);
      const currentStock = currentStockItem ? currentStockItem.stock : 0;
      const newStock = currentStock + 10; // Add 10 units
      
      await adjustProductStock(productId, color, newStock);
      toast({
        title: "Stock Updated",
        description: `Added 10 units to ${color} stock. New total: ${newStock}`,
      });
      await executeWithLoading(fetchData, { isRefresh: true, preserveData: true });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to update stock.",
        variant: "destructive",
      });
    }
  };

  const stats = [
    {
      title: 'Total Alerts',
      value: alertProducts.length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100'
    },
    {
      title: 'Critical Items',
      value: alertProducts.filter(p => p.alertLevel === 'critical').length,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-100'
    },
    {
      title: 'High Priority',
      value: alertProducts.filter(p => p.alertLevel === 'high').length,
      icon: TrendingDown,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    },
    {
      title: 'Medium Priority',
      value: alertProducts.filter(p => p.alertLevel === 'medium').length,
      icon: Package,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100'
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
          <h1 className="text-3xl font-bold text-foreground">Stock Alerts</h1>
          <p className="text-muted-foreground">Monitor low stock items and critical inventory levels</p>
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={alertFilter} onValueChange={setAlertFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Alerts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts ({filteredAlerts.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Stock Alerts</h3>
                <p className="text-muted-foreground">All products are adequately stocked.</p>
              </div>
            ) : (
              <>
                {pagination.paginatedData.map((product) => (
                  <Card key={product.id} className={`border-l-4 ${getAlertColor(product.alertLevel)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="relative">
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[product.cover_image_index || 0]} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                            <div className="absolute -top-2 -right-2">
                              {getAlertIcon(product.alertLevel)}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-medium text-foreground">{product.name}</h3>
                              <Badge className={getAlertColor(product.alertLevel)}>
                                {getAlertText(product.alertLevel)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                              <div>
                                <p className="text-muted-foreground">SKU</p>
                                <p className="font-medium">{product.sku}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Stock</p>
                                <p className="font-medium">{getProductTotalStock(product)} units</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className="font-medium capitalize">
                                  {product.stock_status?.replace('_', ' ') || 'In Stock'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Category</p>
                                <p className="font-medium">
                                  {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                                </p>
                              </div>
                            </div>

                            {/* Low Stock Colors */}
                            {product.lowStockColors.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Low Stock Colors:</p>
                                <div className="flex flex-wrap gap-2">
                                  {product.lowStockColors.map((item, idx) => (
                                    <div key={idx} className="flex items-center space-x-2 bg-muted p-2 rounded-lg">
                                      <ColorCircle color={item.color} size="w-4 h-4" />
                                      <span className="text-sm font-medium">{item.color}</span>
                                      <Badge variant={item.stock === 0 ? "destructive" : "secondary"} className="text-xs">
                                        {item.stock === 0 ? 'OUT' : `${item.stock} left`}
                                      </Badge>
                                      {item.stock < 5 && (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-xs px-2 py-1 h-6"
                                          onClick={() => handleQuickRestock(product.id, item.color)}
                                        >
                                          +10
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Alert Message */}
                            <div className={`p-3 rounded-lg ${
                              product.alertLevel === 'critical' ? 'bg-red-50 border border-red-200' :
                              product.alertLevel === 'high' ? 'bg-orange-50 border border-orange-200' :
                              'bg-yellow-50 border border-yellow-200'
                            }`}>
                              <p className={`font-medium ${
                                product.alertLevel === 'critical' ? 'text-red-800' :
                                product.alertLevel === 'high' ? 'text-orange-800' :
                                'text-yellow-800'
                              }`}>
                                {product.alertLevel === 'critical' && '🚨 CRITICAL: Out of stock or very low inventory'}
                                {product.alertLevel === 'high' && '⚠️ HIGH PRIORITY: Low stock levels detected'}
                                {product.alertLevel === 'medium' && '📉 MEDIUM: Stock levels getting low'}
                              </p>
                              <p className={`text-sm mt-1 ${
                                product.alertLevel === 'critical' ? 'text-red-600' :
                                product.alertLevel === 'high' ? 'text-orange-600' :
                                'text-yellow-600'
                              }`}>
                                {product.alertLevel === 'critical' && 'Immediate restocking required to avoid sales loss.'}
                                {product.alertLevel === 'high' && 'Consider restocking soon to maintain availability.'}
                                {product.alertLevel === 'medium' && 'Monitor stock levels and plan for restocking.'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Manage Stock
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Pagination */}
                <TablePagination pagination={pagination} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Alert Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-800">
                {alertProducts.filter(p => p.alertLevel === 'critical').length}
              </p>
              <p className="text-red-600">Critical Items</p>
              <p className="text-sm text-red-500 mt-1">Require immediate attention</p>
            </div>
            <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <TrendingDown className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-800">
                {alertProducts.filter(p => p.alertLevel === 'high').length}
              </p>
              <p className="text-orange-600">High Priority</p>
              <p className="text-sm text-orange-500 mt-1">Need restocking soon</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Package className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-800">
                {alertProducts.filter(p => p.alertLevel === 'medium').length}
              </p>
              <p className="text-yellow-600">Medium Priority</p>
              <p className="text-sm text-yellow-500 mt-1">Monitor closely</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAlerts;
