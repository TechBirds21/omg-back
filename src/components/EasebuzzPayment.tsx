// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader as Loader2, CircleAlert as AlertCircle, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { initiateEasebuzzPayment, preparePaymentData, validatePaymentAmount } from '@/lib/easebuzz';
import { useToast } from '@/hooks/use-toast';

interface EasebuzzPaymentProps {
  paymentData: {
    amount: number;
    orderId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    productInfo?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  autoStart?: boolean;
  onPaymentInitiated?: (orderId: string) => void;
}

const EasebuzzPayment: React.FC<EasebuzzPaymentProps> = ({
  paymentData,
  autoStart = false,
  onPaymentInitiated
}) => {
  const { toast } = useToast();
  const [securityCheck] = useState<{
    approved: boolean;
    requiresVerification: boolean;
    message: string;
  } | null>(null);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  const handleEasebuzzPayment = async () => {
    try {
      // Validate payment amount first
      const validation = validatePaymentAmount(paymentData.amount);
      if (!validation.valid) {
        toast({
          title: "Invalid Amount",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      if (onPaymentInitiated) {
        onPaymentInitiated(paymentData.orderId);
      }

      
      
      // Prepare payment data
      const preparedData = preparePaymentData({
        amount: paymentData.amount,
        customerName: paymentData.customerName || 'Customer',
        customerEmail: paymentData.customerEmail || '',
        customerPhone: paymentData.customerPhone || '',
        productInfo: paymentData.productInfo || 'Order Payment',
        orderId: paymentData.orderId,
        address: paymentData.address || '',
        city: paymentData.city || '',
        state: paymentData.state || '',
        pincode: paymentData.pincode || ''
      });
      
      // Initiate Easebuzz payment
      await initiateEasebuzzPayment(preparedData);
      
      

    } catch (error) {
      
      
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : 'Payment initiation failed',
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (autoStart) {
      // Delay to allow UI render
      const timer = setTimeout(() => {
        handleEasebuzzPayment();
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className="space-y-4">
      {/* Security Status Indicator */}
      {securityCheck && (
        <div className={`p-3 rounded-lg border ${
          securityCheck.approved
            ? 'bg-green-50 border-green-200'
            : securityCheck.requiresVerification
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {securityCheck.approved ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : securityCheck.requiresVerification ? (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            ) : (
              <Shield className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              securityCheck.approved ? 'text-green-800' :
              securityCheck.requiresVerification ? 'text-yellow-800' : 'text-red-800'
            }`}>
              {securityCheck.approved ? 'Security Verified' :
               securityCheck.requiresVerification ? 'Additional Verification Required' : 'Security Check Failed'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            securityCheck.approved ? 'text-green-700' :
            securityCheck.requiresVerification ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {securityCheck.message}
          </p>
        </div>
      )}

      <div className="p-4 border rounded-lg bg-green-50 border-green-200">
        <div className="flex items-center space-x-2 mb-2">
          <CreditCard className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">Easebuzz Payment Gateway</span>
          <div className="flex items-center space-x-1 ml-auto">
            <Shield className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-600">Secured</span>
          </div>
        </div>
        <p className="text-green-700 mb-4">
          Secure payment processing with UPI, Cards, Net Banking & Wallets
        </p>

        {/* Payment Timeline */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-xs text-green-600 mb-2">
            <Clock className="h-3 w-3" />
            <span>Payment Process</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs">Initiate</span>
            </div>
            <div className="w-4 h-0.5 bg-green-300"></div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-300 rounded-full"></div>
              <span className="text-xs">Gateway</span>
            </div>
            <div className="w-4 h-0.5 bg-green-300"></div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-300 rounded-full"></div>
              <span className="text-xs">Confirm</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-green-600 space-y-1">
          <p><strong>Order ID:</strong> {paymentData.orderId}</p>
          <p><strong>Amount:</strong> ₹{paymentData.amount.toLocaleString()}</p>
          <p><strong>Customer:</strong> {paymentData.customerName || 'N/A'}</p>
          {paymentData.customerEmail && (
            <p><strong>Email:</strong> {paymentData.customerEmail}</p>
          )}
          {paymentData.customerPhone && (
            <p><strong>Phone:</strong> {paymentData.customerPhone}</p>
          )}
        </div>
      </div>

      {/* Security Features */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Security Features</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Fraud Detection</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Rate Limiting</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>SSL Encrypted</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>PCI Compliant</span>
          </div>
        </div>
      </div>

      {!autoStart && (
        <Button
          onClick={handleEasebuzzPayment}
          disabled={securityCheck ? !securityCheck.approved : false}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium"
          size="lg"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Pay ₹{paymentData.amount.toLocaleString()} with Easebuzz
        </Button>
      )}

      {autoStart && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Redirecting to Easebuzz...</span>
          </div>
        </div>
      )}

      {/* Security Info Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowSecurityInfo(!showSecurityInfo)}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          {showSecurityInfo ? 'Hide' : 'Show'} Security Information
        </button>
      </div>

      {showSecurityInfo && (
        <div className="p-3 bg-gray-50 border rounded-lg text-xs text-gray-600">
          <p className="mb-2"><strong>🔒 Security Measures:</strong></p>
          <ul className="space-y-1">
            <li>• Payment data is encrypted using industry-standard SSL</li>
            <li>• Fraud detection monitors for suspicious activity</li>
            <li>• Rate limiting prevents abuse and spam</li>
            <li>• All transactions are logged for audit purposes</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default EasebuzzPayment;
