// Modern Store Billing System with Step-by-Step Flow
// Beautiful Colors & Card-Based UI

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
  Calculator,
  Grid3x3,
  Package,
  Palette,
  Ruler,
  Check,
  ArrowLeft,
  ArrowRight
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
  category_id?: string;
  images?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[];
  is_active: boolean;
}

// Color palette for categories
const categoryColors = [
  { bg: 'bg-gradient-to-br from-rose-400 to-rose-600', border: 'border-rose-500', text: 'text-rose-700', lightBg: 'bg-rose-50' },
  { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50' },
  { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', border: 'border-emerald-500', text: 'text-emerald-700', lightBg: 'bg-emerald-50' },
  { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', border: 'border-purple-500', text: 'text-purple-700', lightBg: 'bg-purple-50' },
  { bg: 'bg-gradient-to-br from-amber-400 to-amber-600', border: 'border-amber-500', text: 'text-amber-700', lightBg: 'bg-amber-50' },
  { bg: 'bg-gradient-to-br from-teal-400 to-teal-600', border: 'border-teal-500', text: 'text-teal-700', lightBg: 'bg-teal-50' },
  { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600', border: 'border-indigo-500', text: 'text-indigo-700', lightBg: 'bg-indigo-50' },
  { bg: 'bg-gradient-to-br from-pink-400 to-pink-600', border: 'border-pink-500', text: 'text-pink-700', lightBg: 'bg-pink-50' },
];

const StoreBilling = () => {
  // UI State
  const [step, setStep] = useState<'category' | 'product' | 'billing'>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<BillItem[]>([]);
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
  const { toast} = useToast();

  // Selected options for current product
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'}/store/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.filter((cat: Category) => cat.is_active));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProductsByCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'}/store/products?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Handle category selection
  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    fetchProductsByCategory(category.id);
    setStep('product');
  };

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedColor(product.colors?.[0] || '');
    setSelectedSize(product.sizes?.[0] || '');
    setQuantity(1);
  };

  // Add product to bill
  const handleAddToBill = () => {
    if (!selectedProduct) return;

    const newItem: BillItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_sku: selectedProduct.sku,
      quantity: quantity,
      unit_price: selectedProduct.price,
      color: selectedColor,
      size: selectedSize,
      discount_amount: 0,
      discount_percentage: 0,
      line_total: selectedProduct.price * quantity,
    };

    setItems([...items, newItem]);
    setSelectedProduct(null);
    setSelectedColor('');
    setSelectedSize('');
    setQuantity(1);

    toast({
      title: "Added to Bill",
      description: `${selectedProduct.name} added successfully`,
    });
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = subtotal * (taxPercentage / 100);
  const totalAfterDiscount = subtotal - discountAmount;
  const totalAmount = totalAfterDiscount + taxAmount;

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.product_id !== productId));
  };

  // Update quantity
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setItems(items.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          line_total: item.unit_price * newQuantity - item.discount_amount
        };
      }
      return item;
    }));
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
        tax_percentage: taxPercentage,
        payment_method: paymentMethod,
        notes: notes || undefined,
        send_email: sendEmail,
        send_sms: sendSMS,
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'}/store/billing/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedBill(data.bill);
        setShowInvoice(true);
        toast({ title: "Success", description: "Bill created successfully!" });

        // Reset
        setItems([]);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setCustomerAddress('');
        setDiscountCode('');
        setDiscountAmount(0);
        setDiscountPercentage(0);
        setTaxPercentage(0);
        setStep('category');
        setSelectedCategory(null);
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
      toast({ title: "Error", description: "Failed to create bill", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
                Store Billing System
              </h1>
              <p className="text-slate-600 mt-2">Create beautiful invoices for your store</p>
            </div>
            <Badge className="bg-gradient-to-r from-rose-500 to-purple-500 text-white px-6 py-3 text-lg shadow-lg">
              <Receipt className="h-5 w-5 mr-2" />
              {items.length} Items
            </Badge>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-4 mt-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 'category' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              <Grid3x3 className="h-4 w-4" />
              <span className="font-medium">1. Select Category</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 'product' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              <Package className="h-4 w-4" />
              <span className="font-medium">2. Select Products</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 'billing' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              <Receipt className="h-4 w-4" />
              <span className="font-medium">3. Complete Billing</span>
            </div>
          </div>
        </div>

        {/* Step 1: Category Selection */}
        {step === 'category' && (
          <div className="space-y-6">
            <Card className="border-2 border-rose-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-rose-50 to-purple-50 border-b border-rose-100">
                <CardTitle className="flex items-center gap-2 text-rose-900">
                  <Grid3x3 className="h-6 w-6" />
                  Select Product Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map((category, index) => {
                    const colorScheme = categoryColors[index % categoryColors.length];
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleSelectCategory(category)}
                        className="group relative overflow-hidden rounded-xl border-2 border-slate-200 hover:border-rose-400 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className={`${colorScheme.bg} h-32 flex items-center justify-center text-white text-4xl font-bold p-4`}>
                          {category.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="p-4 bg-white">
                          <p className="font-semibold text-slate-900 text-center">{category.name}</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Product Selection */}
        {step === 'product' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products List */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-2 border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Package className="h-6 w-6" />
                      Products in {selectedCategory?.name}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep('category');
                        setSelectedCategory(null);
                        setProducts([]);
                      }}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Change Category
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={`text-left p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-lg ${
                          selectedProduct?.id === product.id
                            ? 'border-rose-400 bg-rose-50 shadow-md'
                            : 'border-slate-200 hover:border-blue-400 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <p className="text-sm text-slate-500 mt-1">SKU: {product.sku || 'N/A'}</p>
                          </div>
                          {selectedProduct?.id === product.id && (
                            <Check className="h-5 w-5 text-rose-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-2xl font-bold text-rose-600">₹{product.price}</span>
                          <Badge variant={product.total_stock > 0 ? "default" : "destructive"} className="text-xs">
                            Stock: {product.total_stock}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Product Details & Add */}
            <div className="space-y-4">
              {selectedProduct && (
                <>
                  <Card className="border-2 border-emerald-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <CardTitle className="text-emerald-900">Product Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Product Name</p>
                        <p className="font-semibold text-lg text-slate-900">{selectedProduct.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Price</p>
                        <p className="text-3xl font-bold text-emerald-600">₹{selectedProduct.price}</p>
                      </div>

                      {/* Color Selection */}
                      {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                        <div>
                          <Label className="flex items-center gap-2 mb-2">
                            <Palette className="h-4 w-4" />
                            Select Color
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.colors.map((color) => (
                              <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                  selectedColor === color
                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-md'
                                    : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400'
                                }`}
                              >
                                {color}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Size Selection */}
                      {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                        <div>
                          <Label className="flex items-center gap-2 mb-2">
                            <Ruler className="h-4 w-4" />
                            Select Size
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.sizes.map((size) => (
                              <button
                                key={size}
                                onClick={() => setSelectedSize(size)}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                  selectedSize === size
                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-md'
                                    : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quantity */}
                      <div>
                        <Label htmlFor="quantity" className="mb-2">Quantity</Label>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="h-10 w-10 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="text-center text-xl font-bold border-2 border-emerald-300"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity(quantity + 1)}
                            className="h-10 w-10 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-slate-600">Subtotal:</span>
                          <span className="text-2xl font-bold text-emerald-600">
                            ₹{(selectedProduct.price * quantity).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          onClick={handleAddToBill}
                          className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-lg shadow-lg"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add to Bill
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Continue to Billing Button */}
              {items.length > 0 && (
                <Button
                  onClick={() => setStep('billing')}
                  className="w-full h-14 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white font-bold text-lg shadow-lg"
                >
                  Continue to Billing
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Billing & Checkout */}
        {step === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Customer & Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Info */}
              <Card className="border-2 border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                  <CardTitle className="text-purple-900">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className="border-2 border-purple-200 focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Phone Number</Label>
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Phone number"
                        className="border-2 border-purple-200 focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email Address</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email address"
                        className="border-2 border-purple-200 focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerAddress">Address</Label>
                      <Input
                        id="customerAddress"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Customer address"
                        className="border-2 border-purple-200 focus:border-purple-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bill Items */}
              <Card className="border-2 border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                      <ShoppingCart className="h-6 w-6" />
                      Bill Items ({items.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('product')}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add More
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                      <p>No items in bill. Go back to add products.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.product_id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{item.product_name}</p>
                            <div className="flex gap-4 text-sm text-slate-600 mt-1">
                              {item.color && <span className="flex items-center gap-1"><Palette className="h-3 w-3" /> {item.color}</span>}
                              {item.size && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {item.size}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                              className="h-8 w-8 border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                              className="h-8 w-8 border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-blue-600">₹{item.line_total.toFixed(2)}</p>
                            <p className="text-xs text-slate-500">₹{item.unit_price} × {item.quantity}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Summary & Payment */}
            <div className="space-y-6">
              {/* Payment Summary */}
              <Card className="border-2 border-emerald-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <Calculator className="h-6 w-6" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="taxPercentage" className="text-slate-700">Tax (%)</Label>
                    <Input
                      id="taxPercentage"
                      type="number"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                      className="w-24 border-2 border-emerald-200"
                      min="0"
                      max="100"
                    />
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Tax Amount</span>
                      <span className="font-semibold">₹{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-emerald-200 pt-4">
                    <div className="flex justify-between text-2xl font-bold text-emerald-600">
                      <span>Total</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card className="border-2 border-amber-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                  <CardTitle className="text-amber-900">Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="paymentMethod">Payment Type</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="border-2 border-amber-200">
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
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special notes..."
                      className="border-2 border-amber-200"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Create Bill Button */}
              <Button
                onClick={handleCreateBill}
                disabled={isCreating || items.length === 0 || !customerName.trim()}
                className="w-full h-16 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 hover:from-rose-600 hover:via-purple-600 hover:to-indigo-600 text-white font-bold text-xl shadow-2xl disabled:opacity-50"
              >
                {isCreating ? 'Creating Bill...' : '✓ Complete & Generate Invoice'}
              </Button>
            </div>
          </div>
        )}

        {/* Invoice Dialog */}
        <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-emerald-600">✓ Invoice Generated Successfully!</DialogTitle>
            </DialogHeader>
            {createdBill && (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200">
                  <p className="text-sm text-slate-600 mb-1">Bill Number</p>
                  <p className="text-3xl font-bold text-emerald-600">{createdBill.bill_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600">Customer</p>
                    <p className="font-semibold text-lg">{createdBill.customer_name}</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-600">₹{createdBill.total_amount}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 border-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                    <Send className="h-5 w-5 mr-2" />
                    Send Invoice
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StoreBilling;
