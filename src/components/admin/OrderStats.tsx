import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  ShoppingCart,
  Clock
} from 'lucide-react';

interface OrderStatsProps {
  summaryData: {
    totalOrders: number;
    totalAmount: number;
    totalSarees: number;
    activeSarees: number;
  };
  statusCounts: {
    pending: number;
    confirmed: number;
    processing: number;
    ready_to_ship: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    failed: number;
  };
}

export const OrderStats: React.FC<OrderStatsProps> = ({ summaryData, statusCounts }) => {
  const mainStats = [
    { 
      title: 'Total Orders', 
      value: summaryData.totalOrders.toLocaleString(), 
      icon: ShoppingCart, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'All orders placed'
    },
    { 
      title: 'Total Revenue', 
      value: `₹${summaryData.totalAmount.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Total order value'
    },
    { 
      title: 'Total Sarees', 
      value: summaryData.totalSarees.toLocaleString(), 
      icon: Package, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Total sarees ordered'
    },
    { 
      title: 'Active Sarees', 
      value: summaryData.activeSarees.toLocaleString(), 
      icon: CheckCircle, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      description: 'Sarees from confirmed orders (excl. cancelled & pending)'
    }
  ];

  const statusBreakdown = [
    { 
      title: 'Pending', 
      value: statusCounts.pending.toLocaleString(), 
      icon: Clock, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Awaiting confirmation'
    },
    { 
      title: 'Confirmed', 
      value: statusCounts.confirmed.toLocaleString(), 
      icon: CheckCircle, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Confirmed orders'
    },
    { 
      title: 'Processing', 
      value: statusCounts.processing.toLocaleString(), 
      icon: Package, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Being prepared'
    },
    { 
      title: 'Ready to Ship', 
      value: statusCounts.ready_to_ship.toLocaleString(), 
      icon: Truck, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Ready for dispatch'
    },
    { 
      title: 'Shipped', 
      value: statusCounts.shipped.toLocaleString(), 
      icon: Truck, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'In transit'
    },
    { 
      title: 'Delivered', 
      value: statusCounts.delivered.toLocaleString(), 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Successfully delivered'
    },
    { 
      title: 'Cancelled', 
      value: statusCounts.cancelled.toLocaleString(), 
      icon: XCircle, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Cancelled orders'
    },
    { 
      title: 'Failed', 
      value: statusCounts.failed.toLocaleString(), 
      icon: XCircle, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Failed orders'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {statusBreakdown.map((status, index) => (
              <div
                key={index}
                className={`${status.bgColor} rounded-lg p-3 border cursor-pointer hover:shadow-md transition-all`}
                onClick={() => {/* Handle status filter click */}}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <status.icon className={`h-4 w-4 ${status.color}`} />
                  <span className={`text-sm font-medium ${status.color}`}>
                    {status.title}
                  </span>
                </div>
                <div className={`text-lg font-bold ${status.color}`}>
                  {status.value}
                </div>
                <p className="text-xs text-gray-600 mt-1">{status.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
