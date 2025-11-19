import { supabase } from '@/integrations/supabase/client';
import { getPaymentGatewayKeys } from '@/lib/supabase';

export interface PhonePePaymentData {
  amount: number;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productInfo?: string;
}

/**
 * Initiate PhonePe payment by calling server-side function which performs signing/creation
 * of PhonePe transaction. The server should return a payment_url to redirect the user to.
 */
export const initiatePhonePePayment = async (paymentData: PhonePePaymentData) => {
  // Basic validation
  const amount = Number(paymentData.amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

  // Get PhonePe credentials from database
  let phonepeKeys = null;
  try {
    // For now, use a default admin password to get keys
    // In production, this should be handled differently
    phonepeKeys = await getPaymentGatewayKeys('phonepe', 'Omaguva@8342');
  } catch (error) {
    
  }

  // Prepare body for server
  const body = {
    amount: amount.toFixed(2),
    orderId: paymentData.orderId || `ORD_${Date.now()}`,
    customerName: paymentData.customerName || '',
    customerEmail: paymentData.customerEmail || '',
    customerPhone: paymentData.customerPhone || '',
    productInfo: paymentData.productInfo || '',
    // Include credentials if available
    ...(phonepeKeys && {
      clientId: phonepeKeys.clientId,
      clientSecret: phonepeKeys.clientSecret,
      environment: phonepeKeys.environment
    })
  };

  // Persist minimal order context BEFORE calling server so failure page can show details
  try {
    const last = {
      orderId: body.orderId,
      amount: body.amount,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      productInfo: body.productInfo
    };
    sessionStorage.setItem('pp_last_order', JSON.stringify(last));
  } catch {}

  // Call Supabase edge function 'phonepe-init'
  let data: any | null = null;
  try {
    const resp = await supabase.functions.invoke('phonepe-init', { body });
    data = resp.data;
    if (resp.error) throw resp.error;
  } catch (err) {
    // Navigate to payment failure page on init error
    try { window.location.assign('/payment-failure?reason=init_error'); } catch { window.location.href = '/payment-failure?reason=init_error'; }
    return { status: 0, error: String(err) } as any;
  }

  // Normalize data in case it's a JSON string
  const resp: any = typeof data === 'string' ? (() => { try { return JSON.parse(data); } catch { return {}; } })() : (data || {});

  // Persist raw init response for diagnostics on failure page
  try { sessionStorage.setItem('pp_init_resp', JSON.stringify(resp)); } catch {}

  // Treat presence of paymentUrl or redirectUrl in multiple shapes as success
  const paymentUrl = (() => {
    const c: any = resp || {};
    const rb: any = c.remoteBody || {};
    const d: any = c.data || {};
    const di: any = (d.instrumentResponse || {}).redirectInfo || {};
    const rbd: any = rb.data || {};
    const rbi: any = (rbd.instrumentResponse || {}).redirectInfo || {};
    return (
      c.paymentUrl ||
      c.redirect_url ||
      c.redirectUrl ||
      d.redirectUrl ||
      d.redirect_url ||
      di.url ||
      rb.redirectUrl ||
      rb.redirect_url ||
      rbd.redirectUrl ||
      rbd.redirect_url ||
      rbi.url ||
      (c.fallbackV1 && c.fallbackV1.paymentUrl) ||
      null
    );
  })();
  if (paymentUrl) {
    // Redirect user to PhonePe payment page (or open in new tab)
    try {
      // Persist minimal order context for PaymentSuccess fallback
      try {
        const last = {
          orderId: body.orderId,
          amount: body.amount,
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          customerPhone: body.customerPhone,
          productInfo: body.productInfo
        };
        sessionStorage.setItem('pp_last_order', JSON.stringify(last));
      } catch {}
      window.location.assign(paymentUrl);
    } catch {
      try {
        const win = window.open(paymentUrl, '_self');
        if (!win) window.location.href = paymentUrl;
      } catch {
        window.location.href = paymentUrl;
      }
    }
    return { status: 1, paymentUrl, raw: resp };
  }

  // If PhonePe rejected due to INVALID_TRANSACTION_ID, retry ONCE with a fresh orderId suffix
  try {
    const code = resp?.remoteBody?.code || resp?.remoteBody?.message || '';
    const status = Number(resp?.remoteStatus || 0);
    const looksInvalidId = status === 417 || String(code).toUpperCase().includes('INVALID_TRANSACTION_ID');
    if (looksInvalidId) {
      const retryBody = { ...body, orderId: `${body.orderId}_${Date.now()}` };
      const retry = await supabase.functions.invoke('phonepe-init', { body: retryBody });
      const rdata: any = typeof retry.data === 'string' ? (() => { try { return JSON.parse(retry.data as any); } catch { return {}; } })() : (retry.data || {});
      try { sessionStorage.setItem('pp_init_resp', JSON.stringify(rdata)); } catch {}
      const c: any = rdata || {};
      const rb: any = c.remoteBody || {};
      const d: any = c.data || {};
      const di: any = (d.instrumentResponse || {}).redirectInfo || {};
      const rbd: any = rb.data || {};
      const rbi: any = (rbd.instrumentResponse || {}).redirectInfo || {};
      const retryUrl = (
        c.paymentUrl || c.redirectUrl || c.redirect_url ||
        d.redirectUrl || d.redirect_url || di.url ||
        rb.redirectUrl || rb.redirect_url || rbd.redirectUrl || rbd.redirect_url || rbi.url ||
        (c.fallbackV1 && c.fallbackV1.paymentUrl) || null
      );
      if (retryUrl) {
        window.location.assign(retryUrl);
        return { status: 1, paymentUrl: retryUrl, raw: rdata } as any;
      }
    }
  } catch {}

  // If no paymentUrl, navigate to failure but keep last order snapshot for display
  try { window.location.assign('/payment-failure?reason=no_url'); } catch { window.location.href = '/payment-failure?reason=no_url'; }
  return { status: 0, error: 'No payment URL returned' } as any;
  // Unreachable
};

export const generatePhonePeOrderId = (): string => {
  return `PP_${Date.now()}_${Math.random().toString(36).slice(2,8).toUpperCase()}`;
};

export default initiatePhonePePayment;

// Helper: fetch PhonePe order status via edge function
export async function fetchPhonePeOrderStatus(merchantOrderId: string, details: boolean = false): Promise<any> {
  try {
    const { data, error } = await (supabase as any).functions.invoke('phonepe-status', {
      body: { merchantOrderId, details }
    });
    if (error) throw error;
    return data;
  } catch (e) {
    return { status: 0, error: String(e) };
  }
}

// PhonePe Audit Status API - for reconciliation and batch status checking
export async function fetchPhonePeAuditStatus(fromDate: string, toDate: string, merchantOrderId?: string): Promise<any> {
  try {
    const { data, error } = await (supabase as any).functions.invoke('phonepe-audit', {
      body: { 
        fromDate, // Format: YYYY-MM-DD
        toDate,   // Format: YYYY-MM-DD
        merchantOrderId 
      }
    });
    if (error) throw error;
    return data;
  } catch (e) {
    return { status: 0, error: String(e) };
  }
}
