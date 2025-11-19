// Store Bills Management - View all bills created
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Receipt, 
  Search, 
  Download, 
  Mail, 
  MessageSquare,
  Eye,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface StoreBill {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  invoice_sent_email: boolean;
  invoice_sent_sms: boolean;
  invoice_pdf_url?: string;
  created_at: string;
  items?: any[];
}

const StoreBills = () => {
  const [bills, setBills] = useState<StoreBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<StoreBill | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
  }, [page, searchTerm]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: '20',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/store/billing?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch store bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = async (billId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/store/billing/${billId}`);
      if (response.ok) {
        const bill = await response.json();
        setSelectedBill(bill);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching bill details:', error);
    }
  };

  const handleDownloadPDF = (bill: StoreBill) => {
    if (bill.invoice_pdf_url) {
      // In production, this would download from server
      window.open(bill.invoice_pdf_url, '_blank');
    } else {
      toast({
        title: "PDF Not Available",
        description: "Invoice PDF has not been generated yet",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Store Bills</h1>
          <p className="text-slate-600 mt-1">Manage all physical store invoices</p>
        </div>
        <Link to="/admin/store-billing">
          <Button>
            <Receipt className="h-4 w-4 mr-2" />
            Create New Bill
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by bill number, customer name, or phone..."
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading bills...</div>
      ) : bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No bills found. Create your first store bill!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bills.map((bill) => (
            <Card key={bill.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{bill.bill_number}</h3>
                      <Badge 
                        className={
                          bill.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {bill.status}
                      </Badge>
                      <Badge 
                        className={
                          bill.payment_status === 'paid' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-yellow-100 text-yellow-700'
                        }
                      >
                        {bill.payment_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                      <div>
                        <p className="font-medium text-slate-900">{bill.customer_name}</p>
                        <p className="text-xs">Customer</p>
                      </div>
                      {bill.customer_phone && (
                        <div>
                          <p>{bill.customer_phone}</p>
                          <p className="text-xs">Phone</p>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-primary text-lg">₹{bill.total_amount.toFixed(2)}</p>
                        <p className="text-xs">Total Amount</p>
                      </div>
                      <div>
                        <p>{new Date(bill.created_at).toLocaleDateString()}</p>
                        <p className="text-xs">Date</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {bill.invoice_sent_email && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          Email Sent
                        </Badge>
                      )}
                      {bill.invoice_sent_sms && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          SMS Sent
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewBill(bill.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {bill.invoice_pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(bill)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} bills
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bill Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details - {selectedBill?.bill_number}</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Customer</p>
                  <p className="font-medium">{selectedBill.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Amount</p>
                  <p className="text-2xl font-bold text-primary">₹{selectedBill.total_amount.toFixed(2)}</p>
                </div>
              </div>
              {selectedBill.items && selectedBill.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Items</p>
                  <div className="space-y-2">
                    {selectedBill.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between p-2 bg-slate-50 rounded">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-slate-500">
                            Qty: {item.quantity} × ₹{item.unit_price}
                          </p>
                        </div>
                        <p className="font-semibold">₹{item.line_total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreBills;

