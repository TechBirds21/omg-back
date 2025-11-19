// Store Billing System for Physical Store
// Accessible at store.omaguva.com

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Search, 
  Receipt,
  Send,
  Download,
  Tag,
  Calculator
} from 'lucide-react';

interface BillItem {
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  color?: string;
  size?: string;
  discount_amount: number;
  discount_percentage: number;
  line_total: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  original_price?: number;
  colors?: string[];
  sizes?: string[];
  total_stock: number;
}

const StoreBilling = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<BillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSMS, setSendSMS] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [createdBill, setCreatedBill] = useState<any>(null);
  const { toast } = useToast();

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = subtotal * (taxPercentage / 100);
  const totalAfterDiscount = subtotal - discountAmount;
  const totalAmount = totalAfterDiscount + taxAmount;

  // Search products
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/store/billing/products/search?search=${encodeURIComponent(searchQuery)}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearch(true);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast({
        title: "Error",
        description: "Failed to search products",
        variant: "destructive",
      });
    }
  };

  // Add product to bill
  const handleAddProduct = (product: Product) => {
    const existingItem = items.find(item => item.product_id === product.id);
    
    if (existingItem) {
      // Increase quantity
      setItems(items.map(item =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              line_total: (item.unit_price * (item.quantity + 1)) - item.discount_amount
            }
          : item
      ));
    } else {
      // Add new item
      const newItem: BillItem = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_price: product.price,
        discount_amount: 0,
        discount_percentage: 0,
        line_total: product.price,
      };
      setItems([...items, newItem]);
    }
    
    setSearchQuery('');
    setShowSearch(false);
    setSearchResults([]);
  };

  // Update item quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.product_id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQuantity,
          line_total: (item.unit_price * newQuantity) - item.discount_amount
        };
      }
      return item;
    }));
  };

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.product_id !== productId));
  };

  // Apply item-level discount
  const handleItemDiscount = (productId: string, discount: number, isPercentage: boolean) => {
    setItems(items.map(item => {
      if (item.product_id === productId) {
        const discountAmount = isPercentage
          ? (item.unit_price * item.quantity * discount / 100)
          : discount;
        return {
          ...item,
          discount_amount: discountAmount,
          discount_percentage: isPercentage ? discount : 0,
          line_total: (item.unit_price * item.quantity) - discountAmount
        };
      }
      return item;
    }));
  };

  // Validate discount code
  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountAmount(0);
      setDiscountPercentage(0);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/store/billing/discounts/validate?code=${encodeURIComponent(discountCode)}&amount=${subtotal}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setDiscountAmount(data.discount_amount);
          setDiscountPercentage(data.discount.discount_value || 0);
          toast({
            title: "Discount Applied",
            description: data.message,
          });
        } else {
          setDiscountAmount(0);
          setDiscountPercentage(0);
          toast({
            title: "Invalid Discount",
            description: data.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error validating discount:', error);
      toast({
        title: "Error",
        description: "Failed to validate discount code",
        variant: "destructive",
      });
    }
  };

  // Create bill
  const handleCreateBill = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const billData = {
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        customer_address: customerAddress || undefined,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          color: item.color,
          size: item.size,
          discount_amount: item.discount_amount,
          discount_percentage: item.discount_percentage,
        })),
        discount_code: discountCode || undefined,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        discount_type: discountCode ? 'store_special' : undefined,
        tax_percentage: taxPercentage,
        payment_method: paymentMethod,
        notes: notes || undefined,
        send_email: sendEmail,
        send_sms: sendSMS,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/store/billing/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedBill(data.bill);
        setShowInvoice(true);
        toast({
          title: "Success",
          description: "Bill created successfully!",
        });
        
        // Reset form
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setCustomerAddress('');
        setItems([]);
        setDiscountCode('');
        setDiscountAmount(0);
        setDiscountPercentage(0);
        setTaxPercentage(0);
        setPaymentMethod('cash');
        setNotes('');
        setSendEmail(false);
        setSendSMS(false);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to create bill",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast({
        title: "Error",
        description: "Failed to create bill",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Store Billing</h1>
          <p className="text-slate-600 mt-1">Create invoices for physical store sales</p>
        </div>
        <Badge className="bg-primary text-white px-4 py-2">
          <Receipt className="h-4 w-4 mr-2" />
          New Bill
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customerAddress">Address</Label>
                <Input
                  id="customerAddress"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Customer address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Search & Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        handleSearch();
                      } else {
                        setShowSearch(false);
                      }
                    }}
                    onFocus={() => searchQuery && handleSearch()}
                    placeholder="Search products by name or SKU..."
                    className="pl-10"
                  />
                  {showSearch && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleAddProduct(product)}
                          className="p-3 hover:bg-primary/10 cursor-pointer border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{product.name}</p>
                              <p className="text-sm text-slate-500">SKU: {product.sku || 'N/A'} | Stock: {product.total_stock}</p>
                            </div>
                            <p className="font-semibold text-primary">₹{product.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Items */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No items added. Search and add products to create a bill.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.product_id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.product_name}</p>
                        <p className="text-sm text-slate-500">SKU: {item.product_sku || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.product_id, -1)}
                          className="h-8 w-8"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.product_id, 1)}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">₹{item.line_total.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">₹{item.unit_price} × {item.quantity}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Pricing & Actions */}
        <div className="space-y-6">
          {/* Discount Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Discount
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discountCode">Discount Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="discountCode"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter discount code"
                  />
                  <Button onClick={handleValidateDiscount} variant="outline">
                    Apply
                  </Button>
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-slate-600">Discount Applied</p>
                  <p className="text-lg font-semibold text-primary">-₹{discountAmount.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Pricing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="taxPercentage" className="text-slate-600">Tax (%)</Label>
                <Input
                  id="taxPercentage"
                  type="number"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-20"
                  min="0"
                  max="100"
                />
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Options */}
          <Card>
            <CardHeader>
              <CardTitle>Payment & Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="sendEmail" className="cursor-pointer">Send Invoice via Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendSMS"
                    checked={sendSMS}
                    onChange={(e) => setSendSMS(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="sendSMS" className="cursor-pointer">Send Invoice via SMS</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Bill Button */}
          <Button
            onClick={handleCreateBill}
            disabled={isCreating || items.length === 0 || !customerName.trim()}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isCreating ? 'Creating...' : 'Create Bill & Generate Invoice'}
          </Button>
        </div>
      </div>

      {/* Invoice Preview Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Generated Successfully</DialogTitle>
          </DialogHeader>
          {createdBill && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-slate-600">Bill Number</p>
                <p className="text-2xl font-bold text-primary">{createdBill.bill_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Customer</p>
                  <p className="font-medium">{createdBill.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Amount</p>
                  <p className="text-xl font-bold text-primary">₹{createdBill.total_amount}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Send Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreBilling;

