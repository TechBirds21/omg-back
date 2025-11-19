// @ts-nocheck
import React, { useState } from 'react';
import PaymentTestPanel from '@/components/PaymentTestPanel';
import { downloadInvoice, type InvoiceData } from '@/lib/invoice';
import { Button } from '@/components/ui/button';
import { generateInvoiceFromOrder } from '@/lib/invoiceUtils';

const PaymentTest = () => {
  const [orderIdInput, setOrderIdInput] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Payment Gateway Test</h1>
        <PaymentTestPanel />
        <div className="mt-10 max-w-xl mx-auto p-4 border rounded-md bg-white">
          <h2 className="text-xl font-semibold mb-3">Invoice PDF Quick Test</h2>
          <p className="text-sm text-muted-foreground mb-4">Click to download a sample invoice with dummy data.</p>
          <Button onClick={() => {
            const invoice: InvoiceData = {
              orderId: `TEST_${Date.now()}`,
              customerName: 'Test Customer',
              customerEmail: 'test@example.com',
              customerPhone: '9999999999',
              shippingAddress: '123 Test Street, Test City, TS 123456',
              items: [
                { name: 'OMGK1 (Maroon - brown)', quantity: 1, price: 777, total: 777, colors: ['Maroon - brown'], sareeId: 'OMGK1' },
                { name: 'OMGK2 (Yellow - gold)', quantity: 2, price: 599, total: 1198, colors: ['Yellow - gold'], sareeId: 'OMGK2' }
              ],
              subtotal: 1975,
              total: 1975,
              paymentMethod: 'Online Payment',
              transactionId: 'TXTEST123456',
              orderDate: new Date().toISOString(),
              paymentGatewayResponse: { status: 'completed' }
            };
            const logo = '/favicon.ico';
            downloadInvoice(invoice, { logoDataUrl: logo });
          }}>Download Sample Invoice</Button>
        </div>

        <div className="mt-6 max-w-xl mx-auto p-4 border rounded-md bg-white">
          <h2 className="text-xl font-semibold mb-3">Invoice From Real Order</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter an existing order_id (e.g., SEPM_TEST_123) to fetch from DB and download the invoice.</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="Enter order_id (e.g., SEPM_TEST_136815)"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
            />
            <Button disabled={busy || !orderIdInput} onClick={async () => {
              if (!orderIdInput) return;
              try {
                setBusy(true);
                const invoice = await generateInvoiceFromOrder(orderIdInput);
                if (!invoice) {
                  alert('No order found or unable to build invoice for that order_id.');
                  return;
                }
                const logo = '/favicon.ico';
                downloadInvoice(invoice, { logoDataUrl: logo });
              } finally {
                setBusy(false);
              }
            }}>{busy ? 'Generating…' : 'Download Invoice'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTest;
