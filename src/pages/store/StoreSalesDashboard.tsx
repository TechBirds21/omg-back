import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
  BarChart3,
  Package,
  Star,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { getStoreSalesAnalytics, getStoreSalesReport } from '@/lib/api-admin';
import { useToast } from '@/hooks/use-toast';

const StoreSalesDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
  });
  const [reportPage, setReportPage] = useState(1);
  const { toast } = useToast();

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getStoreSalesAnalytics({
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      });
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load store sales analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async () => {
    setLoading(true);
    try {
      const data = await getStoreSalesReport({
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        page: reportPage,
        size: 50,
      });
      setSalesReport(data);
    } catch (error) {
      console.error('Error loading sales report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [filters.start_date, filters.end_date]);

  useEffect(() => {
    loadSalesReport();
  }, [reportPage, filters.start_date, filters.end_date]);

  const handleRefresh = () => {
    loadAnalytics();
    loadSalesReport();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Store Sales Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive sales analytics and reports
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.today_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.today_bills || 0} bills today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.week_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.week_bills || 0} bills this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.month_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.month_bills || 0} bills this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_customers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Avg bill: {formatCurrency(analytics.average_bill_value || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Date Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Top Products */}
          {analytics && analytics.top_products && analytics.top_products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Rank</th>
                        <th className="text-left p-3 font-medium">Product</th>
                        <th className="text-left p-3 font-medium">Quantity</th>
                        <th className="text-left p-3 font-medium">Revenue</th>
                        <th className="text-left p-3 font-medium">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.top_products.map((product: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">#{idx + 1}</span>
                              {idx < 3 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                            </div>
                          </td>
                          <td className="p-3 font-medium">{product.product_name}</td>
                          <td className="p-3">{product.quantity || 0}</td>
                          <td className="p-3 font-medium">{formatCurrency(product.revenue || 0)}</td>
                          <td className="p-3">{formatCurrency(product.average_price || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Customers */}
          {analytics && analytics.top_customers && analytics.top_customers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Rank</th>
                        <th className="text-left p-3 font-medium">Customer</th>
                        <th className="text-left p-3 font-medium">Contact</th>
                        <th className="text-left p-3 font-medium">Total Spent</th>
                        <th className="text-left p-3 font-medium">Bills</th>
                        <th className="text-left p-3 font-medium">Avg Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.top_customers.map((customer: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">#{idx + 1}</span>
                              {idx < 3 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                            </div>
                          </td>
                          <td className="p-3 font-medium">{customer.customer_name}</td>
                          <td className="p-3">
                            {customer.customer_phone || customer.customer_email || 'N/A'}
                          </td>
                          <td className="p-3 font-medium">{formatCurrency(customer.total_spent || 0)}</td>
                          <td className="p-3">{customer.bill_count || 0}</td>
                          <td className="p-3">{formatCurrency(customer.average_bill || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          {salesReport && salesReport.daily_sales && salesReport.daily_sales.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Day-wise Sales Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Bills</th>
                        <th className="text-left p-3 font-medium">Revenue</th>
                        <th className="text-left p-3 font-medium">Customers</th>
                        <th className="text-left p-3 font-medium">Avg Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReport.daily_sales.map((day: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-3">{formatDate(day.date)}</td>
                          <td className="p-3">{day.bills}</td>
                          <td className="p-3 font-medium">{formatCurrency(day.revenue)}</td>
                          <td className="p-3">{day.customers}</td>
                          <td className="p-3">{formatCurrency(day.average_bill)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {salesReport.pages > 1 && (
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReportPage(Math.max(1, reportPage - 1))}
                      disabled={reportPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {reportPage} of {salesReport.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReportPage(Math.min(salesReport.pages, reportPage + 1))}
                      disabled={reportPage >= salesReport.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No sales data found for the selected period
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StoreSalesDashboard;

