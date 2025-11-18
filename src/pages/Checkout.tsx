// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, MapPin, User, CircleCheck as CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/components/CartProvider';
import PincodeChecker from '@/components/PincodeChecker';
import { useToast } from '@/hooks/use-toast';
import { createOrder } from '@/lib/api-storefront';
import { paymentService } from '@/lib/paymentService';
// replaced Easebuzz with PhonePe
import PhonePePayment from '@/components/PhonePePayment';
import EasebuzzPayment from '@/components/EasebuzzPayment';
import ZohoPayPayment from '@/components/ZohoPayPayment';
import { generateOrderId, generateGuestOrderId } from '@/lib/orderIdGenerator';
import { validateEmail, validateMobileNumber, getValidationClass, formatMobileNumber, validateForm, handlePhoneInput } from '@/lib/validations';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, saveAttemptedPurchase } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [areaEdited, setAreaEdited] = useState(false); // track manual edits to Area
  // debounce ref to avoid applying deliveryInfo on every keystroke
  const pincodeDebounceRef = useRef<number | null>(null);

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    pincode: '',
    area: '',
    city: '',
    state: '',
    country: 'India'
  });

  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<string>('phonepe');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/collections');
    }
  }, [items, navigate]);

  // Initialize payment service
  useEffect(() => {
    const initializePayment = async () => {
      try {
        await paymentService.initialize();
        const primaryMethod = await paymentService.getCurrentlyActiveMethod();
        const availableMethods = paymentService.getEnabledPaymentMethods();
        
        if (primaryMethod) {
          setPrimaryPaymentMethod(primaryMethod.method);
        }
        
        setAvailablePaymentMethods(availableMethods);
      } catch (error) {
        
        // Fallback to PhonePe
        setPrimaryPaymentMethod('phonepe');
        setAvailablePaymentMethods([{
          method: 'phonepe',
          displayName: 'PhonePe',
          isEnabled: true,
          isPrimary: true,
          configuration: {}
        }]);
      }
    };

    initializePayment();
  }, []);

  const handleDeliveryInfoUpdate = (info: any) => {
    // Only update when we receive valid delivery info
    if (!info) return;
    setDeliveryInfo(info);
    setCustomerInfo(prev => ({
      ...prev,
      // only overwrite area from auto-lookup if user didn't manually edit it
      area: areaEdited ? prev.area : (info.area || prev.area),
      city: info.city || prev.city,
      state: info.state || prev.state,
      country: info.country || prev.country
    }));
  };

  const handlePincodeChange = (pincode: string, deliveryInfo: any) => {
    // Always update pincode immediately so input shows typed characters
    setCustomerInfo(prev => ({ ...prev, pincode }));

    // If no deliveryInfo provided, cancel any pending auto-fill but DO NOT clear deliveryInfo here
    // (clearing deliveryInfo on each keystroke caused parent re-renders and input flicker)
    if (!deliveryInfo) {
      if (pincodeDebounceRef.current) {
        clearTimeout(pincodeDebounceRef.current);
        pincodeDebounceRef.current = null;
      }
      // do not setDeliveryInfo(null) here to avoid unnecessary re-renders
      return;
    }

    // Debounce applying the lookup result to avoid overwriting while user types
    if (pincodeDebounceRef.current) {
      clearTimeout(pincodeDebounceRef.current);
    }

    // Only apply after user stops typing for 600ms
    pincodeDebounceRef.current = window.setTimeout(() => {
      setCustomerInfo(prev => ({
        ...prev,
        // do not override area if user manually edited it
        area: areaEdited ? prev.area : (deliveryInfo.area || prev.area),
        city: deliveryInfo.city || prev.city,
        state: deliveryInfo.state || prev.state,
        country: deliveryInfo.country || prev.country
      }));
      setDeliveryInfo(deliveryInfo);
      pincodeDebounceRef.current = null;
    }, 600);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (pincodeDebounceRef.current) {
        clearTimeout(pincodeDebounceRef.current);
        pincodeDebounceRef.current = null;
      }
    };
  }, []);

  const calculateTotal = () => {
    const subtotal = getTotalPrice();
    return {
      subtotal,
      total: subtotal
    };
  };

  const handlePlaceOrder = async () => {
    // Validate all fields
    const fields = {
      name: { value: customerInfo.name, required: true },
      email: { value: customerInfo.email, required: true, type: 'email' as const },
      phone: { value: customerInfo.phone, required: true, type: 'mobile' as const },
      address: { value: customerInfo.address, required: true },
      pincode: { value: customerInfo.pincode, required: true },
      area: { value: customerInfo.area, required: true },
      city: { value: customerInfo.city, required: true },
      state: { value: customerInfo.state, required: true }
    };

    const validation = validateForm(fields);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setTouchedFields(Object.keys(fields).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      
      toast({
        title: "Validation Error",
        description: "Please fix the errors below and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryInfo) {
      toast({
        title: "Invalid Pincode",
        description: "Please enter a valid pincode for delivery.",
        variant: "destructive",
      });
      return;
    }

    // Validate payment method
    if (!paymentService.validatePaymentMethod(primaryPaymentMethod)) {
      toast({
        title: "Payment Method Error",
        description: "Selected payment method is not available. Please choose another method.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { total } = calculateTotal();

      // Generate ONE canonical order id for PhonePe and a SINGLE DB row
      const paymentOrderId = await generateOrderId(items[0]?.productId || 'guest');

      // Build consolidated items payload for storage/display
      const orderItems = items.map((it) => ({
        productId: it.productId,
        name: it.name,
        color: it.color,
        quantity: it.quantity,
        price: it.price,
        image: it.image,
        size: it.size,
        sizes: it.sizes,
      }));

      // Build summary product title: first item + +N items
      const summaryName = (items.length > 0 && items[0])
        ? `${items[0].name}${items[0].color ? ` (${items[0].color})` : ''}${items.length > 1 ? ` +${items.length - 1} items` : ''}`
        : 'Order';

      const totalQuantity = items.reduce((s, it) => s + Number(it.quantity || 1), 0);

      // Create a single consolidated master order (no vendor association here)
      await createOrder({
        order_id: paymentOrderId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        product_name: summaryName,
        product_colors: items.map((it) => it.color).filter(Boolean),
        product_sizes: items.map((it) => it.size).filter(Boolean),
        quantity: totalQuantity,
        amount: total,
        status: 'pending',
        payment_method: primaryPaymentMethod,
        payment_status: 'pending',
        shipping_address: `${customerInfo.address}, ${customerInfo.area}, ${customerInfo.city}, ${customerInfo.state} - ${customerInfo.pincode}`,
        applied_offer: JSON.stringify({ items: orderItems })
      });

      // Persist items for success/failure page rendering
      try { sessionStorage.setItem('pp_cart_items', JSON.stringify(orderItems)); } catch {}

      // Save attempted purchase before redirecting to payment
      saveAttemptedPurchase();

      // Use the canonical order id for payment so PhonePe matches DB
      setOrderId(paymentOrderId);

      toast({
        title: "Order Created",
        description: "Redirecting to payment gateway...",
      });

      // Payment initiation is now enabled
      setPaymentInitiated(true);
    } catch (error) {
      
      toast({
        title: "Order Failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Real-time validation for email and phone
    if (field === 'email' && value.trim()) {
      const emailValidation = validateEmail(value);
      if (!emailValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, email: emailValidation.message || '' }));
      }
    } else if (field === 'phone' && value.trim()) {
      const phoneValidation = validateMobileNumber(value);
      if (!phoneValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, phone: phoneValidation.message || '' }));
      }
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur
    if (field === 'email' && customerInfo.email.trim()) {
      const emailValidation = validateEmail(customerInfo.email);
      if (!emailValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, email: emailValidation.message || '' }));
      }
    } else if (field === 'phone' && customerInfo.phone.trim()) {
      const phoneValidation = validateMobileNumber(customerInfo.phone);
      if (!phoneValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, phone: phoneValidation.message || '' }));
      }
    }
  };

  const { subtotal, total } = calculateTotal();

  if (items.length === 0) {
    return null;
  }

  // build paymentData for PhonePe component
  const productInfo = (items.length > 0 && items[0]) ? `${items[0].name}${items[0].color ? ` (${items[0].color})` : ''}${items.length > 1 ? ` +${items.length - 1} items` : ''}` : 'Saree Order';
  const paymentData = {
    amount: total,
    customerName: customerInfo.name,
    customerEmail: customerInfo.email,
    customerPhone: customerInfo.phone,
    productInfo,
    orderId: orderId || 'guest_order',
    address: customerInfo.address,
    city: customerInfo.city,
    state: customerInfo.state,
    pincode: customerInfo.pincode,
    surl: import.meta.env.VITE_PAYMENT_SUCCESS_URL || `${window.location.origin}/payment-success`,
    furl: import.meta.env.VITE_PAYMENT_FAILURE_URL || `${window.location.origin}/payment-failure`
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Customer Information */}
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Checkout</h1>
              <p className="text-muted-foreground">Complete your order details</p>
            </div>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      onBlur={() => handleFieldBlur('name')}
                      placeholder="Enter your full name"
                      required
                      className={getValidationClass(!validationErrors.name, touchedFields.name)}
                    />
                    {validationErrors.name && touchedFields.name && (
                      <p className="text-sm text-red-500">{validationErrors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      placeholder="Enter your email address"
                      required
                      className={getValidationClass(!validationErrors.email, touchedFields.email)}
                    />
                    {validationErrors.email && touchedFields.email && (
                      <p className="text-sm text-red-500">{validationErrors.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => {
                      const formattedPhone = handlePhoneInput(e.target.value);
                      handleFieldChange('phone', formattedPhone);
                    }}
                    onBlur={() => handleFieldBlur('phone')}
                    placeholder="9876543210"
                    required
                    className={getValidationClass(!validationErrors.phone, touchedFields.phone)}
                    maxLength={10}
                  />
                  {validationErrors.phone && touchedFields.phone && (
                    <p className="text-sm text-red-500">{validationErrors.phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <div className="mb-4">
                    <PincodeChecker
                      onDeliveryInfoUpdate={handleDeliveryInfoUpdate}
                      onPincodeChange={handlePincodeChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area">Area</Label>
                    <Input
                      id="area"
                      value={customerInfo.area}
                      onChange={(e) => {
                        setAreaEdited(true); // user edited area manually — prevent auto-overwrites
                        setCustomerInfo({ ...customerInfo, area: e.target.value });
                      }}
                      placeholder="Area"
                      /* allow manual edits so user can add/save area */
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                      placeholder="City"
                      readOnly
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={customerInfo.state}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={customerInfo.country}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Complete Address *</Label>
                  <Textarea
                    id="address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder="House/Flat number, Building name, Street name"
                    rows={3}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Processing */}
            {paymentInitiated && orderId && !import.meta.env.VITE_DISABLE_PAYMENTS && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Processing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Complete Payment</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Complete your payment to confirm your order
                    </p>
                  </div>
                  
                  {primaryPaymentMethod === 'phonepe' && (
                    <PhonePePayment
                      paymentData={{ ...paymentData, orderId }}
                      autoStart
                      onPaymentInitiated={() => {
                        // Don't clear the cart here; wait for success/failure callback pages
                      }}
                    />
                  )}
                  
                  {primaryPaymentMethod === 'easebuzz' && (
                    <EasebuzzPayment
                      paymentData={{ ...paymentData, orderId }}
                      autoStart={true}
                      onPaymentInitiated={() => {
                        // Don't clear the cart here; wait for success/failure callback pages
                      }}
                    />
                  )}

                  {primaryPaymentMethod === 'zohopay' && (
                    <ZohoPayPayment
                      paymentData={{ ...paymentData, orderId }}
                      autoStart={true}
                      onPaymentInitiated={() => {
                        // Don't clear the cart here; wait for success/failure callback pages
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Items */}
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover object-center rounded bg-muted/50"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">Color: {item.color}</p>
                        {item.size && (
                          <p className="text-sm text-muted-foreground">Size: <span className="font-medium text-green-600">{item.size}</span></p>
                        )}
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Delivery Charges:</span>
                    <span>FREE</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                {deliveryInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center text-green-700 mb-2">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="font-medium">Delivery Confirmed</span>
                    </div>
                    <p className="text-sm text-green-600">
                      Delivering to: {deliveryInfo.area}, {deliveryInfo.city}, {deliveryInfo.state}
                    </p>
                  </div>
                )}

                {/* Proceed to Payment */}
                {!paymentInitiated && (
                  <div className="space-y-4">
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={loading}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      size="lg"
                    >
                      {loading ? 'Preparing Payment...' : `Proceed to Payment - ₹${total.toLocaleString()}`}
                    </Button>

                    {/* Test Payment Button (Development Only) */}
                    {import.meta.env.DEV && (
                      <Button
                        onClick={() => {
                          // Create a test order and initiate payment
                          setOrderId('TEST_' + Date.now());
                          setPaymentInitiated(true);
                        }}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        Test Payment Flow (₹1)
                      </Button>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  By placing this order, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
