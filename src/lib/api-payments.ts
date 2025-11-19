/**
 * Payment Gateway API Client
 * Handles Easebuzz, ZohoPay, and other payment gateways via Python backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE?.replace('/api', '') || import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface EasebuzzInitiateRequest {
  order_id: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_info?: string;
  success_url?: string;
  failure_url?: string;
}

export interface ZohoPayInitiateRequest {
  order_id: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_info?: string;
  callback_url?: string;
  failure_url?: string;
  currency?: string;
}

export interface PaymentStatusResponse {
  order_id: string;
  gateway: string;
  status: string;
  payment_status: string;
  transaction_id?: string;
  amount?: number;
}

/**
 * Initiate Easebuzz payment via Python backend
 */
export async function initiateEasebuzzPayment(
  data: EasebuzzInitiateRequest
): Promise<{ status: number; payment_url?: string; redirectUrl?: string; txnid?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/easebuzz/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: data.order_id,
        amount: data.amount,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        product_info: data.product_info || 'Order Payment',
        success_url: data.success_url || `${window.location.origin}/payment-success?orderId=${data.order_id}`,
        failure_url: data.failure_url || `${window.location.origin}/payment-failure?orderId=${data.order_id}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Payment initiation failed' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 1 && result.payment_url) {
      return {
        status: 1,
        payment_url: result.payment_url,
        redirectUrl: result.payment_url,
        txnid: result.txnid,
      };
    }

    throw new Error(result.message || 'Payment initiation failed');
  } catch (error) {
    console.error('Easebuzz payment initiation error:', error);
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}

/**
 * Initiate ZohoPay payment via Python backend
 */
export async function initiateZohoPayPayment(
  data: ZohoPayInitiateRequest
): Promise<{ status: number; payments_session_id?: string; paymentUrl?: string; redirectUrl?: string; session_id?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/zohopay/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: data.order_id,
        amount: data.amount,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        product_info: data.product_info || 'Order Payment',
        callback_url: data.callback_url || `${window.location.origin}/payment-success?orderId=${data.order_id}`,
        failure_url: data.failure_url || `${window.location.origin}/payment-failure?orderId=${data.order_id}`,
        currency: data.currency || 'INR',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Payment initiation failed' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const result = await response.json();

    // ZohoPay widget integration returns payments_session_id (not paymentUrl)
    // Reference: https://www.zoho.com/in/payments/api/v1/widget/#integrate-widget
    if (result.status === 1 && result.payments_session_id) {
      return {
        status: 1,
        payments_session_id: result.payments_session_id,
        session_id: result.payments_session_id,  // For backward compatibility
        paymentUrl: undefined,  // Widget doesn't use paymentUrl
        redirectUrl: undefined,  // Widget doesn't use redirectUrl
      };
    }

    // If no payments_session_id, return error
    const errorMsg = result.detail || result.message || result.error || 'Payment initiation failed';
    throw new Error(errorMsg);
  } catch (error) {
    console.error('ZohoPay payment initiation error:', error);
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}

/**
 * Get payment status for an order
 */
export async function getPaymentStatus(
  orderId: string,
  gateway: 'easebuzz' | 'zohopay' = 'easebuzz'
): Promise<PaymentStatusResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/${gateway}/status/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error getting ${gateway} payment status:`, error);
    return null;
  }
}

/**
 * Create WebSocket connection for real-time payment status
 */
export function createPaymentStatusWebSocket(
  orderId: string,
  onMessage: (data: any) => void,
  onError?: (error: Event) => void,
  onClose?: () => void
): WebSocket | null {
  try {
    const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsUrl}/api/ws/payment-status/${orderId}`);

    ws.onopen = () => {
      console.log('Payment status WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Payment status WebSocket error:', error);
      if (onError) onError(error);
    };

    ws.onclose = () => {
      console.log('Payment status WebSocket closed');
      if (onClose) onClose();
    };

    return ws;
  } catch (error) {
    console.error('Error creating WebSocket:', error);
    return null;
  }
}

/**
 * Poll payment status (alternative to WebSocket)
 */
export async function pollPaymentStatus(
  orderId: string,
  gateway: 'easebuzz' | 'zohopay' = 'easebuzz',
  interval: number = 3000,
  maxAttempts: number = 20
): Promise<PaymentStatusResponse | null> {
  return new Promise((resolve) => {
    let attempts = 0;

    const poll = async () => {
      attempts++;
      const status = await getPaymentStatus(orderId, gateway);

      if (status && (status.payment_status === 'paid' || status.payment_status === 'failed')) {
        resolve(status);
        return;
      }

      if (attempts >= maxAttempts) {
        resolve(status);
        return;
      }

      setTimeout(poll, interval);
    };

    poll();
  });
}

