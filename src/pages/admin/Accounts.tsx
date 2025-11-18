// @ts-nocheck
import { useState, useEffect } from 'react';
import { getAccountsStats } from '@/lib/api-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Package, ShoppingBag, DollarSign, Calendar } from 'lucide-react';

interface AllTimeStats {
  totalSareesSold: number;
  totalConfirmedOrders: number;
  totalConfirmedValue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
}

const Accounts = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AllTimeStats>({
    totalSareesSold: 0,
    totalConfirmedOrders: 0,
    totalConfirmedValue: 0,
    totalOrders: 0,
    totalProducts: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    fetchAllTimeData();
  }, []);

  const fetchAllTimeData = async () => {
    try {
      setLoading(true);

      // Fetch stats from backend
      const statsData = await getAccountsStats();

      setStats({
        totalSareesSold: statsData.totalSareesSold || 0,
        totalConfirmedOrders: statsData.totalConfirmedOrders || 0,
        totalConfirmedValue: statsData.totalConfirmedValue || 0,
        totalOrders: statsData.totalOrders || 0,
        totalProducts: statsData.totalProducts || 0,
        averageOrderValue: statsData.averageOrderValue || 0,
      });
    } catch (error) {
      console.error('Error fetching all-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            All Time Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete business statistics from day one
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Sarees Sold */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Total Sarees Sold
            </CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {stats.totalSareesSold.toLocaleString()}
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Excluding cancelled, failed & pending
            </p>
          </CardContent>
        </Card>

        {/* Total Confirmed Orders */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">
              Confirmed Orders
            </CardTitle>
            <ShoppingBag className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {stats.totalConfirmedOrders.toLocaleString()}
            </div>
            <p className="text-xs text-green-700 mt-2">
              Successfully paid orders
            </p>
          </CardContent>
        </Card>

        {/* Total Confirmed Value */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {formatCurrency(stats.totalConfirmedValue)}
            </div>
            <p className="text-xs text-purple-700 mt-2">
              From confirmed orders only
            </p>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">
              Average Order Value
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">
              {formatCurrency(stats.averageOrderValue)}
            </div>
            <p className="text-xs text-orange-700 mt-2">
              Per confirmed order
            </p>
          </CardContent>
        </Card>

        {/* Total Orders (All) */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">
              Total Orders
            </CardTitle>
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">
              {stats.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-indigo-700 mt-2">
              Including pending & failed
            </p>
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-900">
              Total Products
            </CardTitle>
            <Package className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-900">
              {stats.totalProducts.toLocaleString()}
            </div>
            <p className="text-xs text-teal-700 mt-2">
              Active & inactive products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Conversion Rate</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats.totalOrders > 0 
                  ? ((stats.totalConfirmedOrders / stats.totalOrders) * 100).toFixed(2)
                  : 0}%
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Orders that were successfully paid
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">Avg Sarees Per Order</p>
              <p className="text-2xl font-bold text-green-700">
                {stats.totalConfirmedOrders > 0
                  ? (stats.totalSareesSold / stats.totalConfirmedOrders).toFixed(2)
                  : 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Items per confirmed order
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-900">
            <strong>Note:</strong> All statistics match the Orders page calculations:
          </p>
          <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
            <li><strong>Total Sarees Sold:</strong> From active orders only (excludes cancelled, failed & pending)</li>
            <li><strong>Confirmed Orders:</strong> Only orders with payment_status = 'paid'</li>
            <li><strong>Total Revenue:</strong> Sum of amounts from paid orders only</li>
            <li><strong>Total Orders:</strong> All orders in database (complete data, no 1000 limit)</li>
            <li><strong>Data Fetching:</strong> Uses batch loading to fetch all orders without restrictions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Accounts;

