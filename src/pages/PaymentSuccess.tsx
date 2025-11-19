// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Package, 
  CreditCard, 
  User,
  Mail,
  Phone,
  Download,
  Share2,
  Truck
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getPaymentStatus, formatAmount, parsePaymentParams } from '@/lib/payments';
import { updateOrderPaymentStatus, sendOrderConfirmationEmail, getOrderByOrderId, createVendorSplitOrders } from '@/lib/api-storefront';
import { fetchPhonePeOrderStatus } from '@/lib/phonepe-api';
import { useCart } from '@/components/CartProvider';
import { downloadInvoice, type InvoiceData } from '@/lib/invoice';
import { sendInvoiceEmail, isEmailConfigured } from '@/lib/emailInvoice';
import { generateInvoiceFromPaymentResponse, generateInvoiceFromOrder, imageUrlToDataUrl } from '@/lib/invoiceUtils';
import { useToast } from '@/hooks/use-toast';
import { CircularCountdownTimer } from '@/components/CircularCountdownTimer';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [verifying, setVerifying] = useState(true);
  const [orderUpdated, setOrderUpdated] = useState(false);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<InvoiceData | null>(null);
  const [orderItems, setOrderItems] = useState<Array<{ name: string; image?: string | null; qty?: number; size?: string; color?: string }>>([]);
  const [showCountdown, setShowCountdown] = useState(true);
  const [paymentStatusChecked, setPaymentStatusChecked] = useState(false);
  const { toast } = useToast();

  const easebuzzDebugEnabled = Boolean(
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_EASEBUZZ_DEBUG === 'true'
  );
  const skipSupabaseSync = Boolean(
    import.meta.env.VITE_SKIP_SUPABASE_SYNC === 'true' || import.meta.env.DEV
  );

  const debugEasebuzz = (...args: any[]) => {
    if (!easebuzzDebugEnabled) return;
    try {
      console.debug('[Easebuzz]', ...args);
    } catch {
      // no-op
    }
  };

  // Handle countdown completion
  const handleCountdownComplete = () => {
    setShowCountdown(false);
    setVerifying(true);
    verifyPaymentStatus();
  };

  const syncOrderSnapshot = async (orderId: string) => {
    if (skipSupabaseSync) return;
    try {
      const order = await getOrderByOrderId(orderId);
      if (!order) return;

      const parsedAppliedOffer = (() => {
        try {
          if (!order.applied_offer) return null;
          return typeof order.applied_offer === 'string'
            ? JSON.parse(order.applied_offer)
            : order.applied_offer;
        } catch {
          return null;
        }
      })();

      setPaymentDetails(prev => {
        if (!prev) return prev;
        const resolvedAmount = prev.amount || (order.amount ? Number(order.amount).toFixed(2) : undefined);
        return {
          ...prev,
          transactionId: order.transaction_id || prev.transactionId,
          amount: resolvedAmount || prev.amount,
          orderTotal: order.amount || prev.orderTotal
        };
      });

      if (parsedAppliedOffer?.items && (!orderItems || orderItems.length === 0)) {
        const normalizedItems = parsedAppliedOffer.items.map((item: any) => ({
          name: item.name,
          image: item.image,
          qty: item.quantity || item.qty || 1,
          sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
          colors: Array.isArray(item.colors) ? item.colors : (item.color ? [item.color] : [])
        }));
        setOrderItems(normalizedItems);
      }
    } catch (error) {
      debugEasebuzz('Failed to sync order snapshot', error);
    }
  };

  // Verify payment status for both PhonePe and Easebuzz
  const verifyPaymentStatus = async () => {
    if (paymentStatusChecked) return;
    setPaymentStatusChecked(true);

    try {
      const easebuzzSession = (() => {
        if (typeof window === 'undefined') return null;
        try {
          const raw = sessionStorage.getItem('easebuzz_last_payment');
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          debugEasebuzz('Loaded easebuzz session snapshot', parsed);
          return parsed;
        } catch {
          return null;
        }
      })();
      const phonepeSession = (() => {
        if (typeof window === 'undefined') return null;
        try {
          const raw = sessionStorage.getItem('pp_last_order');
          if (!raw) return null;
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })();
      const cartSnapshot = (() => {
        if (typeof window === 'undefined') return [];
        try {
          const raw = sessionStorage.getItem('pp_cart_items');
          if (!raw) return [];
          return JSON.parse(raw);
        } catch {
          return [];
        }
      })();
      const zohoSession = (() => {
        if (typeof window === 'undefined') return null;
        try {
          const raw = sessionStorage.getItem('zp_last_order');
          if (!raw) return null;
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })();

      // Extract order details from URL params
      let response = parsePaymentParams(searchParams);
      
      // Detect payment gateway based on URL parameters
      const isEasebuzzFromParams = searchParams.get('txnid') || searchParams.get('mihpayid') || searchParams.get('status');
      const isEasebuzzFromSession = easebuzzSession?.gateway === 'easebuzz';
      const isEasebuzz = isEasebuzzFromParams || isEasebuzzFromSession;
      const phonePeIndicator = searchParams.get('merchantOrderId') || searchParams.get('transactionId') || searchParams.get('state');
      const zohoIndicator = searchParams.get('payment_id') || searchParams.get('payments_session_id') || searchParams.get('reference_id');
      const isPhonePe = Boolean(phonePeIndicator || phonepeSession);
      const isZohoPay = Boolean(zohoIndicator || zohoSession);
      debugEasebuzz('Detected payment gateway on success page', {
        isEasebuzzFromParams: Boolean(isEasebuzzFromParams),
        isEasebuzzFromSession,
        isEasebuzz,
        isPhonePe: Boolean(isPhonePe),
        isZohoPay: Boolean(isZohoPay),
        skipSupabaseSync
      });
      
      // Get order ID from various possible sources
      let orderId = response.orderId || searchParams.get('orderId') || easebuzzSession?.orderId || phonepeSession?.orderId || zohoSession?.orderId;
      
      // Handle different payment gateways
      if (isEasebuzz && !orderId) {
        // For Easebuzz: prioritize udf2 (clean order ID), then extract from txnid
        const udf2Val = searchParams.get('udf2') || easebuzzSession?.udf2 || easebuzzSession?.orderId;
        const txnidVal = searchParams.get('txnid') || easebuzzSession?.txnid;
        
        if (udf2Val) {
          // udf2 should contain clean order ID (strip any suffix like _timestamp)
          orderId = udf2Val.includes('_') ? udf2Val.split('_')[0] : udf2Val;
          
        } else if (txnidVal) {
          // Fallback: extract order ID from txnid (everything before the first underscore)
          orderId = txnidVal.split('_')[0];
          
        }
      } else if (isPhonePe && !orderId) {
        // For PhonePe: use udf2 or merchantOrderId directly
        orderId = searchParams.get('udf2') || searchParams.get('merchantOrderId') || phonepeSession?.orderId || '';
        
      }
      
      // Fallback to txnid if no order ID found
      if (!orderId) {
        orderId = searchParams.get('txnid') || easebuzzSession?.txnid || '';
      }

      // Normalize to clean order id (strip any _<digits> suffixes)
      const cleanOrderId = (orderId || '').toString().replace(/(_\d+)+$/, '');
      orderId = cleanOrderId;
      
      if (!orderId) {
        // Try to get from session storage
        try {
          const snap = sessionStorage.getItem('pp_last_order');
          if (snap) {
            const last = JSON.parse(snap);
            orderId = last?.orderId;
            debugEasebuzz('Recovered order ID from pp_last_order snapshot', { orderId });
          }
        } catch {}
      }

      if (!orderId) {
        debugEasebuzz('Unable to resolve order ID on payment-success page', {
          response,
          searchParams: Object.fromEntries(searchParams.entries()),
          easebuzzSession
        });
        toast({
          title: "Error",
          description: "Order ID not found. Please contact support.",
          variant: "destructive"
        });
        navigate('/payment-failure?reason=missing_order_id');
        return;
      }

      

      // Clean the URL (remove sensitive query params) after reading them
      try {
        if (window?.history?.replaceState && window.location.search) {
          window.history.replaceState({}, '', '/payment-success');
        }
      } catch {}

      // Handle Easebuzz payment verification
      if (isEasebuzz) {
        const easebuzzStatusParam = searchParams.get('status');
        let easebuzzStatus = easebuzzStatusParam || easebuzzSession?.status || '';
        const primaryTransactionId = searchParams.get('mihpayid') || searchParams.get('txnid') || easebuzzSession?.transactionId || easebuzzSession?.txnid;
        const amount = searchParams.get('amount') || easebuzzSession?.amount;
        const mode = searchParams.get('mode') || easebuzzSession?.mode;
        const bankRefNum = searchParams.get('bank_ref_num') || easebuzzSession?.bank_ref_num;

        const spUdf2 = searchParams.get('udf2') || easebuzzSession?.udf2 || easebuzzSession?.orderId;
        const spTxnid = searchParams.get('txnid') || easebuzzSession?.txnid;

        // Get transaction ID from URL params (this might be different from what's stored in DB)
        const urlTransactionId = primaryTransactionId || spTxnid || bankRefNum || easebuzzSession?.transactionId || easebuzzSession?.txnid;

        let preFetchedOrder: any = null;
        if (!easebuzzStatus && orderId && !skipSupabaseSync) {
          try {
            preFetchedOrder = await getOrderByOrderId(orderId);
            const statusLabel = String(preFetchedOrder?.payment_status || '').toLowerCase();
            const orderStatusLabel = String(preFetchedOrder?.status || '').toLowerCase();
            if (['paid', 'confirmed', 'completed'].includes(statusLabel) || ['confirmed', 'processing'].includes(orderStatusLabel)) {
              easebuzzStatus = 'success';
            }
            debugEasebuzz('Fetched order record for verification', { orderId, statusLabel, orderStatusLabel });
          } catch {
            // Ignore lookup failure; we'll treat as pending until webhook updates
          }
        }
        if (!easebuzzStatus && isEasebuzzFromSession) {
          easebuzzStatus = 'success';
        }
        debugEasebuzz('Easebuzz verification data', {
          easebuzzStatusParam,
          easebuzzStatusDerived: easebuzzStatus,
          primaryTransactionId,
          spTxnid,
          bankRefNum,
          amount,
          spUdf2,
          easebuzzSession
        });

        const paymentData = {
          status: easebuzzStatus,
          transactionId: urlTransactionId || spTxnid || easebuzzSession?.transactionId || easebuzzSession?.txnid || bankRefNum,
          amount,
          mode,
          bankRefNum,
          orderId: orderId,
          txnid: spTxnid,
          udf2: spUdf2,
          extractedFrom: spUdf2 ? 'udf2 (clean)' : spTxnid ? 'txnid (extracted)' : 'unknown',
          source: isEasebuzzFromParams ? 'url_params' : 'session_cache'
        };

        if (easebuzzStatus === 'success') {
          // Easebuzz payment successful
          const successDetails = {
            success: true,
            transactionId: urlTransactionId || spTxnid || easebuzzSession?.transactionId || easebuzzSession?.txnid || bankRefNum,
            orderId,
            gateway: 'easebuzz',
            amount: amount,
            mode: mode,
            bankRefNum: bankRefNum,
            udf2: orderId,
            txnid: spTxnid || easebuzzSession?.txnid || orderId,
            payment_source: 'easebuzz',
            // Note: The webhook will update with the actual stored transaction ID from database
            easebuzzResponse: {
              status: easebuzzStatus,
              txnid: urlTransactionId || spTxnid || easebuzzSession?.txnid || orderId,
              amount: amount,
              mode: mode,
              bank_ref_num: bankRefNum,
              udf2: spUdf2 // Clean order ID from webhook
            }
          };

          setPaymentDetails(successDetails);
          debugEasebuzz('Easebuzz success resolved on payment-success page', successDetails);

          // Update order in database
          if (!skipSupabaseSync) {
            try {
              await updateOrderPaymentStatus(orderId, 'paid', successDetails);
              setOrderUpdated(true);

              // Send payment success notification
              try {
                const { sendPaymentNotification } = await import('@/lib/supabase');
                await sendPaymentNotification(
                  orderId,
                  'success',
                  successDetails.customerEmail || '',
                  parseFloat(amount || '0'),
                  'easebuzz'
                );
              } catch (notificationError) {
                console.warn('Failed to send payment notification:', notificationError);
              }

              toast({
                title: "Payment Confirmed",
                description: `Order ${orderId} payment has been confirmed via Easebuzz.`
              });
            } catch (error) {
              // Even if order update fails, mark as updated since payment was successful
              setOrderUpdated(true);

              toast({
                title: "Payment Confirmed",
                description: `Payment confirmed via Easebuzz. Order update may be delayed.`,
                variant: "default"
              });
            }
          } else {
            setOrderUpdated(true);
            toast({
              title: "Payment Confirmed",
              description: `Payment recorded locally (Supabase sync skipped in dev).`
            });
          }

          // Generate invoice from order (ensures full item details and images)
          if (!skipSupabaseSync) {
            try {
              
              const invoiceData = await generateInvoiceFromOrder(orderId);
              
              if (invoiceData) {
                setCurrentInvoiceData(invoiceData);
                setInvoiceGenerated(true);
                // Capture items for on-page summary
                const mapped = (invoiceData.items || []).map(it => ({
                  name: it.name,
                  image: it.image || undefined,
                  qty: (it as any).quantity || (it as any).qty || 1,
                  sizes: Array.isArray((it as any).sizes) ? (it as any).sizes : ((it as any).sizes ? [(it as any).sizes] : []),
                  colors: Array.isArray((it as any).colors) ? (it as any).colors : ((it as any).colors ? [(it as any).colors] : [])
                }));
                setOrderItems(mapped as any);
                
              } else {
                
              }
            } catch (invoiceError) {
              
              // Don't show error to user, just log it
            }
          } else {
            const normalizedItems = (cartSnapshot || []).map((item: any) => ({
              name: item.name,
              image: item.image,
              qty: item.quantity || 1,
              sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
              colors: item.color ? [item.color] : []
            }));
            setOrderItems(normalizedItems);
            if (easebuzzSession) {
              setCurrentInvoiceData({
                orderId,
                customerName: easebuzzSession.customerName,
                customerEmail: easebuzzSession.customerEmail,
                customerPhone: easebuzzSession.customerPhone,
                items: (cartSnapshot || []).map((item: any) => ({
                  name: item.name,
                  image: item.image,
                  price: item.price,
                  total: (item.price || 0) * (item.quantity || 1),
                  quantity: item.quantity || 1,
                  sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
                  colors: item.color ? [item.color] : []
                })),
                subtotal: (cartSnapshot || []).reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0),
                total: parseFloat(amount || easebuzzSession.amount || '0')
              } as any);
            }
          }

          clearCart();

          try {
            sessionStorage.removeItem('easebuzz_last_payment');
          } catch {}
          try {
            sessionStorage.removeItem('pp_cart_items');
          } catch {}
          try {
            sessionStorage.removeItem('pp_last_order');
          } catch {}
          await syncOrderSnapshot(orderId);

        } else if (easebuzzStatus === 'failure' || easebuzzStatus === 'failed') {
          // Easebuzz payment failed
          debugEasebuzz('Easebuzz reported failure status on success page', paymentData);
          toast({
            title: "Payment Failed",
            description: `Payment for order ${orderId} failed via Easebuzz.`,
            variant: "destructive"
          });

          // Send payment failure notification
          try {
            const { sendPaymentNotification } = await import('@/lib/supabase');
            await sendPaymentNotification(
              orderId,
              'failed',
              successDetails?.customerEmail || '',
              parseFloat(amount || '0'),
              'easebuzz'
            );
          } catch (notificationError) {
            console.warn('Failed to send payment failure notification:', notificationError);
          }

          const q = new URLSearchParams();
          q.set('orderId', orderId);
          q.set('reason', 'gateway_failed');
          navigate(`/payment-failure?${q.toString()}`);
          return;

        } else {
          // Easebuzz payment pending
          debugEasebuzz('Easebuzz payment pending', paymentData);
          setPaymentDetails({
            success: false,
            pending: true,
            orderId,
            gateway: 'easebuzz',
            message: 'Payment is still processing. We will notify you once confirmed.'
          });
        }

      } else if (isPhonePe) {
        // Handle PhonePe payment verification (existing logic)
        const merchantOrderId = `${orderId}_${Date.now()}`;
        
        try {
          const phonepeStatus = await fetchPhonePeOrderStatus(merchantOrderId, true);
          

          const state = String(phonepeStatus?.state || '').toUpperCase();
          const transactionId = phonepeStatus?.transactionId || phonepeStatus?.paymentDetails?.[0]?.transactionId;
        const resolvedAmountNumber = (() => {
          const numeric = parseFloat(response.amount || phonepeSession?.amount || '0');
          if (!isNaN(numeric) && isFinite(numeric)) return numeric;
          const raw = phonepeStatus?.amount || phonepeStatus?.paymentDetails?.[0]?.amount || phonepeStatus?.totalAmount;
          const parsedRaw = parseFloat(raw || '0');
          if (!isNaN(parsedRaw) && isFinite(parsedRaw)) {
            return parsedRaw > 100 ? parsedRaw / 100 : parsedRaw;
          }
          return 0;
        })();
        const resolvedAmount = resolvedAmountNumber.toFixed(2);

          if (state === 'COMPLETED' || state === 'SUCCESS') {
            // Payment successful - update order status
            const successDetails = {
              success: true,
              transactionId,
              orderId,
              gateway: 'phonepe',
            phonepeResponse: phonepeStatus,
            amount: resolvedAmount
            };

            setPaymentDetails(successDetails);

          // Update order in database
          if (!skipSupabaseSync) {
            try {
              await updateOrderPaymentStatus(orderId, 'paid', successDetails);
              setOrderUpdated(true);
              
              toast({
                title: "Payment Confirmed",
                description: `Order ${orderId} payment has been confirmed via PhonePe.`
              });

              // Generate invoice from order (ensures full item details and images)
              const invoiceData = await generateInvoiceFromOrder(orderId);
              if (invoiceData) {
                setCurrentInvoiceData(invoiceData);
                setInvoiceGenerated(true);
                const mapped = (invoiceData.items || []).map(it => ({
                  name: it.name,
                  image: it.image || undefined,
                  qty: (it as any).quantity || (it as any).qty || 1,
                  sizes: Array.isArray((it as any).sizes) ? (it as any).sizes : ((it as any).sizes ? [(it as any).sizes] : []),
                  colors: Array.isArray((it as any).colors) ? (it as any).colors : ((it as any).colors ? [(it as any).colors] : [])
                }));
                setOrderItems(mapped as any);
              }

              clearCart();
              try { sessionStorage.removeItem('pp_cart_items'); } catch {}
              try { sessionStorage.removeItem('pp_last_order'); } catch {}
              
            } catch (error) {
              
              toast({
                title: "Warning",
                description: "Payment confirmed but order update failed. Please contact support.",
                variant: "destructive"
              });
            }
              await syncOrderSnapshot(orderId);
          } else {
            if (cartSnapshot && cartSnapshot.length > 0) {
              const normalizedItems = cartSnapshot.map((item: any) => ({
                name: item.name,
                image: item.image,
                qty: item.quantity || 1,
                sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
                colors: item.color ? [item.color] : []
              }));
              setOrderItems(normalizedItems);
              setCurrentInvoiceData({
                orderId,
                customerName: phonepeSession?.customerName,
                customerEmail: phonepeSession?.customerEmail,
                customerPhone: phonepeSession?.customerPhone,
                items: cartSnapshot.map((item: any) => ({
                  name: item.name,
                  image: item.image,
                  price: item.price,
                  total: (item.price || 0) * (item.quantity || 1),
                  quantity: item.quantity || 1,
                  sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
                  colors: item.color ? [item.color] : []
                })),
                subtotal: cartSnapshot.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0),
                total: resolvedAmountNumber
              } as any);
            }
            clearCart();
            try { sessionStorage.removeItem('pp_cart_items'); } catch {}
            try { sessionStorage.removeItem('pp_last_order'); } catch {}
          }

        } else if (state === 'FAILED' || state === 'DECLINED' || state === 'CANCELLED') {
          // Payment failed
          toast({
            title: "Payment Failed",
            description: `Payment for order ${orderId} was ${state.toLowerCase()}.`,
            variant: "destructive"
          });
          
          const q = new URLSearchParams();
          q.set('orderId', orderId);
          q.set('reason', 'gateway_failed');
          navigate(`/payment-failure?${q.toString()}`);
          return;

        } else {
          // Payment pending - show as pending
          setPaymentDetails({
            ...response,
            success: false,
            pending: true,
            orderId,
              gateway: 'phonepe',
            message: 'Payment is still processing. We will notify you once confirmed.'
          });
        }

      } catch (phonepeError) {
        
        
        // Fallback - check database order status
        if (!skipSupabaseSync) {
          try {
            const order = await getOrderByOrderId(orderId);
            if (order && order.payment_status === 'paid') {
              setPaymentDetails({
                ...response,
                success: true,
                orderId,
                gateway: 'phonepe',
                serverOrder: order,
                message: 'Payment confirmed from database records.'
              });
              setOrderUpdated(true);
            } else {
              setPaymentDetails({
                ...response,
                success: false,
                orderId,
                gateway: 'phonepe',
                message: 'Unable to verify payment status. Please contact support if payment was deducted.'
              });
            }
          } catch (dbError) {
            
            setPaymentDetails({
              ...response,
              success: false,
              orderId,
              gateway: 'phonepe',
              message: 'Payment verification failed. Please contact support.'
            });
          }
        } else {
          setPaymentDetails({
            ...response,
            success: true,
            orderId,
            gateway: 'phonepe',
            message: 'Payment recorded locally (Supabase sync skipped).',
            amount: resolvedAmount,
            transactionId: response.txnId || response.transactionId || phonepeSession?.transactionId || phonepeSession?.txnid
          });
          // Populate local invoice summary from cart snapshot
          if (cartSnapshot && cartSnapshot.length > 0) {
            const normalizedItems = cartSnapshot.map((item: any) => ({
              name: item.name,
              image: item.image,
              qty: item.quantity || 1,
              sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
              colors: item.color ? [item.color] : []
            }));
            setOrderItems(normalizedItems);
            setCurrentInvoiceData({
              orderId,
              customerName: phonepeSession?.customerName,
              customerEmail: phonepeSession?.customerEmail,
              customerPhone: phonepeSession?.customerPhone,
              items: cartSnapshot.map((item: any) => ({
                name: item.name,
                image: item.image,
                price: item.price,
                total: (item.price || 0) * (item.quantity || 1),
                quantity: item.quantity || 1,
                sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
                colors: item.color ? [item.color] : []
              })),
              subtotal: cartSnapshot.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0),
              total: resolvedAmountNumber
            } as any);
          }
          setOrderUpdated(true);
        }
      }
      } else if (isZohoPay) {
        const paymentId = searchParams.get('payment_id') || zohoSession?.payment_id || zohoSession?.paymentId || '';
        const sessionId = searchParams.get('payments_session_id') || searchParams.get('session_id') || zohoSession?.payments_session_id;
        const referenceId = searchParams.get('reference_id') || searchParams.get('order_id') || zohoSession?.reference_id || zohoSession?.orderId;
        const status = searchParams.get('status') || zohoSession?.status || '';
        const amountParam = searchParams.get('amount') || zohoSession?.amount;
        const amountNumber = (() => {
          if (!amountParam) return 0;
          const numeric = parseFloat(amountParam);
          if (isNaN(numeric)) return 0;
          return numeric > 100 && Number.isInteger(numeric) ? numeric / 100 : numeric;
        })();
        const amountFormatted = amountNumber ? amountNumber.toFixed(2) : undefined;

        if (!orderId) {
          orderId = referenceId || searchParams.get('orderId') || zohoSession?.orderId || (() => {
            try { return sessionStorage.getItem('zp_order_id') || ''; } catch { return ''; }
          })();
        }

        const paymentData = {
          status,
          paymentId,
          sessionId,
          referenceId,
          amount: amountFormatted,
          orderId,
          source: zohoSession ? 'session_cache' : 'url_params'
        };

        if (status === 'success' || status === 'paid' || status === 'completed') {
          const successDetails = {
            success: true,
            transactionId: paymentId,
            orderId,
            gateway: 'zohopay',
            amount: amountFormatted,
            payment_source: 'zohopay',
            zohoPayResponse: {
              payment_id: paymentId,
              payments_session_id: sessionId,
              reference_id: referenceId,
              status,
              amount: amountFormatted
            }
          };

          setPaymentDetails(successDetails);

          if (!skipSupabaseSync) {
            try {
              await updateOrderPaymentStatus(orderId, 'paid', successDetails);
              setOrderUpdated(true);

              try {
                const { sendPaymentNotification } = await import('@/lib/supabase');
                await sendPaymentNotification(
                  orderId,
                  'success',
                  successDetails.customerEmail || '',
                  amountNumber,
                  'zohopay'
                );
              } catch (notificationError) {
                console.warn('Failed to send payment notification:', notificationError);
              }

              toast({
                title: "Payment Confirmed",
                description: `Order ${orderId} payment has been confirmed via Zoho Pay.`
              });

              try {
                const invoiceData = await generateInvoiceFromOrder(orderId);
                if (invoiceData) {
                  setCurrentInvoiceData(invoiceData);
                  setInvoiceGenerated(true);
                  const mapped = (invoiceData.items || []).map(it => ({
                    name: it.name,
                    image: it.image || undefined,
                    qty: (it as any).quantity || (it as any).qty || 1,
                    sizes: Array.isArray((it as any).sizes) ? (it as any).sizes : ((it as any).sizes ? [(it as any).sizes] : []),
                    colors: Array.isArray((it as any).colors) ? (it as any).colors : ((it as any).colors ? [(it as any).colors] : [])
                  }));
                  setOrderItems(mapped as any);
                }
              } catch (invoiceError) {
                console.error('Invoice generation error:', invoiceError);
              }

              clearCart();
              try { sessionStorage.removeItem('zp_last_order'); } catch {}
              try { sessionStorage.removeItem('zp_order_id'); } catch {}
              await syncOrderSnapshot(orderId);
            } catch (error) {
              setOrderUpdated(true);
              toast({
                title: "Payment Confirmed",
                description: `Payment confirmed via Zoho Pay. Order update may be delayed.`,
                variant: "default"
              });
            }
          } else {
            const normalizedItems = (cartSnapshot || []).map((item: any) => ({
              name: item.name,
              image: item.image,
              qty: item.quantity || 1,
              sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
              colors: item.color ? [item.color] : []
            }));
            setOrderItems(normalizedItems);
            if (zohoSession) {
              setCurrentInvoiceData({
                orderId,
                customerName: zohoSession.customerName,
                customerEmail: zohoSession.customerEmail,
                customerPhone: zohoSession.customerPhone,
                items: (cartSnapshot || []).map((item: any) => ({
                  name: item.name,
                  image: item.image,
                  price: item.price,
                  total: (item.price || 0) * (item.quantity || 1),
                  quantity: item.quantity || 1,
                  sizes: Array.isArray(item.sizes) ? item.sizes : (item.size ? [item.size] : []),
                  colors: item.color ? [item.color] : []
                })),
                subtotal: (cartSnapshot || []).reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0),
                total: amountNumber
              } as any);
            }
            clearCart();
            try { sessionStorage.removeItem('zp_last_order'); } catch {}
            try { sessionStorage.removeItem('zp_order_id'); } catch {}
          }

        } else if (status === 'failed' || status === 'failure' || status === 'error') {
          toast({
            title: "Payment Failed",
            description: `Payment for order ${orderId} failed via Zoho Pay.`,
            variant: "destructive"
          });

          if (!skipSupabaseSync) {
            try {
              const { sendPaymentNotification } = await import('@/lib/supabase');
              await sendPaymentNotification(
                orderId,
                'failed',
                '',
                amountNumber,
                'zohopay'
              );
            } catch (notificationError) {
              console.warn('Failed to send payment failure notification:', notificationError);
            }
          }

          try { sessionStorage.removeItem('zp_last_order'); } catch {}
          try { sessionStorage.removeItem('zp_order_id'); } catch {}

          const q = new URLSearchParams();
          q.set('orderId', orderId);
          q.set('reason', 'gateway_failed');
          navigate(`/payment-failure?${q.toString()}`);
          return;

        } else {
          setPaymentDetails({
            success: false,
            pending: true,
            orderId,
            gateway: 'zohopay',
            message: 'Payment is still processing. We will notify you once confirmed.'
          });
        }

      } else {
        // Unknown gateway - check database order status
        try {
          const order = await getOrderByOrderId(orderId);
          if (order && order.payment_status === 'paid') {
            setPaymentDetails({
              ...response,
              success: true,
              orderId,
              gateway: 'unknown',
              serverOrder: order,
              message: 'Payment confirmed from database records.'
            });
            setOrderUpdated(true);
          } else {
            setPaymentDetails({
              ...response,
              success: false,
              orderId,
              gateway: 'unknown',
              message: 'Unable to verify payment status. Please contact support if payment was deducted.'
            });
          }
        } catch (dbError) {
          
          setPaymentDetails({
            ...response,
            success: false,
            orderId,
            gateway: 'unknown',
            message: 'Payment verification failed. Please contact support.'
          });
        }
      }

    } catch (error) {
      
      setPaymentDetails({
        success: false,
        message: 'Failed to verify payment status',
        orderId: searchParams.get('orderId') || 'Unknown'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (currentInvoiceData) {
      const logoUrl = import.meta.env.VITE_DEFAULT_LOGO_URL || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80';
      imageUrlToDataUrl(logoUrl).then((logoDataUrl) => {
        downloadInvoice(currentInvoiceData, logoDataUrl ? { logoDataUrl } : undefined);
      });
      toast({
        title: "Invoice Downloaded",
        description: "Your invoice has been downloaded successfully."
      });
    }
  };

  // Show countdown timer for 6 seconds
  if (showCountdown) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-4">Payment Processing</h1>
              <p className="text-muted-foreground mb-8">
                Please wait while we verify your payment...
              </p>
              
              <CircularCountdownTimer
                duration={15}
                onComplete={handleCountdownComplete}
                size={120}
                strokeWidth={8}
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading while verifying
  if (verifying) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold mb-2">Verifying Payment</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment status...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show payment failure if verification failed
  if (!paymentDetails || (!paymentDetails.success && !paymentDetails.pending)) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="text-red-500 mb-4">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-red-600">Payment Verification Failed</h1>
            <p className="text-muted-foreground mb-6">
              {paymentDetails?.message || 'We could not verify your payment. Please contact support.'}
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/track-order')} className="w-full">
                Track Your Order
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {paymentDetails?.success ? (
            <>
              {/* Success Header */}
              <div className="text-center mb-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                  Payment Successful!
                </h1>
                <p className="text-lg text-muted-foreground">
                  Thank you for your purchase. We've received your payment.
                </p>
                {paymentDetails?.gateway && (
                  <div className="mt-3">
                    <Badge variant="outline" className="text-sm">
                      Paid via {paymentDetails.gateway === 'easebuzz' ? 'Easebuzz' : paymentDetails.gateway === 'phonepe' ? 'PhonePe' : paymentDetails.gateway}
                    </Badge>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Your order has been confirmed. You can track your order status any time from the{' '}
                  <button onClick={() => navigate('/track-order')} className="underline text-primary">
                    Track Order
                  </button>{' '}
                  page.
                </p>
              </div>

              {/* Order Details */}
              {currentInvoiceData && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Order Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Order Number</p>
                        <p className="font-mono font-medium">{currentInvoiceData.orderId || paymentDetails.orderId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Order Date & Time</p>
                        <p className="font-medium">
                          {currentInvoiceData.date ? new Date(currentInvoiceData.date).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : new Date().toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Name</p>
                        <p className="font-medium">{currentInvoiceData.customerName || 'Customer'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Email</p>
                        <p className="font-medium">{currentInvoiceData.customerEmail || 'N/A'}</p>
                      </div>
                      {currentInvoiceData.customerPhone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Customer Phone</p>
                          <p className="font-medium">{currentInvoiceData.customerPhone}</p>
                        </div>
                      )}
                      {currentInvoiceData.shippingAddress && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">Shipping Address</p>
                          <p className="font-medium">{currentInvoiceData.shippingAddress}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Items */}
              {orderItems && orderItems.length > 0 && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                          {item.image && (
                            <div className="w-16 h-16 flex-shrink-0">
                              <img
                                src={item.image}
                                alt={item.name || 'Product'}
                                className="w-full h-full object-cover rounded-md"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name || 'Product'}</h4>
                            <div className="mt-1 text-sm text-muted-foreground space-y-1">
                              <div>Qty: {item.qty}</div>
                              {item.colors && item.colors.length > 0 && (
                                <div>Color: {item.colors.join(', ')}</div>
                              )}
                              {item.sizes && item.sizes.length > 0 && (
                                <div>Size: {item.sizes.join(', ')}</div>
                              )}
                            </div>
                          </div>
                          {currentInvoiceData?.items?.[index] && (
                            <div className="text-right">
                              <p className="font-medium">
                                {formatAmount(currentInvoiceData.items[index].price || 0)}
                              </p>
                              {currentInvoiceData.items[index].total && (
                                <p className="text-sm text-muted-foreground">
                                  Total: {formatAmount(currentInvoiceData.items[index].total)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Order Summary */}
                    {currentInvoiceData && (
                      <div className="mt-6 pt-4 border-t">
                        <div className="space-y-2">
                          {currentInvoiceData.subtotal && (
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{formatAmount(currentInvoiceData.subtotal)}</span>
                            </div>
                          )}
                          {currentInvoiceData.shipping && (
                            <div className="flex justify-between">
                              <span>Shipping:</span>
                              <span>{formatAmount(currentInvoiceData.shipping)}</span>
                            </div>
                          )}
                          {currentInvoiceData.tax && (
                            <div className="flex justify-between">
                              <span>Tax:</span>
                              <span>{formatAmount(currentInvoiceData.tax)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Total Amount:</span>
                            <span className="text-green-600">
                              {formatAmount(currentInvoiceData.total || parseFloat(paymentDetails.amount || '0'))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-mono font-medium">{paymentDetails.orderId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transaction ID</p>
                      <p className="font-mono font-medium">
                        {paymentDetails.transactionId ||
                         paymentDetails.txnid ||
                         paymentDetails.bankRefNum ||
                         (paymentDetails.easebuzzResponse?.txnid) ||
                         'Processing'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount Paid</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatAmount(parseFloat(paymentDetails.amount || '0'))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Gateway</p>
                      <p className="font-medium">
                        {paymentDetails.gateway === 'easebuzz' ? 'Easebuzz' : 
                         paymentDetails.gateway === 'phonepe' ? 'PhonePe' : 
                         paymentDetails.gateway || 'Online Payment'}
                      </p>
                    </div>
                    {paymentDetails.gateway === 'easebuzz' && paymentDetails.mode && (
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Mode</p>
                        <p className="font-medium">{paymentDetails.mode}</p>
                      </div>
                    )}
                    {paymentDetails.gateway === 'easebuzz' && paymentDetails.bankRefNum && (
                      <div>
                        <p className="text-sm text-muted-foreground">Bank Reference</p>
                        <p className="font-mono font-medium">{paymentDetails.bankRefNum}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-4">
                {currentInvoiceData && (
                  <Button onClick={handleDownloadReceipt} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoice
                  </Button>
                )}
                
                <Button onClick={() => navigate('/track-order')} variant="outline" className="w-full">
                  <Package className="h-4 w-4 mr-2" />
                  Track Your Order
                </Button>
                
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Pending Payment */}
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-yellow-600" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                  Payment Processing
                </h1>
                <p className="text-lg text-muted-foreground">
                  {paymentDetails.message || 'Your payment is being processed.'}
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    We are currently verifying your payment. This may take a few minutes.
                    You will receive a confirmation email once the payment is processed.
                  </p>
                  <div className="space-y-3">
                    <Button onClick={() => navigate('/track-order')} className="w-full">
                      Track Your Order
                    </Button>
                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
