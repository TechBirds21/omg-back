// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XCircle, ArrowLeft, RefreshCw, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { retryFailedPayment } from '@/lib/api-storefront';
import { useToast } from '@/hooks/use-toast';

const PaymentFailure: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get error message and order ID from URL parameters
    const errorMsg = searchParams.get('error') || 'Payment was not completed successfully';
    const orderIdParam = searchParams.get('orderId') || '';
    setError(errorMsg);
    setOrderId(orderIdParam);

    // Clear session storage
    sessionStorage.removeItem('easebuzz_order_context');
    sessionStorage.removeItem('easebuzz_last_payment');
    sessionStorage.removeItem('pp_last_order');
    sessionStorage.removeItem('zp_last_order');
  }, [searchParams]);

  const handleRetryPayment = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order ID not found. Cannot retry payment.",
        variant: "destructive"
      });
      return;
    }

    setIsRetrying(true);
    setRetryError(null);

    try {
      const { retryFailedPayment } = await import('@/lib/api-storefront');
      const result = await retryFailedPayment(orderId, 'easebuzz');

      if (result.success) {
        toast({
          title: "Payment Retry Initiated",
          description: result.message
        });
        // The retry function should handle redirection
      } else {
        setRetryError(result.message);
        toast({
          title: "Retry Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRetryError(errorMessage);
      toast({
        title: "Retry Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full mx-auto p-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="text-red-500 mb-4">
              <XCircle className="w-16 h-16 mx-auto" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Payment Failed</CardTitle>
            <p className="text-gray-600 mt-2">
              {error || 'Your payment could not be processed. Please try again.'}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {orderId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Order Details</span>
                </div>
                <p className="text-sm text-blue-700">
                  <strong>Order ID:</strong> {orderId}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  If this issue persists, please contact our support team with your order ID.
                </p>
              </div>
            )}

            {retryError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Retry Failed</span>
                </div>
                <p className="text-sm text-red-700">{retryError}</p>
              </div>
            )}

            <div className="space-y-3">
              {orderId && (
                <Button
                  onClick={handleRetryPayment}
                  disabled={isRetrying}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isRetrying ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-pulse" />
                      Retrying Payment...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry Payment
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={() => navigate('/checkout')}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isRetrying}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Different Payment Method
              </Button>

              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
                disabled={isRetrying}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Home
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Need help? Contact our support team</p>
              <p className="font-mono text-xs mt-1">support@omaguva.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentFailure;
