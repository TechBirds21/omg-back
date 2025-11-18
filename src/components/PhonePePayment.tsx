// @ts-nocheck
import React, { useEffect } from 'react';
import { initiatePhonePePayment, generatePhonePeOrderId, PhonePePaymentData } from '@/lib/phonepe-api';

type Props = {
  amount?: number;
  productInfo?: string;
  paymentData?: Partial<PhonePePaymentData> & { orderId?: string };
  autoStart?: boolean;
  onPaymentInitiated?: (orderId: string) => void;
};

const PhonePePayment: React.FC<Props> = ({ amount, productInfo, paymentData, autoStart, onPaymentInitiated }) => {
  const handlePay = async () => {
    try {
      const resolvedAmount = Number(paymentData?.amount ?? amount);
      if (!isFinite(resolvedAmount) || resolvedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const orderId = paymentData?.orderId || generatePhonePeOrderId();
      const payload: PhonePePaymentData = {
        amount: resolvedAmount,
        orderId,
        customerName: paymentData?.customerName,
        customerEmail: paymentData?.customerEmail,
        customerPhone: paymentData?.customerPhone,
        productInfo: paymentData?.productInfo ?? productInfo,
      };

      if (onPaymentInitiated) onPaymentInitiated(orderId);
      await initiatePhonePePayment(payload);
    } catch (err) {
      
      alert('Payment initiation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  useEffect(() => {
    if (autoStart) {
      // delay to allow UI render
      const t = setTimeout(handlePay, 200);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  return (
    <div>
      <button onClick={handlePay} className="btn btn-primary">Pay with PhonePe</button>
    </div>
  );
};

export default PhonePePayment;
