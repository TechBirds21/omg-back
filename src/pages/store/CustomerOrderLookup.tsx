import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Phone, 
  Mail, 
  Receipt,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Printer
} from 'lucide-react';
import { getCustomerPurchases } from '@/lib/api-admin';
import { useToast } from '@/hooks/use-toast';

const CustomerOrderLookup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'phone' | 'email'>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [orders, setOrders] = useState<any>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your phone number or email',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const filters: any = {
        page: 1,
        size: 50,
      };
      
      if (searchType === 'phone') {
        filters.customer_phone = searchValue.trim();
      } else {
        filters.customer_email = searchValue.trim();
      }

      const data = await getCustomerPurchases(filters);
      setOrders(data);
      
      if (!data.bills || data.bills.length === 0) {
        toast({
          title: 'No Orders Found',
          description: 'No orders found for the provided information',
        });
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for orders. Please try again.',
        variant: 'destructive',
      });
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = (bill: any) => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Search className="h-8 w-8 text-primary" />
          Find Your Orders
        </h1>
        <p className="text-muted-foreground">
          Enter your phone number or email to view your purchase history
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Your Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Search By</Label>
            <div className="flex gap-4 mt-2">
              <Button
                variant={searchType === 'phone' ? 'default' : 'outline'}
                onClick={() => setSearchType('phone')}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                Phone Number
              </Button>
              <Button
                variant={searchType === 'email' ? 'default' : 'outline'}
                onClick={() => setSearchType('email')}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Address
              </Button>
            </div>
          </div>
          
          <div>
            <Label>
              {searchType === 'phone' ? 'Phone Number' : 'Email Address'}
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                type={searchType === 'phone' ? 'tel' : 'email'}
                placeholder={searchType === 'phone' ? 'Enter your phone number' : 'Enter your email address'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading || !searchValue.trim()}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      {orders && orders.customer_info && (
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{orders.customer_info.name}</p>
              </div>
              {orders.customer_info.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold">{orders.customer_info.phone}</p>
                </div>
              )}
              {orders.customer_info.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">{orders.customer_info.email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {orders && orders.bills && orders.bills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Your Orders ({orders.total})
            </h2>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {orders.total} {orders.total === 1 ? 'Order' : 'Orders'}
            </Badge>
          </div>

          {orders.bills.map((bill: any) => (
            <Card key={bill.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Order #{bill.bill_number || bill.id.slice(0, 8)}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(bill.created_at)}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {bill.payment_method || 'Cash'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {formatCurrency(bill.total_amount || bill.final_amount || 0)}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(bill)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Download invoice logic can be added here
                          toast({
                            title: 'Download',
                            description: 'Invoice download feature coming soon',
                          });
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Order Items */}
                {bill.items && bill.items.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <p className="font-semibold text-sm">Items Purchased:</p>
                    <div className="space-y-2">
                      {bill.items.map((item: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>Quantity: {item.quantity}</span>
                              {item.color && (
                                <>
                                  <span>•</span>
                                  <span>Color: {item.color}</span>
                                </>
                              )}
                              {item.size && (
                                <>
                                  <span>•</span>
                                  <span>Size: {item.size}</span>
                                </>
                              )}
                            </div>
                            <div className="mt-1">
                              <span className="text-sm font-medium">
                                {formatCurrency(item.unit_price)} × {item.quantity}
                              </span>
                              {item.discount_amount > 0 && (
                                <span className="text-xs text-green-600 ml-2">
                                  (Discount: {formatCurrency(item.discount_amount)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(item.line_total || (item.unit_price * item.quantity))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency((bill.total_amount || bill.final_amount || 0) + (bill.discount_amount || 0))}
                    </span>
                  </div>
                  {bill.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(bill.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(bill.total_amount || bill.final_amount || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Orders Found */}
      {orders && orders.bills && orders.bills.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground">
              We couldn't find any orders for the provided information.
              Please verify your phone number or email address and try again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerOrderLookup;

