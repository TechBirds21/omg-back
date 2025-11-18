// Professional POS Billing System for O Maguva
// Complete store and online order management with real-time stock updates
// Accessible at /store-billing or /billing

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Package,
  DollarSign,
  Percent,
  History,
  Printer,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  ShoppingBag,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Star,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Copy,
  Share2,
  Settings,
  Bell,
  AlertCircle,
  Image as ImageIcon,
  Layers,
  Grid3x3,
  List,
  QrCode,
  Scan,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Home,
  Store,
  Globe,
  Database,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getStoreProducts,
  getStoreCategories,
  getInventorySummary,
  getOrdersSummary,
  createStoreBill,
  getStoreBills,
  searchCustomers,
  getCustomerHistory,
  type StoreProduct,
  type StoreCategory,
  type InventorySummary,
  type OrdersSummary
} from '@/lib/api-store-billing';

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
  product_image?: string;
}

interface Customer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_spent?: number;
  order_count?: number;
}

const StoreBillingApp = () => {
  // ============ STATE MANAGEMENT ============
  const [activeView, setActiveView] = useState<'billing' | 'reports' | 'inventory' | 'customers'>('billing');
  const [billingStep, setBillingStep] = useState<'products' | 'checkout'>('products'); // Two-step flow
  
  // Customer Information
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerHistory, setCustomerHistory] = useState<any>(null);
  
  // Billing Items
  const [items, setItems] = useState<BillItem[]>([]);
  
  // Products & Categories
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Product Selection Modal
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [availableStock, setAvailableStock] = useState(0);
  
  // Discount & Pricing
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0); // Default 0% (can be changed)
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Store Customers
  const [storeCustomers, setStoreCustomers] = useState<any[]>([]);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  
  // Invoice Options
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSMS, setSendSMS] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Transaction Management
  const [isCreating, setIsCreating] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [createdBill, setCreatedBill] = useState<any>(null);
  const [heldTransactions, setHeldTransactions] = useState<any[]>([]);
  
  // Reports & Analytics
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [ordersSummary, setOrdersSummary] = useState<OrdersSummary | null>(null);
  const [billsHistory, setBillsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { toast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);

  // ============ EFFECTS ============
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchInventorySummary();
    fetchOrdersSummary();
    if (activeView === 'customers') {
      fetchStoreCustomers();
    }
    if (activeView === 'reports') {
      fetchBillsHistory();
    }
  }, [refreshKey, activeView]);
  
  // ============ CALCULATIONS ============
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = subtotal * (taxPercentage / 100);
  
  // Auto-calculate discount when input changes
  useEffect(() => {
    if (!discountInput || discountInput === '') {
      setDiscountAmount(0);
      setDiscountPercentage(0);
      return;
    }
    
    const value = parseFloat(discountInput) || 0;
    if (discountType === 'percent') {
      const calculatedAmount = (subtotal * value) / 100;
      setDiscountAmount(calculatedAmount);
      setDiscountPercentage(value);
    } else {
      const calculatedPercent = subtotal > 0 ? (value / subtotal) * 100 : 0;
      setDiscountAmount(Math.min(value, subtotal)); // Don't exceed subtotal
      setDiscountPercentage(calculatedPercent);
    }
  }, [discountInput, discountType, subtotal]);
  
  const totalAfterDiscount = subtotal - discountAmount;
  const finalAmount = totalAfterDiscount + taxAmount;

  useEffect(() => {
    if (selectedCategory || productSearchQuery) {
      fetchProducts();
    }
  }, [selectedCategory, productSearchQuery]);

  useEffect(() => {
    if (customerPhone && customerPhone.length >= 10) {
      handleCustomerSearch(customerPhone);
    }
  }, [customerPhone]);

  // ============ DATA FETCHING ============
  const fetchCategories = async () => {
    try {
      const data = await getStoreCategories();
      setCategories([{ id: 'all', name: 'All Categories' }, ...data]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getStoreProducts({
        categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
        search: productSearchQuery || undefined,
        includeStock: true,
      });
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventorySummary = async () => {
    try {
      const data = await getInventorySummary();
      setInventorySummary(data);
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
    }
  };

  const fetchOrdersSummary = async () => {
    try {
      const data = await getOrdersSummary();
      setOrdersSummary(data);
    } catch (error) {
      console.error('Error fetching orders summary:', error);
    }
  };

  const fetchBillsHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getStoreBills({ page: 1, size: 50 });
      setBillsHistory(data.bills || []);
    } catch (error) {
      console.error('Error fetching bills history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ============ CUSTOMER MANAGEMENT ============
  const handleCustomerSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      const results = await searchCustomers(query);
      setCustomerSearchResults(results);
      setShowCustomerSearch(true);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const selectCustomer = async (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer);
    setCustomerName(selectedCustomer.name);
    setCustomerPhone(selectedCustomer.phone || '');
    setCustomerEmail(selectedCustomer.email || '');
    setShowCustomerSearch(false);
    
    // Fetch customer history
    if (selectedCustomer.id) {
      try {
        const history = await getCustomerHistory(selectedCustomer.id);
        setCustomerHistory(history);
      } catch (error) {
        console.error('Error fetching customer history:', error);
      }
    }
    
    toast({
      title: "Customer Selected",
      description: `Loaded ${selectedCustomer.name}'s information`,
    });
  };

  const clearCustomer = () => {
    setCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerHistory(null);
  };

  // ============ PRODUCT SELECTION ============
  const handleProductClick = (product: StoreProduct) => {
    setSelectedProduct(product);
    setSelectedColor('');
    setSelectedSize('');
    setSelectedQuantity(1);
    
    // Set default color if available
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
      // Get stock for selected color
      if (product.color_stock && product.color_stock.length > 0) {
        const colorStock = product.color_stock.find(cs => cs.color === product.colors[0]);
        setAvailableStock(colorStock?.stock || product.total_stock || 0);
      } else {
        setAvailableStock(product.total_stock || 0);
      }
    } else {
      setAvailableStock(product.total_stock || 0);
    }
    
    // Set default size if available
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }
    
    setShowProductModal(true);
  };

  const handleColorChange = (color: string, product: StoreProduct) => {
    setSelectedColor(color);
    if (product.color_stock && product.color_stock.length > 0) {
      const colorStock = product.color_stock.find(cs => cs.color === color);
      setAvailableStock(colorStock?.stock || 0);
    } else {
      setAvailableStock(product.total_stock || 0);
    }
    
    // Update image if color_images available
    if (product.color_images && product.colors) {
      const colorIndex = product.colors.indexOf(color);
      if (colorIndex >= 0 && colorIndex < product.color_images.length && product.color_images[colorIndex].length > 0) {
        // Color-specific images available - will be shown in modal
      }
    }
  };
  
  const getColorImage = (product: StoreProduct, color: string): string | undefined => {
    if (!product.color_images || !product.colors) return product.images?.[0];
    const colorIndex = product.colors.indexOf(color);
    if (colorIndex >= 0 && colorIndex < product.color_images.length && product.color_images[colorIndex].length > 0) {
      return product.color_images[colorIndex][0];
    }
    return product.images?.[0];
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    // Validate color selection if product has colors
    if (selectedProduct.colors && selectedProduct.colors.length > 0 && !selectedColor) {
      toast({
        title: "Color Required",
        description: "Please select a color for this product",
        variant: "destructive",
      });
      return;
    }
    
    // Validate stock
    if (selectedQuantity > availableStock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${availableStock} units available for ${selectedColor || 'this color'}`,
        variant: "destructive",
      });
      return;
    }
    
    // Support multiple colors/quantities: Check if same product+color already exists
    // If exists, increase quantity instead of adding duplicate
    const existingItemIndex = items.findIndex(
      item => item.product_id === selectedProduct.id && 
      item.color === (selectedColor || undefined) &&
      item.size === (selectedSize || undefined)
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const newItems = [...items];
      const existingItem = newItems[existingItemIndex];
      const newQuantity = existingItem.quantity + selectedQuantity;
      
      // Recalculate line_total
      const baseTotal = existingItem.unit_price * newQuantity;
      const finalTotal = baseTotal - existingItem.discount_amount;
      
      newItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        line_total: Math.max(0, finalTotal),
      };
      
      setItems(newItems);
      toast({
        title: "Quantity Updated",
        description: `${selectedProduct.name} quantity updated to ${newQuantity}`,
      });
    } else {
      // Add new item with selected color/quantity
      const baseTotal = selectedProduct.price * selectedQuantity;
      const newItem: BillItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_sku: selectedProduct.sku,
        quantity: selectedQuantity,
        unit_price: selectedProduct.price,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        discount_amount: 0,
        discount_percentage: 0,
        line_total: baseTotal, // unit_price * quantity (no discount initially)
        product_image: getColorImage(selectedProduct, selectedColor) || selectedProduct.images?.[0],
      };
      
      setItems([...items, newItem]);
      toast({
        title: "Product Added",
        description: `${selectedProduct.name}${selectedColor ? ` (${selectedColor})` : ''} added to cart`,
      });
    }
    
    // Reset modal state but keep product selected for adding more colors
    setSelectedColor('');
    setSelectedSize('');
    setSelectedQuantity(1);
    // Don't close modal - allow adding more colors/quantities
    // setShowProductModal(false);
    // setSelectedProduct(null);
    setProductSearchQuery('');
    setBarcodeInput('');
    
    // Refresh products to update stock
    setTimeout(() => {
      fetchProducts();
      fetchInventorySummary();
    }, 500);
  };

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    try {
      const results = await getStoreProducts({ barcode: barcode.trim() });
      if (results.length > 0) {
        handleProductClick(results[0]);
        setBarcodeInput('');
      } else {
        toast({
          title: "Product Not Found",
          description: `No product found with barcode: ${barcode}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching barcode:', error);
    }
  };

  // ============ BILL ITEMS MANAGEMENT ============
  const updateItemQuantity = (index: number, change: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const newQuantity = Math.max(1, item.quantity + change);
    
    // Recalculate line_total correctly: (unit_price * quantity) - discount_amount
    const baseTotal = item.unit_price * newQuantity;
    const finalTotal = baseTotal - item.discount_amount;
    
    newItems[index] = {
      ...item,
      quantity: newQuantity,
      line_total: Math.max(0, finalTotal), // Ensure non-negative
    };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    toast({
      title: "Item Removed",
      description: "Product removed from cart",
    });
  };

  const applyItemDiscount = (index: number, discount: number) => {
    const newItems = [...items];
    newItems[index].discount_amount = discount;
    newItems[index].discount_percentage = (discount / (newItems[index].unit_price * newItems[index].quantity)) * 100;
    newItems[index].line_total = (newItems[index].unit_price * newItems[index].quantity) - discount;
    setItems(newItems);
  };

  // ============ STORE CUSTOMERS ============
  const fetchStoreCustomers = async () => {
    try {
      // Get all store bills and extract unique customers
      const bills = await getStoreBills({ page: 1, size: 1000 });
      const customerMap = new Map();
      
      bills.bills.forEach((bill: any) => {
        const phone = bill.customer_phone;
        if (phone) {
          if (!customerMap.has(phone)) {
            customerMap.set(phone, {
              name: bill.customer_name,
              phone: bill.customer_phone,
              email: bill.customer_email,
              address: bill.customer_address,
              total_spent: 0,
              order_count: 0,
              orders: [],
            });
          }
          const customer = customerMap.get(phone);
          customer.total_spent += parseFloat(bill.final_amount || 0);
          customer.order_count += 1;
          customer.orders.push(bill);
        }
      });
      
      const customers = Array.from(customerMap.values()).sort((a, b) => b.total_spent - a.total_spent);
      setStoreCustomers(customers);
    } catch (error) {
      console.error('Error fetching store customers:', error);
    }
  };
  
  const viewCustomerOrders = (customer: any) => {
    setSelectedCustomerForView(customer);
    setCustomerOrders(customer.orders || []);
  };


  // ============ CREATE BILL ============
  const handleCreateBill = async () => {
    if (items.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add products to create a bill",
        variant: "destructive",
      });
      return;
    }
    
    if (!customerName.trim()) {
      toast({
        title: "Customer Required",
        description: "Please enter customer name",
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
        customer_id: customer?.id,
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
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        tax_percentage: taxPercentage,
        payment_method: paymentMethod,
        notes: notes || undefined,
        send_email: sendEmail,
        send_sms: sendSMS,
      };
      
      const result = await createStoreBill(billData);
      
             setCreatedBill(result.bill);
             setShowInvoice(true);
             
             // Clear form and go back to products page
             setItems([]);
             clearCustomer();
             setDiscountInput('');
             setDiscountAmount(0);
             setDiscountPercentage(0);
             setNotes('');
             setSendEmail(false);
             setSendSMS(false);
             setBillingStep('products'); // Go back to products page
             
             // Refresh data
             setRefreshKey(prev => prev + 1);
             fetchBillsHistory();
             
             toast({
               title: "Bill Created",
               description: `Bill ${result.bill.bill_number} created successfully`,
             });
    } catch (error: any) {
      console.error('Error creating bill:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create bill",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Store className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">O Maguva POS</h1>
                  <p className="text-sm text-gray-500">Store & Online Order Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">{format(currentDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-lg font-semibold text-gray-900">{format(currentDate, 'hh:mm:ss a')}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-[1920px] mx-auto px-4 pt-4">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="billing" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Billing</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Reports & Sales</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Customers</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-0">
            {billingStep === 'products' ? (
              /* STEP 1: Product Selection Page */
              <div className="flex h-[calc(100vh-200px)] gap-4">
                {/* Left Sidebar - Navigation */}
                <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col shadow-sm rounded-lg">
                  <div className="space-y-2">
                    <Button variant="default" className="w-full justify-start" onClick={() => setActiveView('billing')}>
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView('reports')}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Reports
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView('customers')}>
                      <Users className="h-4 w-4 mr-2" />
                      Customers
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                    {items.length > 0 && (
                      <Button 
                        variant="default" 
                        className="w-full justify-start bg-primary-gold hover:bg-yellow-600 text-white font-bold"
                        onClick={() => setBillingStep('checkout')}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Checkout ({items.length})
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full justify-start" onClick={() => {
                      setItems([]);
                      clearCustomer();
                      toast({ title: "Cart Cleared", description: "All items removed from cart" });
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Cart
                    </Button>
                  </div>
                </aside>

                {/* Main Content - Product Catalog Only */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                  {/* Search Bar - Prominent */}
                  <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      ref={productSearchRef}
                      placeholder="Search products by name, SKU, or code..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="pl-12 h-12 text-base border-2 border-gray-300 focus:border-primary-gold rounded-lg"
                    />
                  </div>
                </div>

                {/* Category Tabs - Amazon Style */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white overflow-x-auto">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                      className={`whitespace-nowrap ${selectedCategory === 'all' ? 'bg-primary-gold hover:bg-yellow-600 text-white' : ''}`}
                    >
                      All Categories
                    </Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`whitespace-nowrap ${selectedCategory === cat.id ? 'bg-primary-gold hover:bg-yellow-600 text-white' : ''}`}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Products Grid - Amazon Style */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <RefreshCw className="h-10 w-10 animate-spin text-primary-gold" />
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-20">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-500">No products found</p>
                      <p className="text-sm text-gray-400 mt-2">Try adjusting your search or category filter</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-xl hover:border-primary-gold/50 transition-all duration-300 group relative overflow-hidden"
                        >
                          {/* Product Image */}
                          <div className="relative aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onClick={() => handleProductClick(product)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" onClick={() => handleProductClick(product)}>
                                <ImageIcon className="h-16 w-16 text-gray-400" />
                              </div>
                            )}
                            {/* Stock Badge */}
                            {product.total_stock > 0 && (
                              <div className="absolute top-2 right-2">
                                <Badge
                                  variant={
                                    product.stock_status === 'out_of_stock' ? 'destructive' :
                                    product.stock_status === 'low_stock' ? 'default' : 'secondary'
                                  }
                                  className="text-xs font-bold shadow-md"
                                >
                                  {product.total_stock} left
                                </Badge>
                              </div>
                            )}
                            {/* View Details Overlay on Hover - No Quick Add */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <Button
                                size="sm"
                                className="bg-primary-gold hover:bg-yellow-600 text-white font-bold shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(product);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Select Options
                              </Button>
                            </div>
                          </div>
                          
                          {/* Product Info */}
                          <h3 
                            className="font-semibold text-sm text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem] hover:text-primary-gold transition-colors cursor-pointer" 
                            onClick={() => handleProductClick(product)}
                          >
                            {product.name}
                          </h3>
                          
                          {/* Price and Add Button */}
                          <div className="flex items-center justify-between mt-3">
                            <div>
                              <span className="text-xl font-bold text-primary-gold">₹{product.price.toLocaleString()}</span>
                              {product.original_price && product.original_price > product.price && (
                                <p className="text-xs text-gray-500 line-through">₹{product.original_price.toLocaleString()}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="h-9 w-9 p-0 bg-primary-gold hover:bg-yellow-600 rounded-full shadow-md hover:shadow-lg transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(product);
                              }}
                            >
                              <Plus className="h-5 w-5 text-white" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Checkout Button */}
              {items.length > 0 && (
                <div className="fixed bottom-6 right-6 z-50">
                  <Button
                    onClick={() => setBillingStep('checkout')}
                    className="h-16 px-8 bg-gradient-to-r from-primary-gold to-yellow-500 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-2xl rounded-full font-bold text-lg animate-pulse-glow"
                    size="lg"
                  >
                    <ShoppingCart className="h-6 w-6 mr-3" />
                    Checkout ({items.length} items) - ₹{finalAmount.toLocaleString()}
                    <ChevronRight className="h-5 w-5 ml-3" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Checkout & Confirmation Page */
            <div className="max-w-7xl mx-auto py-6">
                {/* Progress Indicator */}
                <div className="mb-6">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary-gold text-white flex items-center justify-center font-bold">1</div>
                      <span className="ml-2 text-sm font-medium text-gray-600">Products</span>
                    </div>
                    <div className="w-16 h-1 bg-primary-gold"></div>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary-gold text-white flex items-center justify-center font-bold">2</div>
                      <span className="ml-2 text-sm font-medium text-gray-900 font-bold">Checkout</span>
                    </div>
                  </div>
                </div>

                {/* Back Button */}
                <Button
                  variant="ghost"
                  onClick={() => setBillingStep('products')}
                  className="mb-6"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Products
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Cart Items & Customer Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Cart Items */}
                    <Card className="shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-primary-gold/10 to-yellow-50">
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-xl">Order Summary</span>
                          <Badge variant="outline" className="text-base px-3 py-1">{items.length} {items.length === 1 ? 'item' : 'items'}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        {items.map((item, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-primary-gold/50 transition-all">
                            {item.product_image && (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900 mb-2">{item.product_name}</h4>
                              {item.product_sku && (
                                <p className="text-xs text-gray-500 font-mono mb-2">SKU: {item.product_sku}</p>
                              )}
                              <div className="flex items-center gap-2 mb-3">
                                {item.color && (
                                  <Badge variant="outline" className="text-sm">{item.color}</Badge>
                                )}
                                {item.size && (
                                  <Badge variant="outline" className="text-sm">{item.size}</Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 bg-white rounded-lg p-2 border border-gray-200">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItemQuantity(index, -1)}
                                    className="h-9 w-9 p-0"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="text-base font-bold w-12 text-center">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItemQuantity(index, 1)}
                                    className="h-9 w-9 p-0"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-primary-gold">₹{item.line_total.toLocaleString()}</p>
                                  <p className="text-sm text-gray-500">₹{item.unit_price.toLocaleString()} × {item.quantity}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Customer Details */}
                    <Card className="shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-primary-gold/10 to-yellow-50">
                        <CardTitle className="text-xl">Customer Information</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            placeholder="Phone (auto-search)"
                            value={customerPhone}
                            onChange={(e) => {
                              setCustomerPhone(e.target.value);
                              if (e.target.value.length >= 10) {
                                handleCustomerSearch(e.target.value);
                              }
                            }}
                            className="pl-12 h-12 text-base"
                          />
                        </div>
                        {showCustomerSearch && customerSearchResults.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {customerSearchResults.map((cust) => (
                              <div
                                key={cust.id || cust.phone}
                                onClick={() => selectCustomer(cust)}
                                className="p-3 hover:bg-primary-gold/10 cursor-pointer border-b border-gray-100 last:border-0"
                              >
                                <p className="font-semibold text-sm">{cust.name}</p>
                                <p className="text-xs text-gray-500">{cust.phone}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <Input
                          placeholder="Customer Name *"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="h-12 text-base"
                          required
                        />
                        <Input
                          placeholder="Email (optional)"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="h-12 text-base"
                        />
                        <Input
                          placeholder="Address (optional)"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="h-12 text-base"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: Payment & Summary */}
                  <div className="lg:col-span-1">
                    <Card className="sticky top-6 shadow-xl border-2 border-primary-gold/20">
                      <CardHeader className="bg-gradient-to-r from-primary-gold to-yellow-500 text-white rounded-t-lg">
                        <CardTitle className="text-white text-xl">Payment Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {/* Discount Section */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold text-gray-700">Discount</Label>
                          <div className="flex items-center gap-2">
                            <Select value={discountType} onValueChange={(v: any) => {
                              setDiscountType(v);
                              setDiscountInput('');
                            }}>
                              <SelectTrigger className="w-24 h-12">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">%</SelectItem>
                                <SelectItem value="amount">₹</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder={discountType === 'percent' ? 'Enter %' : 'Enter Amount'}
                              type="number"
                              value={discountInput}
                              onChange={(e) => setDiscountInput(e.target.value)}
                              className="flex-1 h-12 text-base"
                              min="0"
                              max={discountType === 'percent' ? '100' : subtotal.toString()}
                            />
                          </div>
                          {discountAmount > 0 && (
                            <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border-2 border-green-200">
                              <span className="text-sm font-medium text-green-700">Discount Applied</span>
                              <span className="text-base font-bold text-green-700">-₹{discountAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Tax Section */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold text-gray-700">Tax %</Label>
                          <Input
                            type="number"
                            value={taxPercentage}
                            onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                            className="h-12 text-base"
                            min="0"
                            max="100"
                            placeholder="Enter tax %"
                          />
                        </div>

                        {/* Summary */}
                        <div className="space-y-3 pt-4 border-t-2 border-gray-300">
                          <div className="flex justify-between text-base">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-semibold text-lg">₹{subtotal.toLocaleString()}</span>
                          </div>
                          {discountAmount > 0 && (
                            <div className="flex justify-between text-base text-green-600">
                              <span>Discount ({discountPercentage.toFixed(1)}%)</span>
                              <span className="font-semibold">-₹{discountAmount.toLocaleString()}</span>
                            </div>
                          )}
                          {taxAmount > 0 && (
                            <div className="flex justify-between text-base">
                              <span className="text-gray-600">Tax ({taxPercentage}%)</span>
                              <span className="font-semibold">₹{taxAmount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="border-t-2 border-gray-400 pt-4 mt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xl font-bold text-gray-900">Total</span>
                              <span className="text-4xl font-extrabold text-primary-gold">₹{finalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold text-gray-700">Payment Method</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">💵 Cash</SelectItem>
                              <SelectItem value="card">💳 Card</SelectItem>
                              <SelectItem value="upi">📱 UPI</SelectItem>
                              <SelectItem value="other">💳 Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Email/SMS Options */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold text-gray-700">Send Receipt</Label>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="sendEmail"
                                checked={sendEmail}
                                onChange={(e) => setSendEmail(e.target.checked)}
                                className="rounded w-5 h-5"
                              />
                              <Label htmlFor="sendEmail" className="text-base cursor-pointer">📧 Email</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="sendSMS"
                                checked={sendSMS}
                                onChange={(e) => setSendSMS(e.target.checked)}
                                className="rounded w-5 h-5"
                              />
                              <Label htmlFor="sendSMS" className="text-base cursor-pointer">📱 SMS</Label>
                            </div>
                          </div>
                        </div>

                        {/* Pay Button */}
                        <Button
                          onClick={handleCreateBill}
                          disabled={isCreating || items.length === 0 || !customerName.trim()}
                          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                        >
                          {isCreating ? (
                            <>
                              <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Receipt className="h-6 w-6 mr-2" />
                              PAY ₹{finalAmount.toLocaleString()}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-0">
            <div className="space-y-6">
              {/* Sales Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Sales (Store)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      ₹{ordersSummary?.store_revenue?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{ordersSummary?.store_orders_count || 0} orders</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Sales (Online)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{ordersSummary?.online_revenue?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{ordersSummary?.online_orders_count || 0} orders</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{ordersSummary?.total_revenue?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{ordersSummary?.total_orders || 0} total orders</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Stock Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{inventorySummary?.total_stock_value?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{inventorySummary?.total_stock || 0} units</p>
                  </CardContent>
                </Card>
              </div>

              {/* Inventory Breakdown */}
              {inventorySummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Breakdown by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {inventorySummary.category_breakdown.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{cat.category_name}</p>
                            <p className="text-sm text-gray-500">
                              {cat.product_count} products • {cat.total_stock} units
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">₹{cat.stock_value.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Bills */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : billsHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No bills found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {billsHistory.slice(0, 20).map((bill: any) => (
                        <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div>
                            <p className="font-semibold">{bill.bill_number}</p>
                            <p className="text-sm text-gray-500">{bill.customer_name}</p>
                            <p className="text-xs text-gray-400">{format(new Date(bill.created_at), 'MMM d, yyyy h:mm a')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">₹{bill.final_amount?.toLocaleString() || '0'}</p>
                            <Badge variant="outline" className="mt-1">{bill.payment_method}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="mt-0">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Store Customers</span>
                    <Badge>{storeCustomers.length} customers</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {storeCustomers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No customers found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {storeCustomers.map((customer, idx) => (
                        <div
                          key={idx}
                          onClick={() => viewCustomerOrders(customer)}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{customer.name}</p>
                              <p className="text-sm text-gray-500">{customer.phone}</p>
                              {customer.email && (
                                <p className="text-xs text-gray-400">{customer.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">₹{customer.total_spent.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">{customer.order_count} orders</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Orders Detail */}
              {selectedCustomerForView && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Orders for {selectedCustomerForView.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerForView(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customerOrders.map((order: any) => (
                        <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold">{order.bill_number}</p>
                              <p className="text-sm text-gray-500">{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">₹{order.final_amount?.toLocaleString() || '0'}</p>
                              <Badge variant="outline">{order.payment_method}</Badge>
                            </div>
                          </div>
                          {order.items && order.items.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {order.items.map((item: any, itemIdx: number) => (
                                <div key={itemIdx} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                                    {item.size && <p className="text-xs text-gray-500">Size: {item.size}</p>}
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">Qty: {item.quantity}</p>
                                    <p className="text-xs text-gray-500">₹{item.line_total?.toLocaleString() || '0'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Selection Modal with Color/Size Selection */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedProduct?.name}</DialogTitle>
            <DialogDescription>{selectedProduct?.description || selectedProduct?.category_name}</DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Image - Show color-specific image if available */}
              {(() => {
                const displayImage = selectedColor 
                  ? getColorImage(selectedProduct, selectedColor)
                  : selectedProduct.images?.[0];
                
                return displayImage ? (
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={displayImage}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                );
              })()}
              
              {/* Price & Stock */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">₹{selectedProduct.price.toLocaleString()}</p>
                  {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                    <p className="text-sm text-gray-500 line-through">₹{selectedProduct.original_price.toLocaleString()}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      availableStock === 0 ? 'destructive' :
                      availableStock <= 5 ? 'default' : 'secondary'
                    }
                    className="text-lg px-3 py-1"
                  >
                    {availableStock} Available
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">SKU: {selectedProduct.sku || 'N/A'}</p>
                </div>
              </div>
              
              {/* Color Selection with Images */}
              {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Select Color</Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedProduct.colors.map((color) => {
                      const colorStock = selectedProduct.color_stock?.find(cs => cs.color === color);
                      const stockForColor = colorStock?.stock || 0;
                      const isSelected = selectedColor === color;
                      const isOutOfStock = stockForColor === 0;
                      const colorImage = getColorImage(selectedProduct, color);
                      
                      return (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color, selectedProduct)}
                          disabled={isOutOfStock}
                          className={`
                            relative rounded-lg border-2 transition-all overflow-hidden
                            ${isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'border-gray-200 hover:border-gray-300'}
                            ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          {/* Color Image */}
                          {colorImage ? (
                            <div className="aspect-square w-full overflow-hidden">
                              <img
                                src={colorImage}
                                alt={color}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className="aspect-square w-full"
                              style={{ backgroundColor: color.toLowerCase() }}
                            />
                          )}
                          
                          {/* Color Info */}
                          <div className="p-2 bg-white">
                            <p className="text-xs font-semibold text-center">{color}</p>
                            <p className="text-xs text-center text-gray-500 mt-1">Stock: {stockForColor}</p>
                          </div>
                          
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Size Selection */}
              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Select Size</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`
                          px-4 py-2 rounded-lg border-2 transition-all
                          ${selectedSize === size 
                            ? 'border-primary bg-primary text-white' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Quantity Selection */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Quantity</Label>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                    disabled={selectedQuantity <= 1}
                    className="h-12 w-12"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    value={selectedQuantity}
                    onChange={(e) => {
                      const qty = Math.max(1, Math.min(availableStock, parseInt(e.target.value) || 1));
                      setSelectedQuantity(qty);
                    }}
                    min="1"
                    max={availableStock}
                    className="text-center text-2xl font-bold h-12"
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setSelectedQuantity(Math.min(availableStock, selectedQuantity + 1))}
                    disabled={selectedQuantity >= availableStock}
                    className="h-12 w-12"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 text-right">
                    <p className="text-sm text-gray-500">Max: {availableStock}</p>
                    <p className="text-lg font-semibold">
                      Total: ₹{(selectedProduct.price * selectedQuantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Add to Cart Button */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddProduct}
                  disabled={availableStock === 0 || selectedQuantity > availableStock}
                  className="w-full h-12 text-lg font-semibold bg-primary-gold hover:bg-yellow-600 text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add to Cart ({selectedQuantity} × ₹{selectedProduct.price.toLocaleString()} = ₹{(selectedProduct.price * selectedQuantity).toLocaleString()})
                </Button>
                
                {/* Add More Colors/Quantities Button */}
                <Button
                  variant="outline"
                  className="w-full h-12 text-base border-2 border-primary-gold text-primary-gold hover:bg-primary-gold hover:text-white"
                  onClick={() => {
                    handleAddProduct();
                    // Keep modal open for adding more
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add & Continue Adding
                </Button>
                
                {/* Close Modal Button */}
                <Button
                  variant="ghost"
                  className="w-full h-12 text-base"
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProduct(null);
                    setSelectedColor('');
                    setSelectedSize('');
                    setSelectedQuantity(1);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice/Receipt Modal */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary-gold">✅ Bill Created Successfully!</DialogTitle>
            <DialogDescription className="text-lg">Bill Number: <span className="font-bold">{createdBill?.bill_number}</span></DialogDescription>
          </DialogHeader>
          
          {createdBill && (
            <div className="space-y-6">
              {/* Bill Summary Card */}
              <div className="bg-gradient-to-br from-primary-gold/10 to-yellow-50 rounded-xl p-6 border-2 border-primary-gold/30">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer Name</p>
                    <p className="text-lg font-bold text-gray-900">{createdBill.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                    <p className="text-lg font-bold text-gray-900">{createdBill.payment_method?.toUpperCase() || 'CASH'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="text-4xl font-extrabold text-primary-gold">₹{createdBill.final_amount?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              <div className="space-y-2">
                {createdBill.invoice_sent_email && (
                  <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-700">Invoice sent via Email</span>
                  </div>
                )}
                {createdBill.invoice_sent_sms && (
                  <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-blue-700">Invoice sent via SMS</span>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {createdBill.invoice_pdf_url && (
                  <Button
                    variant="default"
                    className="bg-primary-gold hover:bg-yellow-600 text-white"
                    onClick={async () => {
                      try {
                        // Download invoice PDF
                        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
                        const response = await fetch(`${API_BASE}/store/billing/${createdBill.id}/invoice/download`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Invoice_${createdBill.bill_number}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          toast({
                            title: "Invoice Downloaded",
                            description: "Invoice PDF downloaded successfully",
                          });
                        } else {
                          // Fallback: try to open the PDF URL directly
                          window.open(createdBill.invoice_pdf_url, '_blank');
                        }
                      } catch (error) {
                        console.error('Error downloading invoice:', error);
                        toast({
                          title: "Download Error",
                          description: "Could not download invoice. Trying to open in new tab...",
                          variant: "destructive",
                        });
                        if (createdBill.invoice_pdf_url) {
                          window.open(createdBill.invoice_pdf_url, '_blank');
                        }
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowInvoice(false);
                    setCreatedBill(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreBillingApp;
