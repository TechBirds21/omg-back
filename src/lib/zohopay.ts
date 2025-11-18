// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

export interface ZohoPayData {
  amount: number;
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productInfo?: string;
  successUrl?: string;
  failureUrl?: string;
}

/**
 * Initiate Zoho Pay via Python backend API
 */
export const initiateZohoPay = async (data: ZohoPayData): Promise<{ status: number; paymentUrl?: string; error?: string } > => {
  try {
    const amount = Number(data.amount);
    if (!isFinite(amount) || amount <= 0) throw new Error('Invalid amount');

    // Use Python backend API instead of Supabase Edge Function
    const { initiateZohoPayPayment } = await import('./api-payments');

    const result = await initiateZohoPayPayment({
      order_id: data.orderId,
      amount: amount,
      customer_name: data.customerName || '',
      customer_email: data.customerEmail || '',
      customer_phone: data.customerPhone || '',
      product_info: data.productInfo || 'Order Payment',
      callback_url: data.successUrl || `${window.location.origin}/payment-success?orderId=${data.orderId}`,
      failure_url: data.failureUrl || `${window.location.origin}/payment-failure?orderId=${data.orderId}`,
    });

    console.log('ZohoPay Python API response:', result);

    if (result.status === 0 || result.error) {
      console.error('ZohoPay error:', result);
      throw new Error(result.error || 'Payment initialization failed');
    }

    const paymentUrl = result.paymentUrl || result.redirectUrl || null;
    if (paymentUrl) {
      // Persist order details for callback handling
      try { 
        sessionStorage.setItem('zp_last_order', JSON.stringify({
          orderId: data.orderId,
          amount: amount.toFixed(2),
          customerName: data.customerName,
          customerEmail: data.customerEmail,
        }));
        sessionStorage.setItem('zp_order_id', data.orderId);
      } catch {}

      console.log('Redirecting to ZohoPay:', paymentUrl);
      try { window.location.assign(paymentUrl); } catch { window.location.href = paymentUrl; }
      return { status: 1, paymentUrl };
    }
    
    console.error('No payment URL in response:', result);
    throw new Error('No payment URL returned');
  } catch (e) {
    console.error('ZohoPay initiation error:', e);
    try { window.location.assign('/payment-failure?reason=init_error'); } catch { window.location.href = '/payment-failure?reason=init_error'; }
    return { status: 0, error: String(e) };
  }
};

export default initiateZohoPay;



