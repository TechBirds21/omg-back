// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search,
  Package,
  Truck,
  CircleCheck as CheckCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  CircleAlert as AlertCircle,
  CalendarDays,
  User as UserIcon,
  CreditCard,
  Receipt,
  IndianRupee,
  ChevronRight,
  Box,
  Copy
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { ColorCircle } from '@/lib/colorUtils';
import { getOrdersByEmail } from '@/lib/api-storefront';
import { downloadInvoice } from '@/lib/invoice';
import { generateInvoiceFromOrder, imageUrlToDataUrl } from '@/lib/invoiceUtils';
import { getSafeImageUrl } from '@/lib/utils';
import { validateEmail, getValidationClass } from '@/lib/validations';
import { useNavigate } from 'react-router-dom';

const FALLBACK_PRODUCT_IMAGE = 'https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg';

const parseOrderItems = (order: any) => {
  if (!order) return [];

  const items: any[] = [];
  try {
    const raw = order.applied_offer;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed?.items?.length) {
      parsed.items.forEach((item: any, index: number) => {
        if (!item) return;
        const quantity = Number(item.quantity || 1) || 1;
        const price = Number(item.price ?? 0);
        const total = price > 0 ? price * quantity : undefined;
        const colors = Array.isArray(item.colors) ? item.colors : item.color ? [item.color] : [];
        const sizes = Array.isArray(item.sizes) ? item.sizes : item.size ? [item.size] : [];

        items.push({
          key: item.id || item.productId || `${order.id || order.order_id || 'order'}-item-${index}`,
          name: item.name || order.product_name,
          quantity,
          price: price > 0 ? price : undefined,
          total,
          color: item.color,
          colors,
          size: item.size,
          sizes,
          image: item.image || null,
        });
      });
    }
  } catch (error) {
    
  }

  if (items.length === 0) {
    const fallbackImage = order.product_images?.[0]
      || order.product?.images?.[order.product?.cover_image_index || 0]
      || order.product?.images?.[0]
      || FALLBACK_PRODUCT_IMAGE;

    const quantity = Math.max(1, Number(order.quantity || 1));
    const price = Number(order.amount || 0) / quantity;

    items.push({
      key: `${order.id || order.order_id || 'order'}-primary`,
      name: order.product_name,
      quantity,
      price: price || undefined,
      total: Number(order.amount || 0) || undefined,
      colors: Array.isArray(order.product_colors) ? order.product_colors : (Array.isArray(order.colors) ? order.colors : []),
      sizes: Array.isArray(order.product_sizes) ? order.product_sizes : [],
      image: fallbackImage,
    });
  }

  return items;
};

const getOrderMedia = (order: any) => {
  const items = parseOrderItems(order);
  const candidateImages = items
    .map((item) => getSafeImageUrl(item?.image))
    .filter((src) => typeof src === 'string' && src.trim().length > 0);

  const images = Array.from(new Set(candidateImages));

  if (images.length === 0) {
    const fallbackImage = getSafeImageUrl(
      order?.product_images?.[0]
        || order?.product?.images?.[order?.product?.cover_image_index || 0]
        || order?.product?.images?.[0]
        || FALLBACK_PRODUCT_IMAGE
    );
    images.push(fallbackImage);
  }

  return { items, images };
};

const buildInvoiceDataFromOrder = async (order: any) => {
  if (!order) return null;

  const items = parseOrderItems(order);
  if (!items.length) {
    return null;
  }

  const invoiceItems = await Promise.all(items.map(async (item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const computedPrice = Number(
      item.price ??
      (item.total ? Number(item.total) / quantity : null) ??
      (Number(order.amount || 0) / Math.max(1, Number(order.quantity || 1)))
    ) || 0;
    const computedTotal = Number(item.total ?? (computedPrice * quantity)) || 0;
    const colors = Array.isArray(item.colors) ? item.colors : (item.color ? [item.color] : []);
    const sizes = Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []);
    const safeImageSrc = getSafeImageUrl(item.image);
    const imageDataUrl = await imageUrlToDataUrl(safeImageSrc);

    return {
      name: item.name,
      quantity,
      price: computedPrice,
      total: computedTotal,
      image: imageDataUrl,
      colors,
      sizes,
    };
  }));

  const subtotal = invoiceItems.reduce((sum, current) => sum + Number(current.total || 0), 0);

  return {
    orderId: order.order_id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone || '',
    shippingAddress: order.shipping_address || 'Address on file',
    items: invoiceItems,
    subtotal,
    total: subtotal,
    paymentMethod: order.payment_method || 'Online Payment',
    paymentStatus: order.payment_status || undefined,
    transactionId: order.transaction_id || undefined,
    orderDate: order.created_at,
  };
};

