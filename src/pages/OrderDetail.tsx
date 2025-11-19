// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Package, 
  Clock, 
  Truck, 
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  User
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ColorCircle } from '@/lib/colorUtils';
import { getColorName } from '@/lib/colorUtils';
import { getOrdersByCustomerDetails } from '@/lib/api-storefront';
import { useParams, useNavigate } from 'react-router-dom';

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock user data - in real implementation, this would come from authentication
  const mockUser = {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 9876543210',
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // In real implementation, get user credentials from authentication context
      const orders = await getOrdersByCustomerDetails(mockUser.email, mockUser.phone);
      const foundOrder = orders?.find((o: any) => o.id === orderId);
      setOrder(foundOrder);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="bg-muted h-8 w-64 rounded"></div>
            <div className="bg-muted h-96 rounded-lg"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Order not found</p>
            <Button onClick={() => navigate('/account')} className="mt-4">
              Back to Account
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const delivery = order.deliveries?.[0];

  const orderTimeline = [
    { status: 'Order Placed', date: order.created_at, completed: true },
    { status: 'Payment Confirmed', date: order.created_at, completed: order.payment_status === 'paid' },
    { status: 'Processing', date: order.updated_at, completed: order.status !== 'pending' },
    { status: 'Shipped', date: delivery?.pickup_date, completed: ['shipped', 'delivered'].includes(order.status) },
    { status: 'Out for Delivery', date: null, completed: order.status === 'delivered' },
    { status: 'Delivered', date: delivery?.delivered_date, completed: order.status === 'delivered' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/account')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Account
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Order Details</h1>
              <p className="text-muted-foreground">Order #{order.order_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{order.product_name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {order.sku || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
                      {order.colors && order.colors.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-medium">Colors:</span>
                          {order.colors.map((color: string, index: number) => (
                            <div key={index} className="flex items-center gap-1">
                              <ColorCircle color={color} size="w-4 h-4" />
                              <span className="text-sm">{getColorName(color)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderTimeline.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className="flex-1">
                          <p className={`font-medium ${item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {item.status}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.date ? new Date(item.date).toLocaleString() : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {order.customer_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {delivery?.courier_service && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span>Courier: {delivery.courier_service}</span>
                      </div>
                    )}
                    {delivery?.tracking_number && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>Tracking ID: {delivery.tracking_number}</span>
                      </div>
                    )}
                    {delivery?.courier_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">Courier Phone: {delivery.courier_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        {order.status === 'delivered' 
                          ? delivery?.delivery_timestamp
                            ? `Delivered on ${new Date(delivery.delivery_timestamp).toLocaleDateString()}`
                            : 'Delivered' 
                          : delivery?.estimated_delivery
                            ? `Expected: ${new Date(delivery.estimated_delivery).toLocaleDateString()}`
                            : 'Processing'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.shipping_address || 'Address on file'}
                    </p>
                    <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default OrderDetail;
