// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign,
  Eye,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  topPages: Array<{ page: string; visits: number }>;
  recentEvents: Array<{ event: string; timestamp: string; properties: any }>;
  performanceMetrics: Array<{ name: string; value: number; timestamp: string }>;
  errorCount: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch analytics data from Supabase
      const [
        visitsResult,
        ordersResult,
        eventsResult,
        performanceResult,
        errorsResult
      ] = await Promise.all([
        // @ts-ignore - analytics tables exist but not in generated types
        supabase.from('site_visits').select('*', { count: 'exact' }),
        supabase.from('orders').select('amount, created_at', { count: 'exact' }),
        // @ts-ignore
        supabase.from('analytics_events').select('*').order('timestamp', { ascending: false }).limit(10),
        // @ts-ignore
        supabase.from('performance_metrics').select('*').order('timestamp', { ascending: false }).limit(10),
        // @ts-ignore
        supabase.from('analytics_events').select('*', { count: 'exact' }).eq('event', 'error')
      ]);

      if (visitsResult.error) throw visitsResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (performanceResult.error) throw performanceResult.error;
      if (errorsResult.error) throw errorsResult.error;

      // Calculate metrics
      const totalVisits = visitsResult.count || 0;
      // @ts-ignore
      const uniqueVisitors = new Set(visitsResult.data?.map(v => v.session_id)).size;
      const totalOrders = ordersResult.count || 0;
      const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + (Number(order.amount) || 0), 0) || 0;
      const conversionRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get top pages
      // @ts-ignore
      const pageVisits = visitsResult.data?.reduce((acc, visit) => {
        // @ts-ignore
        acc[visit.page] = (acc[visit.page] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topPages = Object.entries(pageVisits)
        .map(([page, visits]) => ({ page, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);

      setAnalyticsData({
        totalVisits,
        uniqueVisitors,
        totalOrders,
        totalRevenue,
        conversionRate,
        averageOrderValue,
        topPages,
        // @ts-ignore
        recentEvents: eventsResult.data || [],
        // @ts-ignore
        performanceMetrics: performanceResult.data || [],
        errorCount: errorsResult.count || 0
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <h3 className="font-medium">Error loading analytics</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button onClick={fetchAnalyticsData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) return null;

  const mainMetrics = [
    {
      title: 'Total Visits',
      value: analyticsData.totalVisits.toLocaleString(),
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%'
    },
    {
      title: 'Unique Visitors',
      value: analyticsData.uniqueVisitors.toLocaleString(),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%'
    },
    {
      title: 'Total Orders',
      value: analyticsData.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+15%'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analyticsData.totalRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+18%'
    }
  ];

  const secondaryMetrics = [
    {
      title: 'Conversion Rate',
      value: `${analyticsData.conversionRate.toFixed(2)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(analyticsData.averageOrderValue),
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Error Count',
      value: analyticsData.errorCount.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Performance Score',
      value: '85/100',
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your website performance and user behavior</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchAnalyticsData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainMetrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center space-x-1 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {metric.change}
                </Badge>
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryMetrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.topPages.map((page, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{page.page}</span>
                  <Badge variant="secondary">{page.visits} visits</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.recentEvents.map((event, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">{event.event}</span>
                    <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                  </div>
                  <Badge variant="outline">{event.properties?.page || 'N/A'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData.performanceMetrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-sm text-gray-700 mb-2">
                  {metric.name.replace(/_/g, ' ').toUpperCase()}
                </h4>
                <div className="text-lg font-bold text-gray-900">
                  {metric.value.toFixed(2)}ms
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(metric.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
