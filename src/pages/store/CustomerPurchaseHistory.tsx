import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  ShoppingBag,
  Calendar,
  DollarSign,
  Package,
  RefreshCw,
  Receipt,
  MapPin
} from 'lucide-react';
import { getCustomerPurchases } from '@/lib/api-admin';
import { useToast } from '@/hooks/use-toast';

const CustomerPurchaseHistory: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const loadCustomerPurchases = async () => {
    if (!customerPhone && !customerEmail) {
      toast({
        title: 'Error',
        description: 'Please enter customer phone or email',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await getCustomerPurchases({
        customer_phone: customerPhone || undefined,
        customer_email: customerEmail || undefined,
        page: page,
        size: 20,
      });
      setPurchaseData(data);
    } catch (error) {
      console.error('Error loading customer purchases:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer purchase history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadCustomerPurchases();
  };

  useEffect(() => {
    if (customerPhone || customerEmail) {
      loadCustomerPurchases();
    }
  }, [page]);

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
        hour: '2-digit',
        minute: '2-digit',
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
            <User className="h-8 w-8 text-primary" />
            Customer Purchase History
          </h1>
          <p className="text-muted-foreground mt-1">
            View detailed purchase history for any customer
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div>
              <Label>Email Address</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={loading || (!customerPhone && !customerEmail)}
            className="mt-4"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </CardContent>
      </Card>

      {/* Customer Info */}
      {purchaseData && purchaseData.customer_info && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{purchaseData.customer_info.name}</p>
                </div>
              </div>
              {purchaseData.customer_info.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold">{purchaseData.customer_info.phone}</p>
                  </div>
                </div>
              )}
              {purchaseData.customer_info.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{purchaseData.customer_info.email}</p>
                  </div>
                </div>
              )}
              {purchaseData.customer_info.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-semibold">{purchaseData.customer_info.address}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase History */}
      {purchaseData && purchaseData.bills && purchaseData.bills.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Purchase History</span>
              <Badge variant="outline">{purchaseData.total} total bills</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {purchaseData.bills.map((bill: any) => (
                <div key={bill.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold">{bill.bill_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(bill.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(bill.total_amount || bill.final_amount || 0)}
                      </div>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {bill.payment_method || 'Cash'}
                      </Badge>
                    </div>
                  </div>

                  {/* Bill Items */}
                  {bill.items && bill.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold mb-2">Items ({bill.items.length}):</p>
                      <div className="space-y-2">
                        {bill.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <p className="font-medium">{item.product_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Qty: {item.quantity}</span>
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
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatCurrency(item.line_total || (item.unit_price * item.quantity))}
                              </p>
                              {item.discount_amount > 0 && (
                                <p className="text-xs text-green-600">
                                  -{formatCurrency(item.discount_amount)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {purchaseData.pages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {page} of {purchaseData.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(purchaseData.pages, page + 1))}
                  disabled={page >= purchaseData.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : purchaseData && purchaseData.bills && purchaseData.bills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No purchase history found for this customer
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default CustomerPurchaseHistory;

