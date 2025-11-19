// @ts-nocheck
// Generic payments utilities for PhonePe and other gateways

export interface NormalizedPaymentDetails {
  status: string;
  success: boolean;
  orderId?: string;
  txnId?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  bank_ref_num?: string;
  bankcode?: string;
  card_type?: string;
  payment_source?: string;
  PG_TYPE?: string;
  upi_va?: string;
  easepayid?: string;
  addedon?: string;
  raw?: Record<string, string>;
}

export const formatAmount = (n: number): string => {
  if (!isFinite(n)) n = 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const parsePaymentParams = (searchParams: URLSearchParams): NormalizedPaymentDetails => {
  const get = (k: string) => searchParams.get(k) || '';
  // Try common param names across gateways
  const status = (get('status') || get('code') || get('result') || '').toString();
  const orderId = get('merchantOrderId') || get('merchantTransactionId') || get('orderId') || get('order_id') || get('txnid') || '';
  const txnId = get('transactionId') || get('txnId') || get('txnid') || get('paymentId') || '';
  let amount = get('amount') || get('total') || '';
  // If PhonePe sends amount in paise (numeric without dot) normalize to rupees for display
  if (amount && /^[0-9]+$/.test(amount) && amount.length >= 3) {
    const n = Number(amount);
    if (Number.isFinite(n) && n > 100 && n % 1 === 0) {
      amount = (n / 100).toString();
    }
  }
  const firstname = get('firstname') || get('name') || '';
  const email = get('email') || '';
  const phone = get('phone') || get('mobile') || '';
  const productinfo = get('productinfo') || get('product') || '';

  const bank_ref_num = get('bank_ref_num') || get('bankReference') || '';
  const bankcode = get('bankcode') || '';
  const card_type = get('card_type') || '';
  const payment_source = get('payment_source') || '';
  const PG_TYPE = get('PG_TYPE') || get('paymentMethod') || '';
  const upi_va = get('upi_va') || get('vpa') || '';
  const easepayid = get('easepayid') || get('gatewayPaymentId') || '';
  const addedon = get('addedon') || get('createdAt') || '';

  const normalized: NormalizedPaymentDetails = {
    status,
    success: getPaymentStatus({ status }).success,
    orderId: orderId || undefined,
    txnId: txnId || undefined,
    amount: amount || undefined,
    productinfo: productinfo || undefined,
    firstname: firstname || undefined,
    email: email || undefined,
    phone: phone || undefined,
    bank_ref_num: bank_ref_num || undefined,
    bankcode: bankcode || undefined,
    card_type: card_type || undefined,
    payment_source: payment_source || undefined,
    PG_TYPE: PG_TYPE || undefined,
    upi_va: upi_va || undefined,
    easepayid: easepayid || undefined,
    addedon: addedon || undefined,
    raw: Object.fromEntries(searchParams.entries())
  };

  return normalized;
};

export const getPaymentStatus = (details: { status?: string } | NormalizedPaymentDetails): { success: boolean } => {
  const status = (details?.status || '').toString().toLowerCase();
  // Treat common success indicators
  const success = ['success', 'captured', 'completed', 'ok', 'payment_success'].some(s => status.includes(s));
  return { success };
};


