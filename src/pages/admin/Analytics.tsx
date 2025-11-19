// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package,
  RefreshCw,
  Download
} from 'lucide-react';
import { getAllOrdersForAnalytics, getCustomers, getPincodesData, getVisits } from '@/lib/api-admin';
import { LoadingSkeleton } from '@/components/ui/loading';
import { useAdminFilters } from '@/contexts/AdminFilterContext';

const Analytics = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<'day'|'week'|'month'>('day');
  const [showAllTime, setShowAllTime] = useState(false);
  const { selectedYear, selectedMonth } = useAdminFilters();

  useEffect(() => {
    fetchAnalyticsData();
  }, [granularity, selectedYear, selectedMonth, showAllTime]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      let ordersData;
      
      if (showAllTime) {
        // Fetch all orders without any date filters
        ordersData = await getAllOrdersForAnalytics({});
      } else {
        // Fetch orders for selected month/year
        const filters = {
          year: selectedYear,
          month: selectedMonth,
        };
        ordersData = await getAllOrdersForAnalytics(filters);
      }
      
      const customersData = await getCustomers();
      // Build pincode map for current data set
      try {
        const pinSet = new Set<string>();
        for (const o of (ordersData || [])) {
          const addr = String((o as any)?.shipping_address || '');
          const m = addr.match(/\b(\d{5,6})\b/);
          if (m && m[1]) pinSet.add(m[1]);
          const direct = (o as any)?.pincode || (o as any)?.postal_code;
          if (direct && /\d{5,6}/.test(String(direct))) pinSet.add(String(direct));
        }
        if (pinSet.size > 0) {
          const pins = Array.from(pinSet);
          try {
            const pinRows = await getPincodesData(pins);
            const map: Record<string, { country?: string; state?: string }> = {};
            for (const r of (pinRows || [])) {
              if (!r) continue;
              map[String(r.pincode)] = { country: r.country || 'India', state: r.state || undefined };
            }
            (window as any).__pincode_map = map;
          } catch (e) {
            console.error('Error fetching pincodes:', e);
            (window as any).__pincode_map = {};
          }
        } else {
          (window as any).__pincode_map = {};
        }
      } catch { (window as any).__pincode_map = {}; }
      // optional: fetch visits if table exists
      try {
        const visitsData = await getVisits(startDate.toISOString(), new Date(endDate.getTime()+24*60*60*1000-1).toISOString());
        (window as any).__visits_cache = Array.isArray(visitsData) ? visitsData : [];
      } catch (e) {
        console.error('Error fetching visits:', e);
        (window as any).__visits_cache = [];
      }
      setOrders(ordersData);
      setCustomers(customersData);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  // Calculate date range based on showAllTime or selected month/year
  let startDate: Date, endDate: Date;
  
  if (showAllTime) {
    // For all time, use the earliest order date to current date
    const orderDates = orders.map(order => new Date(order.created_at));
    startDate = orderDates.length > 0 ? new Date(Math.min(...orderDates.map(d => d.getTime()))) : new Date(2025, 0, 1);
    endDate = new Date();
  } else {
    // For specific month/year
    startDate = new Date(selectedYear, selectedMonth - 1, 1);
    endDate = new Date(selectedYear, selectedMonth, 0);
  }

  // Filter data by date range
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startDate && orderDate <= endDate;
  });

  const filteredCustomers = customers.filter(customer => {
    const joinDate = new Date(customer.created_at);
    return joinDate >= startDate && joinDate <= endDate;
  });

  // Visits analytics if available
  const visits: any[] = (window as any).__visits_cache || [];
  const filteredVisits = visits.filter(v => {
    const dt = new Date(v.created_at);
    return dt >= startDate && dt <= endDate;
  });
  const visitsByCountry = filteredVisits.reduce((acc: Record<string, number>, v: any) => {
    const key = String(v.country || 'Unknown'); acc[key] = (acc[key] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  // Orders by pincode → country via pincodes table
  const pincodeMap: Record<string, { country?: string; state?: string }> = (window as any).__pincode_map || {};
  const ordersByCountry = filteredOrders.reduce((acc: Record<string, number>, o: any) => {
    const addr = String(o?.shipping_address || '');
    const m = addr.match(/\b(\d{5,6})\b/);
    const pin = m && m[1] ? m[1] : (o?.pincode || o?.postal_code || null);
    const meta = pin ? pincodeMap[String(pin)] : undefined;
    const country = meta?.country || 'India';
    acc[country] = (acc[country] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const visitorVsOrdersData = Object.keys({ ...visitsByCountry, ...ordersByCountry }).map(k => ({
    country: k,
    visits: visitsByCountry[k] || 0,
    orders: ordersByCountry[k] || 0,
  })).sort((a,b)=> (b.visits+b.orders)-(a.visits+a.orders)).slice(0,10);

  // Calculate metrics
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.amount), 0);
  const totalOrders = filteredOrders.length;
  const newCustomers = filteredCustomers.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Generate chart data
  const chartData = (() => {
    if (granularity === 'day') {
      const out: any[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        const dayOrders = filteredOrders.filter(o => String(o.created_at).slice(0,10) === key);
        const dayCustomers = filteredCustomers.filter(c => c.created_at && String(c.created_at).slice(0,10) === key);
        out.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayOrders.reduce((s, o) => s + Number(o.amount||0), 0),
          orders: dayOrders.length,
          customers: dayCustomers.length
        });
      }
      return out;
    }
    if (granularity === 'week') {
      const map = new Map<string, { revenue: number; orders: number; customers: number }>();
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const wk = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + (new Date(d.getFullYear(), 0, 1).getDay()||7)-1)/7)).padStart(2,'0')}`;
        if (!map.has(wk)) map.set(wk, { revenue: 0, orders: 0, customers: 0 });
        const key = d.toISOString().split('T')[0];
        const dayOrders = filteredOrders.filter(o => String(o.created_at).slice(0,10) === key);
        const dayCustomers = filteredCustomers.filter(c => c.created_at && String(c.created_at).slice(0,10) === key);
        const agg = map.get(wk)!;
        agg.revenue += dayOrders.reduce((s, o) => s + Number(o.amount||0), 0);
        agg.orders += dayOrders.length;
        agg.customers += dayCustomers.length;
      }
      return Array.from(map.entries()).map(([k,v]) => ({ date: k, ...v }));
    }
    // month
    if (showAllTime) {
      // For all time, group by month
      const monthMap = new Map<string, { revenue: number; orders: number; customers: number }>();
      
      filteredOrders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        const label = orderDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { revenue: 0, orders: 0, customers: 0 });
        }
        
        const agg = monthMap.get(monthKey)!;
        agg.revenue += Number(order.amount || 0);
        agg.orders += 1;
      });
      
      filteredCustomers.forEach(customer => {
        const customerDate = new Date(customer.created_at);
        const monthKey = `${customerDate.getFullYear()}-${String(customerDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthMap.has(monthKey)) {
          monthMap.get(monthKey)!.customers += 1;
        }
      });
      
      return Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return {
            date: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
            ...data
          };
        });
    } else {
      // For specific month
      const label = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return [{
        date: label,
        revenue: filteredOrders.reduce((s,o)=>s+Number(o.amount||0),0),
        orders: filteredOrders.length,
        customers: filteredCustomers.length
      }];
    }
  })();

  // Order status distribution
  const statusData = [
    { name: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: '#F59E0B' },
    { name: 'Confirmed', value: orders.filter(o => o.status === 'confirmed').length, color: '#3B82F6' },
    { name: 'Processing', value: orders.filter(o => o.status === 'processing').length, color: '#A855F7' },
    { name: 'Shipped', value: orders.filter(o => o.status === 'shipped').length, color: '#10B981' },
    { name: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: '#22C55E' }
  ];

  const [statusActiveIndex, setStatusActiveIndex] = useState<number>(0);
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  // Product performance
  const productStats = orders.reduce((acc, order) => {
    const product = order.product_name;
    if (!acc[product]) {
      acc[product] = { name: product, sales: 0, revenue: 0 };
    }
    acc[product].sales += 1;
    acc[product].revenue += parseFloat(order.amount);
    return acc;
  }, {});

  const topProducts = Object.values(productStats)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5);

  // Vendor-wise aggregation within filtered date range
  const [vendorPaidOnly, setVendorPaidOnly] = useState<'total'|'paid'>('total');
  const [vendorTopN, setVendorTopN] = useState<string>('10');
  const getVendorName = (order: any) => {
    const fromJoin = (order && order.vendors && order.vendors.name) ? order.vendors.name : null;
    const fromProduct = (order && Array.isArray(order.products) && order.products[0] && order.products[0].vendors && order.products[0].vendors.name) ? order.products[0].vendors.name : null;
    const fromFlat = order?.vendor_name || order?.vendor || null;
    const fromCode = order?.vendor_code || null;
    return String(fromJoin || fromProduct || fromFlat || fromCode || 'Unknown');
  };

  const vendorMap = new Map<string, { vendor: string; orders: number; confirmed: number; shipped: number; ordersPaid: number; revenueTotal: number; revenuePaid: number }>();
  for (const o of filteredOrders) {
    const vname = getVendorName(o);
    if (!vendorMap.has(vname)) vendorMap.set(vname, { vendor: vname, orders: 0, confirmed: 0, shipped: 0, ordersPaid: 0, revenueTotal: 0, revenuePaid: 0 });
    const agg = vendorMap.get(vname)!;
    agg.orders += 1;
    if (String(o.status) === 'confirmed') agg.confirmed += 1;
    if (String(o.status) === 'shipped') agg.shipped += 1;
    const amt = Number(o.amount || 0);
    agg.revenueTotal += amt;
    if (String(o.payment_status) === 'paid') { agg.revenuePaid += amt; agg.ordersPaid += 1; }
  }
  const vendorAll = Array.from(vendorMap.values()).map(v => ({
    vendor: v.vendor,
    orders: v.orders,
    confirmed: v.confirmed,
    shipped: v.shipped,
    ordersPaid: v.ordersPaid,
    revenue: vendorPaidOnly === 'paid' ? v.revenuePaid : v.revenueTotal,
    revenuePaid: v.revenuePaid,
    revenueTotal: v.revenueTotal,
  }));
  const sortedVendor = vendorAll.sort((a, b) => b.revenue - a.revenue);
  const vendorData = vendorTopN === 'all' ? sortedVendor : sortedVendor.slice(0, Math.max(1, parseInt(vendorTopN)));

  const stats = [
    {
      title: 'Total Revenue',
      value: `₹${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: 12
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: 8
    },
    {
      title: 'Visits (This Period)',
      value: filteredVisits.length,
      icon: Users,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      trend: 0
    },
    {
      title: 'New Customers',
      value: newCustomers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 15
    },
    {
      title: 'Avg Order Value',
      value: `₹${avgOrderValue.toFixed(0)}`,
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: -3
    }
  ];

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your business performance and insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* All Time Toggle */}
          <Button
            variant={showAllTime ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllTime(!showAllTime)}
          >
            {showAllTime ? "All Time" : `${selectedMonth}/${selectedYear}`}
          </Button>
          
          <Select value={granularity} onValueChange={(v:any)=>setGranularity(v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Granularity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Per Day</SelectItem>
              <SelectItem value="week">Per Week</SelectItem>
              <SelectItem value="month">Per Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalyticsData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
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
                  <div className="flex items-center mt-2">
                    {stat.trend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${stat.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Math.abs(stat.trend)}%
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  fill="#DBEAFE" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visits vs Orders by Country */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic vs Orders by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitorVsOrdersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visits" fill="#60A5FA" name="Visits" />
                <Bar dataKey="orders" fill="#34D399" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders & Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="customers" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={105}
                  dataKey="value"
                  activeIndex={statusActiveIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, idx) => setStatusActiveIndex(idx)}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendor-wise Orders/Confirmed/Shipped/Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vendor Performance (Orders, Confirmed, Shipped, Revenue)</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={vendorPaidOnly} onValueChange={(v:any)=>setVendorPaidOnly(v)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Revenue Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total Revenue</SelectItem>
                  <SelectItem value="paid">Paid Revenue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={vendorTopN} onValueChange={setVendorTopN}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Top N" /></SelectTrigger>
                <SelectContent>
                  {['5','10','15','20','all'].map(v => (<SelectItem key={v} value={v}>{v === 'all' ? 'All' : `Top ${v}`}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={vendorData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vendor" interval={0} angle={-20} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => {
                  const n = String(name || '').toString();
                  if (n === 'revenue') return [`₹${Number(value).toLocaleString()}`, vendorPaidOnly === 'paid' ? 'Paid Revenue' : 'Total Revenue'];
                  const label = n ? (n.charAt(0).toUpperCase() + n.slice(1)) : 'Value';
                  return [value as any, label];
                }} />
                <Bar yAxisId="left" dataKey="orders" fill="#93C5FD" name="orders" />
                <Bar yAxisId="left" dataKey="confirmed" fill="#A78BFA" name="confirmed" />
                <Bar yAxisId="left" dataKey="shipped" fill="#34D399" name="shipped" />
                <Bar yAxisId="right" dataKey="revenue" fill="#F59E0B" name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
