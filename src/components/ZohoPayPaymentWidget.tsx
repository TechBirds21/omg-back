// Zoho Payments Widget Integration
// Based on: https://www.zoho.com/in/payments/api/v1/widget/#integrate-widget

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { initiateZohoPayPayment } from '@/lib/api-payments';

// Declare Zoho Payments widget types
declare global {
  interface Window {
    ZPayments?: any;
  }
}

type Props = {
  paymentData: {
    amount: number;
    orderId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    productInfo?: string;
    surl?: string;
    furl?: string;
  };
  autoStart?: boolean;
  onPaymentInitiated?: (orderId: string) => void;
  onPaymentSuccess?: (paymentId: string, signature?: string) => void;
  onPaymentError?: (error: string) => void;
};

const ZohoPayPaymentWidget: React.FC<Props> = ({
  paymentData,
  autoStart = false,
  onPaymentInitiated,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetReady, setWidgetReady] = useState<boolean>(false);
  const [zohoInstance, setZohoInstance] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const widgetInitialized = useRef<boolean>(false);

  // Load widget script and initialize
  useEffect(() => {
    const initWidget = async () => {
      // Check if script is already loaded
      if (window.ZPayments) {
        setWidgetReady(true);
        return;
      }

      // Check if script tag exists
      const existingScript = document.querySelector('script[src*="zpayments.js"]');
      if (existingScript) {
        // Wait for script to load
        existingScript.addEventListener('load', () => {
          setWidgetReady(true);
        });
        if (window.ZPayments) {
          setWidgetReady(true);
        }
        return;
      }

      // Script should be in index.html, just wait for it
      const checkInterval = setInterval(() => {
        if (window.ZPayments) {
          setWidgetReady(true);
          clearInterval(checkInterval);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.ZPayments) {
          setError('Zoho Payments widget script not loaded. Please refresh the page.');
        }
      }, 5000);
    };

    initWidget();
  }, []);

  // Initialize Zoho Payments instance when widget is ready
  useEffect(() => {
    if (!widgetReady || !window.ZPayments || widgetInitialized.current) return;

    const initializeInstance = async () => {
      try {
        // Get configuration from backend
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
        const response = await fetch(`${API_BASE}/api/payments/zohopay/config`);
        let accountId = '';
        let domain = 'IN';
        let apiKey = '';

        if (response.ok) {
          const configData = await response.json();
          accountId = configData.account_id || '';
          domain = configData.domain || 'IN';
          apiKey = configData.api_key || '';
        } else {
          // Fallback: try to get from environment or use defaults
          accountId = import.meta.env.VITE_ZOHOPAY_ACCOUNT_ID || '';
          domain = import.meta.env.VITE_ZOHOPAY_DOMAIN || 'IN';
          apiKey = import.meta.env.VITE_ZOHOPAY_API_KEY || '';
        }

        if (!accountId || !apiKey) {
          setError('ZohoPay configuration missing. Please go to Admin Settings → Payment Gateways → ZohoPay to configure Account ID and Access Token.');
          return;
        }

        // Create Zoho Payments instance
        // Reference: https://www.zoho.com/in/payments/api/v1/widget/#instance-creation
        // Required: account_id, domain, otherOptions.api_key
        const zohoConfig = {
          account_id: accountId,  // Required: Zoho Payments account ID
          domain: domain,  // Required: 2-letter country code (e.g., "IN")
          otherOptions: {
            api_key: apiKey,  // Required: API key from Zoho Payments Developer Space
          },
        };

        const instance = new window.ZPayments(zohoConfig);
        setZohoInstance(instance);
        setConfig(zohoConfig);
        widgetInitialized.current = true;
      } catch (err) {
        console.error('Error initializing Zoho Payments:', err);
        setError('Failed to initialize Zoho Payments widget');
      }
    };

    initializeInstance();
  }, [widgetReady]);

  const handlePayment = async () => {
    if (!zohoInstance || loading) return;

    try {
      setLoading(true);
      setError(null);

      if (onPaymentInitiated) {
        onPaymentInitiated(paymentData.orderId);
      }

      // Step 1: Create payment session via backend
      const sessionResponse = await initiateZohoPayPayment({
        order_id: paymentData.orderId,
        amount: paymentData.amount,
        customer_name: paymentData.customerName || '',
        customer_email: paymentData.customerEmail || '',
        customer_phone: paymentData.customerPhone || '',
        product_info: paymentData.productInfo || 'Order Payment',
        callback_url: paymentData.surl || `${window.location.origin}/payment-success?orderId=${paymentData.orderId}`,
        failure_url: paymentData.furl || `${window.location.origin}/payment-failure?orderId=${paymentData.orderId}`,
        currency: 'INR',
      });

      if (sessionResponse.status !== 1 || !sessionResponse.payments_session_id) {
        throw new Error(sessionResponse.error || 'Failed to create payment session');
      }

      const paymentsSessionId = sessionResponse.payments_session_id;

      // Step 2: Initiate payment using widget
      // Reference: https://www.zoho.com/in/payments/api/v1/widget/#initiate-payment
      // Required: amount, currency_code, payments_session_id, description
      // Optional: currency_symbol, business, invoice_number, reference_number, address
      const paymentOptions = {
        amount: String(paymentData.amount),  // Required: string format
        currency_code: 'INR',  // Required: 3-letter currency code
        payments_session_id: paymentsSessionId,  // Required: from payment session API
        description: paymentData.productInfo || 'Order Payment',  // Required
        currency_symbol: '₹',  // Optional: currency symbol
        business: 'O Maguva',  // Optional: business name
        invoice_number: paymentData.orderId,  // Optional: invoice number
        reference_number: paymentData.orderId,  // Optional: reference number (max 50 chars)
        address: {  // Optional: customer address for prefilling
          name: paymentData.customerName || '',
          email: paymentData.customerEmail || '',
          phone: paymentData.customerPhone || '',
        },
      };

      try {
        const widgetResponse = await zohoInstance.requestPaymentMethod(paymentOptions);

        // Handle success
        if (widgetResponse.payment_id) {
          const paymentId = widgetResponse.payment_id;
          const signature = widgetResponse.signature;

          // Store payment info
          try {
            sessionStorage.setItem('zoho_payment_id', paymentId);
            sessionStorage.setItem('zoho_payments_session_id', paymentsSessionId);
            sessionStorage.setItem('zoho_order_id', paymentData.orderId);
            if (signature) {
              sessionStorage.setItem('zoho_signature', signature);
            }
          } catch (e) {
            console.warn('Failed to store payment info:', e);
          }

          if (onPaymentSuccess) {
            onPaymentSuccess(paymentId, signature);
          }

          // Redirect to success page
          const successUrl = paymentData.surl || `${window.location.origin}/payment-success?orderId=${paymentData.orderId}&payment_id=${paymentId}&payments_session_id=${paymentsSessionId}`;
          window.location.href = successUrl;
        } else if (widgetResponse.code === 'error') {
          throw new Error(widgetResponse.message || 'Payment failed');
        }
      } catch (widgetError: any) {
        // Handle widget errors
        if (widgetError.code === 'widget_closed') {
          // User closed the widget - don't treat as error
          setLoading(false);
          return;
        }
        throw widgetError;
      } finally {
        // Close widget instance
        try {
          await zohoInstance.close();
        } catch (e) {
          // Ignore close errors
        }
      }
      } catch (err: any) {
        console.error('Zoho Pay payment error:', err);
        const errorMessage = err.message || 'Payment initiation failed';
        setError(errorMessage);
        setLoading(false);

        if (onPaymentError) {
          onPaymentError(errorMessage);
        }
      }
    };

    useEffect(() => {
      if (autoStart && zohoInstance && !loading && !error && widgetReady) {
        const timer = setTimeout(() => {
          handlePayment();
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [autoStart, zohoInstance, loading, error, widgetReady]);

  if (!widgetReady) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <span className="font-medium text-blue-900">Loading Zoho Payments Widget...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !widgetReady) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center space-x-2 mb-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-900">Zoho Pay Payment Gateway</span>
        </div>
        <p className="text-sm text-blue-700">
          Secure payment processing powered by Zoho Pay. Complete your payment using the widget below.
        </p>
        <div className="mt-3 flex items-center space-x-2 text-xs text-blue-700">
          <Shield className="h-3 w-3" />
          <span>SSL Secured • Zoho Trusted Gateway</span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <div className="text-sm text-muted-foreground">Amount Payable</div>
          <div className="text-lg font-semibold text-foreground">
            ₹{Number(paymentData.amount || 0).toFixed(2)}
          </div>
        </div>
        <Button
          onClick={handlePayment}
          disabled={loading || !zohoInstance}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay with Zoho Pay
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ZohoPayPaymentWidget;