const TrackOrder = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const statusFlow = ['pending', 'processing', 'confirmed', 'ready_to_ship', 'shipped', 'delivered'];

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  const formatCurrency = (amount: number | string) => {
    const value = Number(amount || 0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const formatDateTime = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedOrder(null);
    }
  };

  const getProductNavigationTarget = (order: any, primaryItem?: any) => {
    if (!order) return null;
    const potentialName = primaryItem?.name || order?.product?.name || order?.product_name;
    if (!potentialName) return null;
    return `/product/${encodeURIComponent(potentialName)}`;
  };

  const handleNavigateToProduct = (
    event: React.MouseEvent,
    order: any,
    primaryItem?: any
  ) => {
    event.stopPropagation();
    const target = getProductNavigationTarget(order, primaryItem);
    if (target) {
      navigate(target);
    } else {
      toast({
        title: 'Product unavailable',
        description: 'We could not locate this product in our collections right now.',
      });
    }
  };

  const handleCopyToClipboard = (value: string, message: string) => {
    if (!value) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        toast({
          title: 'Copied',
          description: message,
        });
      }).catch(() => {
        toast({
          title: 'Unable to copy',
          description: 'Please try again manually.',
          variant: 'destructive',
        });
      });
    }
  };

  const handleDownloadInvoice = async (order: any) => {
    try {
      toast({
        title: 'Preparing Invoice',
        description: 'Generating a downloadable invoice for your order...'
      });

      const logoUrl = import.meta.env.VITE_DEFAULT_LOGO_URL || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80';
      let invoiceData = await generateInvoiceFromOrder(order.order_id);

      if (!invoiceData) {
        invoiceData = await buildInvoiceDataFromOrder(order);
      }

      if (!invoiceData) {
        toast({
          title: 'Invoice Unavailable',
          description: 'We could not generate an invoice for this order right now.',
          variant: 'destructive',
        });
        return;
      }

      const logoDataUrl = await imageUrlToDataUrl(logoUrl);
      downloadInvoice(invoiceData, logoDataUrl ? { logoDataUrl } : undefined);

      toast({
        title: 'Invoice Ready',
        description: 'Your invoice has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Invoice Error',
        description: 'Failed to download invoice. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (field === 'email') {
      setEmail(value);
      // Clear validation error
      if (validationErrors.email) {
        setValidationErrors(prev => ({ ...prev, email: '' }));
      }
      setTouchedFields(prev => ({ ...prev, email: true }));
      
      // Real-time validation
      if (value.trim()) {
        const emailValidation = validateEmail(value);
        if (!emailValidation.isValid) {
          setValidationErrors(prev => ({ ...prev, email: emailValidation.message || '' }));
        }
      }
    } else if (field === 'phone') {
      // Phone is optional and not used for searching
      setPhone(value);
      // Clear validation error if any
      if (validationErrors.phone) {
        setValidationErrors(prev => ({ ...prev, phone: '' }));
      }
      setTouchedFields(prev => ({ ...prev, phone: true }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur - only email for tracking
    if (field === 'email' && email.trim()) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, email: emailValidation.message || '' }));
      }
    }
    // No phone validation required - it's optional
  };

  const handleTrackOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only validate email for tracking
    const emailValidation = validateEmail(email);
    
    if (!emailValidation.isValid) {
      setValidationErrors({
        email: emailValidation.message || '',
        phone: ''
      });
      setTouchedFields({ email: true, phone: true });
      
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Search orders by email only
      const orderData = await getOrdersByEmail(email);
      setOrders(orderData);
      setSearched(true);
      
      if (orderData.length === 0) {
        toast({
          title: "No Orders Found",
          description: "No orders found for the provided email address.",
        });
      }
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to track orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-indigo-100 text-indigo-800';
      case 'ready_to_ship': return 'bg-purple-100 text-purple-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return CheckCircle;
      case 'shipped': return Truck;
      case 'ready_to_ship': return Truck;
      case 'confirmed': return CheckCircle;
      case 'processing': return Clock;
      case 'pending': return Package;
      case 'cancelled': return AlertCircle;
      default: return Package;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Track Your Orders</h1>
            <p className="text-muted-foreground">
              Enter your email address to view all your orders and their current status
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Order Lookup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrackOrders} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      placeholder="Enter your email address"
                      required
                      className={`w-full ${getValidationClass(!validationErrors.email, touchedFields.email)}`}
                    />
                    {validationErrors.email && touchedFields.email && (
                      <p className="text-sm text-red-500">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      onBlur={() => handleFieldBlur('phone')}
                      placeholder="Enter phone number (optional)"
                      className={`w-full ${getValidationClass(!validationErrors.phone, touchedFields.phone)}`}
                    />
                    {validationErrors.phone && touchedFields.phone && (
                      <p className="text-sm text-red-500">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Track Orders
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {searched && (
            <div className="space-y-6">
              {sortedOrders.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No orders found for the provided email address. Please check your email and try again.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Your Orders ({sortedOrders.length})</h2>
                      <p className="text-sm text-muted-foreground">Showing the most recent orders linked to {email}</p>
                    </div>
                    <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-wide">
                      Order history snapshot
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 grid-cols-3 lg:grid-cols-4">
                    {sortedOrders.map((order) => {
                      const { items: orderItems, images: orderImages } = getOrderMedia(order);
                      const fallbackImage = FALLBACK_PRODUCT_IMAGE;
                      const totalQuantity = orderItems.reduce((sum: number, item: any) => sum + Number(item?.quantity || 1), 0) || order.quantity;
                      const primaryItem = orderItems[0];
                      const productName = primaryItem?.name || order.product_name;
                      const displayImages = (orderImages.length > 0 ? orderImages : [fallbackImage])
                        .slice(0, orderImages.length === 2 ? 2 : Math.min(orderImages.length || 1, 4));
                      const remainingImages = Math.max(0, orderImages.length - displayImages.length);
                      const imageGridClass = displayImages.length === 1
                        ? 'grid-cols-1'
                        : displayImages.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-2';

                      const handleCardImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = fallbackImage;
                      };

                      return (
                        <Card key={order.id} className="overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
                          <div
                            className="relative aspect-[3/4] overflow-hidden bg-muted cursor-pointer"
                            onClick={(event) => handleNavigateToProduct(event, order, primaryItem)}
                          >
                            <div className={`absolute inset-0 grid ${imageGridClass} gap-[2px] bg-muted`}>
                              {displayImages.map((imgSrc, idx) => {
                                const safeSrc = imgSrc || fallbackImage;
                                const showOverlayCount = idx === displayImages.length - 1 && remainingImages > 0;
                                return (
                                  <div key={`${order.id}-img-${idx}`} className="relative overflow-hidden">
                                    <img
                                      src={safeSrc}
                                      alt={`${productName || 'Order item'} ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={handleCardImageError}
                                    />
                                    {showOverlayCount && (
                                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-white text-sm font-semibold">
                                        +{remainingImages}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 text-white space-y-1">
                              <button
                                type="button"
                                className="text-left text-xs uppercase tracking-wide text-white/70 hover:text-white"
                                onClick={(event) => handleNavigateToProduct(event, order, primaryItem)}
                              >
                                Order #{order.order_id}
                              </button>
                              <button
                                type="button"
                                className="text-left text-base font-semibold leading-snug hover:text-white/90 line-clamp-2"
                                onClick={(event) => handleNavigateToProduct(event, order, primaryItem)}
                              >
                                {productName || 'View Product'}
                              </button>
                            </div>
                          </div>

                          <CardContent className="p-4 flex flex-col gap-4 flex-1">
                            <div className="space-y-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/80">
                                <CalendarDays className="h-4 w-4 text-foreground" />
                                <span>{formatDateTime(order.created_at)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground/80">Items</span>
                                <span className="font-medium text-foreground">{totalQuantity}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground/80">Total</span>
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <IndianRupee className="h-4 w-4 text-foreground" />
                                  {formatCurrency(order.amount)}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="secondary"
                              className="w-full flex items-center justify-center gap-2 mt-auto"
                              onClick={() => handleOpenOrderDetails(order)}
                            >
                              View Details
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={handleDetailsOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (() => {
            const StatusIcon = getStatusIcon(selectedOrder.status);
            const delivery = selectedOrder.deliveries?.[0];
            const { items: orderItems, images: orderImages } = getOrderMedia(selectedOrder);
            const uniqueDetailImages = Array.from(new Set(
              orderImages
                .map((img: string) => getSafeImageUrl(img || FALLBACK_PRODUCT_IMAGE))
                .filter((img) => typeof img === 'string' && img.trim().length > 0)
            ));
            if (uniqueDetailImages.length === 0) {
              uniqueDetailImages.push(FALLBACK_PRODUCT_IMAGE);
            }
            const maxDetailImages = uniqueDetailImages.length === 2 ? 2 : Math.min(uniqueDetailImages.length, 6);
            const displayImages = uniqueDetailImages.slice(0, maxDetailImages);
            const remainingImages = uniqueDetailImages.length - displayImages.length;
            const galleryGridClass = displayImages.length === 1
              ? 'grid-cols-1'
              : displayImages.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3 lg:grid-cols-4';
            const totalQuantity = orderItems.reduce((sum: number, item: any) => sum + Number(item?.quantity || 1), 0) || selectedOrder.quantity;
            const aggregatedColors = Array.from(new Set(orderItems.flatMap((item: any) => {
              if (item?.colors && Array.isArray(item.colors)) return item.colors;
              if (item?.color) return [item.color];
              return [];
            }).concat(selectedOrder.product_colors || selectedOrder.colors || []))).filter(Boolean);
            const aggregatedSizes = Array.from(new Set(orderItems.flatMap((item: any) => {
              if (item?.sizes && Array.isArray(item.sizes)) return item.sizes;
              if (item?.size) return [item.size];
              return [];
            }).concat(selectedOrder.product_sizes || selectedOrder.sizes || []))).filter(Boolean);
            const paymentStatus = (selectedOrder.payment_status || '').toUpperCase();
            const currentStepIndex = statusFlow.indexOf(selectedOrder.status);

            return (
              <>
                <DialogHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <DialogTitle className="text-2xl font-semibold flex items-center gap-3">
                      Order #{selectedOrder.order_id}
                    </DialogTitle>
                    <Badge className={`${getStatusColor(selectedOrder.status)} flex items-center gap-1 px-3 py-1 text-xs font-semibold` }>
                      <StatusIcon className="h-3 w-3" />
                      {selectedOrder.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                    {paymentStatus && (
                      <Badge variant={paymentStatus === 'PAID' ? 'outline' : 'destructive'} className="px-3 py-1 text-xs">
                        Payment {paymentStatus}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription>
                    Placed on <span className="font-medium text-foreground">{formatDateTime(selectedOrder.created_at)}</span> for {formatCurrency(selectedOrder.amount)}.
                  </DialogDescription>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => handleCopyToClipboard(selectedOrder.order_id, 'Order ID copied to clipboard.')}
                    >
                      <Copy className="h-4 w-4" />
                      Copy Order ID
                    </Button>
                    {selectedOrder.transaction_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => handleCopyToClipboard(selectedOrder.transaction_id, 'Transaction ID copied to clipboard.')}
                      >
                        <Receipt className="h-4 w-4" />
                        Copy Transaction ID
                      </Button>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-[minmax(220px,260px),1fr]">
                    <div className="rounded-xl border bg-muted/50 overflow-hidden">
                      <div className={`grid ${galleryGridClass} gap-[3px] bg-muted/70`}> 
                        {displayImages.map((imgSrc, idx) => {
                          const safeSrc = imgSrc || FALLBACK_PRODUCT_IMAGE;
                          const showOverlay = idx === displayImages.length - 1 && remainingImages > 0;
                          return (
                            <div key={`${selectedOrder.id}-detail-image-${idx}`} className="relative overflow-hidden">
                              <img
                                src={safeSrc}
                                alt={`${selectedOrder.product_name || orderItems[idx]?.name || 'Order item'} preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.onerror = null;
                                  event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                }}
                              />
                              {showOverlay && (
                                <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-white text-sm font-semibold">
                                  +{remainingImages}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-xl border p-4 space-y-3">
                        <p className="text-xs uppercase text-muted-foreground tracking-wide">Customer Contact</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-foreground" />
                            <span>{selectedOrder.customer_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-foreground" />
                            <span>{selectedOrder.customer_email}</span>
                          </div>
                          {selectedOrder.customer_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-foreground" />
                              <span>{selectedOrder.customer_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border p-4 space-y-3">
                        <p className="text-xs uppercase text-muted-foreground tracking-wide">Delivery Address</p>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground whitespace-pre-line">
                          <MapPin className="h-4 w-4 text-foreground mt-0.5" />
                          <span>{selectedOrder.shipping_address || 'Address on file'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border p-4 space-y-3">
                      <p className="text-xs uppercase text-muted-foreground tracking-wide">Order Summary</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-foreground" />
                          <span>Total pieces: <span className="font-medium text-foreground">{totalQuantity}</span></span>
                        </div>
                        <div className="space-y-2">
                          {orderItems.map((item: any, index: number) => (
                            <div key={`${selectedOrder.id}-dialog-item-${index}`} className="flex items-start justify-between gap-3 bg-muted/40 rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground text-sm line-clamp-2">{item?.name || 'Item'}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item?.quantity || 1}</p>
                                {item?.colors && item.colors.length > 0 && (
                                  <p className="text-[11px] text-muted-foreground">Colors: {item.colors.join(', ')}</p>
                                )}
                                {item?.sizes && item.sizes.length > 0 && (
                                  <p className="text-[11px] text-muted-foreground">Sizes: {item.sizes.join(', ')}</p>
                                )}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                {item?.price ? <p>₹{Number(item.price).toLocaleString()}</p> : null}
                                {item?.total ? <p className="font-semibold text-foreground">{formatCurrency(item.total)}</p> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                        {aggregatedColors.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Palette</span>
                            <div className="flex flex-wrap gap-1">
                              {aggregatedColors.map((color: string, index: number) => (
                                <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                                  <ColorCircle color={color} size="w-3 h-3" />
                                  {color}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aggregatedSizes && aggregatedSizes.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sizes</span>
                            <div className="flex flex-wrap gap-1">
                              {aggregatedSizes.map((size: string, index: number) => (
                                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                                  {size}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4 space-y-3">
                      <p className="text-xs uppercase text-muted-foreground tracking-wide">Payment Details</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-foreground" />
                          <span>Method: {selectedOrder.payment_method || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-foreground" />
                          <span>Status: <span className={paymentStatus === 'PAID' ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>{paymentStatus || 'N/A'}</span></span>
                        </div>
                        {selectedOrder.transaction_id && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground break-all">
                            <Receipt className="h-3 w-3 text-foreground" />
                            <span>Txn: {selectedOrder.transaction_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-4">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Status Timeline</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {statusFlow.map((step, index) => {
                        const isReached = currentStepIndex >= 0 && index <= currentStepIndex;
                        return (
                          <div key={step} className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${isReached ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>
                              {step.replace(/_/g, ' ')}
                            </span>
                            {index !== statusFlow.length - 1 && (
                              <div className={`h-0.5 w-6 ${isReached ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                            )}
                          </div>
                        );
                      })}
                      {selectedOrder.status === 'cancelled' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-700 border-red-200">Cancelled</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Delivery Updates</p>
                    {delivery ? (
                      <div className="space-y-3 text-sm">
                        {delivery.courier_service && (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-foreground" />
                            <span>Courier: {delivery.courier_service}</span>
                          </div>
                        )}
                        {delivery.tracking_number && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-foreground" />
                            <span>Tracking ID: {delivery.tracking_number}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-1"
                              onClick={() => handleCopyToClipboard(delivery.tracking_number, 'Tracking ID copied to clipboard.')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {delivery.status && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-foreground" />
                            <span>Latest Update: {delivery.status.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {delivery.delivery_timestamp && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-foreground" />
                            <span>Delivered on {formatDateTime(delivery.delivery_timestamp)}</span>
                          </div>
                        )}
                        {delivery.updated_at && (
                          <p className="text-xs text-muted-foreground">Last updated {formatDateTime(delivery.updated_at)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">We will notify you once the courier shares tracking updates for this order.</p>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'delivered' || selectedOrder.status === 'shipped' || selectedOrder.status === 'processing' || selectedOrder.status === 'ready_to_ship') && (
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => handleDownloadInvoice(selectedOrder)}
                      >
                        <Receipt className="h-4 w-4" />
                        Download Invoice
                      </Button>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => handleDetailsOpenChange(false)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default TrackOrder;
