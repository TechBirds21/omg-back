// @ts-nocheck
// Easebuzz Payment Gateway Integration
import { supabase } from '@/integrations/supabase/client';

export interface EasebuzzPaymentData {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productInfo: string;
  orderId: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  successUrl?: string;
  failureUrl?: string;
}

export interface EasebuzzConfig {
  merchantKey: string;
  salt: string;
  env: 'test' | 'prod';
  successUrl: string;
  failureUrl: string;
}

// Validation function for payment amount
export const validatePaymentAmount = (amount: number): { valid: boolean; message: string } => {
  if (!amount || amount <= 0) {
    return { valid: false, message: 'Amount must be greater than 0' };
  }
  if (amount < 1) {
    return { valid: false, message: 'Minimum amount is ₹1' };
  }
  if (amount > 500000) {
    return { valid: false, message: 'Maximum amount is ₹5,00,000' };
  }
  return { valid: true, message: 'Valid amount' };
};

// Prepare payment data for Easebuzz
export const preparePaymentData = (data: EasebuzzPaymentData): EasebuzzPaymentData => {
  const cleanOrderId = (data.orderId || '').toString().split('_')[0];
  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const successUrl = data.successUrl || (defaultOrigin ? `${defaultOrigin}/payment-success` : undefined);
  const failureUrl = data.failureUrl || (defaultOrigin ? `${defaultOrigin}/payment-failure` : undefined);
  return {
    amount: Number(data.amount),
    customerName: data.customerName || 'Customer',
    customerEmail: data.customerEmail || '',
    customerPhone: data.customerPhone || '',
    productInfo: data.productInfo || 'Order Payment',
    orderId: cleanOrderId,
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    pincode: data.pincode || '',
    successUrl,
    failureUrl
  };
};

