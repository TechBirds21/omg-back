// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Download,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard
} from 'lucide-react';
import { Order } from '@/lib/supabase';
import { getColorName } from '@/lib/colorUtils';
import { ColorCircle } from '@/lib/colorUtils';

interface OrderTableProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
  onDownloadInvoice: (order: Order) => void;
  isLoading: boolean;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onViewOrder,
  onDownloadInvoice,
  isLoading
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'ready_to_ship': return <Truck className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'ready_to_ship': return 'bg-orange-100 text-orange-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders ({orders.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Order ID</th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-mono text-sm">{order.order_id}</div>
                  </td>
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-sm text-gray-500">{order.customer_phone}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      {order.product_image && (
                        <img 
                          src={order.product_image} 
                          alt={order.product_name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-sm">{order.product_name}</div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <ColorCircle color={order.product_colors?.[0] || 'N/A'} size={12} />
                          <span>{getColorName(order.product_colors?.[0] || 'N/A')}</span>
                          {order.product_sizes && order.product_sizes.length > 0 && (
                            <span>• Size: {order.product_sizes[0]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge className={`${getStatusColor(order.status)} flex items-center space-x-1 w-fit`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status.replace('_', ' ')}</span>
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">₹{Number(order.amount).toLocaleString()}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-1">
                      <CreditCard className="h-3 w-3" />
                      <span>{order.payment_method || 'Online'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">{formatDate(order.created_at)}</div>
                    <div className="text-xs text-gray-500">{formatTime(order.created_at)}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDownloadInvoice(order)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
