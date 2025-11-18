// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  Search, 
  Package,
  AlertTriangle,
  TrendingUp,
  Edit,
  RefreshCw,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { getProductsForAdmin, getCategories, getInventory, updateInventoryItem } from '@/lib/api-admin';
import type { Product, Category } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ColorCircle } from '@/lib/colorUtils';
import { getProductTotalStock } from '@/lib/utils';

interface StockData {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

const InventoryManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});
  const [updatingStock, setUpdatingStock] = useState(false);
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
        description: "Inventory data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh inventory data.",
        variant: "destructive",
      });
    }
  };

  const handleStockEdit = (product: Product) => {
    setSelectedProduct(product);
    // Initialize stock updates with current stock values
    const colorStock = Array.isArray(product.color_stock) ? product.color_stock : [];
    const updates: Record<string, number> = {};
    colorStock.forEach((item: any) => {
      if (item.color) {
        updates[item.color] = item.stock || 0;
      }
    });
    setStockUpdates(updates);
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (!selectedProduct) return;

    setUpdatingStock(true);
    try {
      // Update each color stock individually
      for (const [color, newStock] of Object.entries(stockUpdates)) {
        await updateInventoryItem(selectedProduct.id, { current_stock: newStock });
      }

      toast({
        title: "Stock Updated",
        description: "Product stock levels have been updated successfully.",
      });
      
      setShowStockModal(false);
      await executeWithLoading(fetchData, { isRefresh: true, preserveData: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stock levels.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStock(false);
    }
  };

  // Calculate stock statistics
  const stockData: StockData = useMemo(() => {
    const totalProducts = products.length;
    const inStock = products.filter(p => p.stock_status === 'in_stock').length;
    const lowStock = products.filter(p => p.stock_status === 'low_stock').length;
    const outOfStock = products.filter(p => p.stock_status === 'out_of_stock').length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * getProductTotalStock(p)), 0);

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      totalValue
    };
  }, [products]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
      const matchesStock = stockFilter === 'all' || product.stock_status === stockFilter;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  // Pagination
  const pagination = usePagination(filteredProducts, 20);

  const getStockBadgeColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = [
    {
      title: 'Total Products',
      value: stockData.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'In Stock',
      value: stockData.inStock,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Low Stock',
      value: stockData.lowStock,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100'
    },
    {
      title: 'Out of Stock',
      value: stockData.outOfStock,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100'
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
          <h1 className="text-3xl font-bold text-foreground">Product Inventory</h1>
          <p className="text-muted-foreground">View product stock levels and inventory details</p>
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

      {/* Inventory Value Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Inventory Value</h3>
              <p className="text-3xl font-bold text-blue-600">₹{stockData.totalValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Based on current stock and selling prices</p>
            </div>
            <div className="p-4 rounded-full bg-blue-100">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products by name or SKU..."
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
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Stock Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Levels</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products Inventory ({filteredProducts.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Product</th>
                  <th className="text-left p-4 font-semibold">SKU</th>
                  <th className="text-left p-4 font-semibold">Category</th>
                  <th className="text-left p-4 font-semibold">Stock Status</th>
                  <th className="text-left p-4 font-semibold">Total Stock</th>
                  <th className="text-left p-4 font-semibold">Color Stock Details</th>
                  <th className="text-left p-4 font-semibold">Price</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Products Found</h3>
                      <p className="text-muted-foreground">No products match your current filters.</p>
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedData.map((product) => {
                    const colorStock = Array.isArray(product.color_stock) ? product.color_stock : [];
                    
                    return (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[product.cover_image_index || 0]} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.description?.slice(0, 50)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <code className="bg-muted px-2 py-1 rounded text-sm">{product.sku}</code>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge className={getStockBadgeColor(product.stock_status || 'in_stock')}>
                            {product.stock_status?.replace('_', ' ').toUpperCase() || 'IN STOCK'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{getProductTotalStock(product)}</span>
                          <span className="text-muted-foreground text-sm"> units</span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            {colorStock.length > 0 ? (
                              colorStock.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                                  <div className="flex items-center space-x-2">
                                    <ColorCircle color={item.color} size="w-4 h-4" />
                                    <span className="text-sm font-medium">{item.color}</span>
                                  </div>
                                  <Badge variant={
                                    item.stock === 0 ? "destructive" : 
                                    item.stock <= 5 ? "secondary" : "default"
                                  } className="text-xs">
                                    {item.stock} units
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No color variants</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">₹{product.price.toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStockEdit(product)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Stock
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <TablePagination pagination={pagination} />
        </CardContent>
      </Card>

      {/* Stock Edit Modal */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Stock Levels - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {Array.isArray(selectedProduct.color_stock) && selectedProduct.color_stock.map((item: any, index: number) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <ColorCircle color={item.color} size="w-8 h-8" />
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{item.color}</Label>
                      <p className="text-xs text-muted-foreground">Current: {item.stock} units</p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        value={stockUpdates[item.color] || 0}
                        onChange={(e) => setStockUpdates(prev => ({
                          ...prev,
                          [item.color]: parseInt(e.target.value) || 0
                        }))}
                        placeholder="New stock"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowStockModal(false)}
                  disabled={updatingStock}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleStockUpdate}
                  disabled={updatingStock}
                >
                  {updatingStock ? 'Updating...' : 'Update Stock'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default InventoryManagement;
