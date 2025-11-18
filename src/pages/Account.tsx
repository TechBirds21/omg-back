// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Package, 
  Clock, 
  Truck, 
  CheckCircle,
  Eye,
  ChevronRight,
  MapPin
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ColorCircle } from '@/lib/colorUtils';
import { getOrdersByCustomerDetails } from '@/lib/api-storefront';
import { useNavigate } from 'react-router-dom';

// Mock user data - in real implementation, this would come from authentication
const mockUser = {
  name: 'Priya Sharma',
  email: 'priya.sharma@example.com',
  phone: '+91 9876543210',
  address: 'Flat 301, Sai Residency, Hyderabad, Telangana 500034'
};

const Account = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserOrders();
  }, []);

  const fetchUserOrders = async () => {
    try {
      // In real implementation, get user credentials from authentication context
      const orderData = await getOrdersByCustomerDetails(mockUser.email, mockUser.phone);
      setOrders(orderData);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return CheckCircle;
      case 'shipped': return Truck;
      case 'processing': return Clock;
      case 'pending': return Package;
      default: return Package;
    }
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/account/order/${orderId}`);
  };

  // Pagination
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = orders.slice(startIndex, startIndex + ordersPerPage);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">My Account</h1>
            <p className="text-muted-foreground">Manage your orders and account settings</p>
          </div>

          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
              {/* <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger> */}
            </TabsList>

            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order History ({orders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="animate-pulse space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-muted h-24 rounded"></div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {paginatedOrders.map((order) => {
                          const StatusIcon = getStatusIcon(order.status);
                          const delivery = order.deliveries?.[0];
                          
                          return (
                            <div
                              key={order.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="font-semibold">{order.product_name}</h3>
                                    <p className="text-sm text-muted-foreground">Order #{order.order_id}</p>
                                  </div>
                                  <Badge className={getStatusColor(order.status)}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Ordered: {new Date(order.created_at).toLocaleDateString()}</span>
                                  <span>Qty: {order.quantity}</span>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>Delivery confirmed</span>
                                  </div>
                                  {order.colors && order.colors.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <ColorCircle color={order.colors[0]} size="w-3 h-3" />
                                      <span>{order.colors[0]}</span>
                                    </div>
                                  )}
                                  {delivery?.tracking_id && (
                                    <span>Tracking: {delivery.tracking_id}</span>
                                  )}
                                  {delivery?.tracking_number && (
                                    <span>Tracking: {delivery.tracking_number}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          
                          {[...Array(totalPages)].map((_, i) => (
                            <Button
                              key={i}
                              variant={currentPage === i + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(i + 1)}
                            >
                              {i + 1}
                            </Button>
                          ))}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="font-medium">{mockUser.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="font-medium">{mockUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="font-medium">{mockUser.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p className="font-medium">{mockUser.address}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button>Edit Profile</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Account;