// Generate unique transaction ID for Easebuzz
export const generateTransactionId = (orderId: string): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${orderId}_${timestamp}_${randomSuffix}`;
};

// Persist last Easebuzz payment attempt in session storage for success page fallback
const persistEasebuzzSession = (details: {
  orderId?: string;
  amount?: number | string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productInfo?: string;
  txnid?: string;
  udf2?: string;
  source?: string;
  status?: string;
  mode?: string;
  bank_ref_num?: string;
}) => {
  if (typeof window === 'undefined') return;
  try {
    const normalizedAmount = (() => {
      const amt = Number(details.amount);
      return isNaN(amt) ? '' : amt.toFixed(2);
    })();

    if (details.orderId) {
      const snapshot = {
        orderId: details.orderId || '',
        amount: normalizedAmount,
        customerName: details.customerName || '',
        customerEmail: details.customerEmail || '',
        customerPhone: details.customerPhone || '',
        productInfo: details.productInfo || 'Order Payment',
        gateway: 'easebuzz',
        txnid: details.txnid || '',
        udf2: details.udf2 || details.orderId || '',
        source: details.source || 'easebuzz',
        status: details.status || '',
        mode: details.mode || '',
        bank_ref_num: details.bank_ref_num || '',
        timestamp: Date.now()
      };

      sessionStorage.setItem('easebuzz_last_payment', JSON.stringify(snapshot));
      debugEasebuzz('Stored Easebuzz session snapshot', snapshot);
      const minimal = {
        orderId: snapshot.orderId,
        amount: snapshot.amount,
        customerName: snapshot.customerName,
        customerEmail: snapshot.customerEmail,
        customerPhone: snapshot.customerPhone,
        productInfo: snapshot.productInfo
      };
      sessionStorage.setItem('pp_last_order', JSON.stringify(minimal));
      debugEasebuzz('Updated pp_last_order snapshot for fallback', minimal);
    }
  } catch {
    // Ignore storage errors (e.g., Safari private mode)
  }
};

const easebuzzDebugEnabled = Boolean(
  (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) ||
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_ENABLE_EASEBUZZ_DEBUG === 'true')
);

const debugEasebuzz = (...args: any[]) => {
  if (!easebuzzDebugEnabled || typeof console === 'undefined') return;
  try {
    console.debug('[Easebuzz]', ...args);
  } catch {
    // no-op
  }
};

// Generate hash for Easebuzz payment
const generateHash = async (data: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-512', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Get Easebuzz configuration from database
const getEasebuzzConfig = async (): Promise<EasebuzzConfig | null> => {
  try {
    // Use backend API instead of direct Supabase call
    const { fetchPaymentConfigs } = await import('./api-admin');
    const configs = await fetchPaymentConfigs();
    const easebuzzConfig = configs.find(
      config => config.payment_method === 'easebuzz' && config.is_enabled
    );

    if (!easebuzzConfig) {
      return null;
    }

    const config = easebuzzConfig.configuration as any;
    const encryptedKeys = easebuzzConfig.encrypted_keys as any;

    return {
      merchantKey: encryptedKeys?.merchant_key || config?.merchant_key || '',
      salt: encryptedKeys?.salt || config?.salt || '',
      env: config?.environment || 'test',
      successUrl: `${window.location.origin}/payment-success`,
      failureUrl: `${window.location.origin}/payment-failure`
    };
  } catch (error) {
    console.error('Error fetching Easebuzz config:', error);
    return null;
  }
};

// Initiate Easebuzz payment
export const initiateEasebuzzPayment = async (paymentData: EasebuzzPaymentData): Promise<any> => {
  try {

    // Validate payment data
    const validation = validatePaymentAmount(paymentData.amount);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Try to get config from database first
    const config = await getEasebuzzConfig();
    
    if (config && config.merchantKey && config.salt) {
      try {
        return await initiateDirectPayment(paymentData, config);
      } catch (directError) {
        debugEasebuzz('Direct Easebuzz initiation failed, falling back to edge function', directError);
        return await initiateViaEdgeFunction(paymentData);
      }
    } else {
      return await initiateViaEdgeFunction(paymentData);
    }
  } catch (error) {
    throw error;
  }
};

// Direct payment initiation with database config
const initiateDirectPayment = async (paymentData: EasebuzzPaymentData, config: EasebuzzConfig): Promise<any> => {
  try {
    // Generate unique transaction ID
    const txnid = generateTransactionId(paymentData.orderId);

    debugEasebuzz('Initiating Easebuzz direct payment with config', {
      environment: config.env,
      orderId: paymentData.orderId,
      amount: paymentData.amount
    });

    // Prepare UDFs (10 fields as required by Easebuzz)
    const udf1 = ''; // Reserved for future use
    const udf2 = paymentData.orderId; // Clean order ID for webhook processing
    const udf3 = Date.now().toString(); // Timestamp for debugging
    const udf4 = '';
    const udf5 = '';
    const udf6 = '';
    const udf7 = '';
    const udf8 = '';
    const udf9 = '';
    const udf10 = '';

    // Generate hash using Easebuzz format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = [
      config.merchantKey,
      txnid,
      paymentData.amount.toFixed(2),
      paymentData.productInfo,
      paymentData.customerName,
      paymentData.customerEmail,
      udf1, udf2, udf3, udf4, udf5, udf6, udf7, udf8, udf9, udf10,
      config.salt
    ].join('|');


    // Generate hash
    const hash = await generateHash(hashString, '');

    // Prepare form data
    const formData = {
      key: config.merchantKey,
      txnid: txnid,
      amount: paymentData.amount.toFixed(2),
      productinfo: paymentData.productInfo,
      firstname: paymentData.customerName,
      email: paymentData.customerEmail,
      phone: paymentData.customerPhone,
      surl: paymentData.successUrl || config.successUrl,
      furl: paymentData.failureUrl || config.failureUrl,
      hash: hash,
      // UDF fields (required by Easebuzz)
      udf1: udf1,
      udf2: udf2,
      udf3: udf3,
      udf4: udf4,
      udf5: udf5,
      udf6: udf6,
      udf7: udf7,
      udf8: udf8,
      udf9: udf9,
      udf10: udf10,
      address1: paymentData.address || '',
      city: paymentData.city || '',
      state: paymentData.state || '',
      zipcode: paymentData.pincode || '',
      country: 'India'
    };

    // Persist snapshot so success page can recover order ID even if query params missing
    persistEasebuzzSession({
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      customerName: paymentData.customerName,
      customerEmail: paymentData.customerEmail,
      customerPhone: paymentData.customerPhone,
      productInfo: paymentData.productInfo,
      txnid,
      udf2: paymentData.orderId,
      source: 'easebuzz-direct'
    });

    // Create and submit form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = config.env === 'prod' 
      ? 'https://pay.easebuzz.in/payment/initiateLink'
      : 'https://testpay.easebuzz.in/payment/initiateLink';

    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    debugEasebuzz('Submitting Easebuzz direct form', { action: form.action, formData });
    form.submit();

    return { success: true, message: 'Redirecting to Easebuzz...' };
  } catch (error) {
    debugEasebuzz('Easebuzz direct initiation failed', { error });
    throw error;
  }
};

// Payment initiation via Python backend API
const initiateViaEdgeFunction = async (paymentData: EasebuzzPaymentData): Promise<any> => {
  try {
    // Use Python backend API instead of Supabase Edge Function
    const { initiateEasebuzzPayment } = await import('./api-payments');
    
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    
    const result = await initiateEasebuzzPayment({
      order_id: paymentData.orderId,
      amount: paymentData.amount,
      customer_name: paymentData.customerName,
      customer_email: paymentData.customerEmail,
      customer_phone: paymentData.customerPhone,
      product_info: paymentData.productInfo,
      success_url: paymentData.successUrl || (origin ? `${origin}/payment-success?orderId=${paymentData.orderId}` : undefined),
      failure_url: paymentData.failureUrl || (origin ? `${origin}/payment-failure?orderId=${paymentData.orderId}` : undefined),
    });

    debugEasebuzz('Python backend Easebuzz API returned', result);
    
    if (result.status === 1 && result.payment_url) {
      // Persist snapshot before redirect
      persistEasebuzzSession({
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        customerPhone: paymentData.customerPhone,
        productInfo: paymentData.productInfo,
        txnid: result.txnid || '',
        udf2: paymentData.orderId,
        source: 'easebuzz-python-api'
      });
      // Redirect to payment URL
      debugEasebuzz('Redirecting to easebuzz payment URL from Python API', { payment_url: result.payment_url });
      window.location.href = result.payment_url;
      return result;
    } else {
      debugEasebuzz('Python API indicated failure', result);
      throw new Error(result.error || 'Payment initiation failed');
    }
  } catch (error) {
    debugEasebuzz('Python API initiation threw error', { error });
    throw error;
  }
};
