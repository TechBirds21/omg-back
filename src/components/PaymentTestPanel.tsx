import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { initiatePhonePePayment, generatePhonePeOrderId, fetchPhonePeOrderStatus } from '@/lib/phonepe-api';
import PhonePeAuditPanel from './PhonePeAuditPanel';

const PaymentTestPanel = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [amount, setAmount] = useState('100');
  const [customerEmail, setCustomerEmail] = useState('test@example.com');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [customerName, setCustomerName] = useState('Test Customer');
  const [testOrderId, setTestOrderId] = useState('');

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runPhonePeTest = async () => {
    setTesting(true);
    addResult('Starting PhonePe payment test...');
    
    try {
      const orderId = generatePhonePeOrderId();
      setTestOrderId(orderId);
      addResult(`Generated Order ID: ${orderId}`);
      
      const paymentData = {
        amount: parseFloat(amount),
        orderId,
        customerName,
        customerEmail,
        customerPhone,
        productInfo: 'Test Payment'
      };
      
      addResult(`Payment Data: ${JSON.stringify(paymentData, null, 2)}`);
      
      const result = await initiatePhonePePayment(paymentData);
      addResult(`Payment Result: ${JSON.stringify(result, null, 2)}`);
      
      if (result.paymentUrl) {
        addResult(`✅ Payment URL received: ${result.paymentUrl}`);
        toast.success('Payment initiated successfully!');
      } else {
        addResult('❌ No payment URL received');
        toast.error('Payment initiation failed');
      }
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Payment test failed');
      
    } finally {
      setTesting(false);
    }
  };

  const checkOrderStatus = async () => {
    if (!testOrderId) {
      toast.error('No test order ID available');
      return;
    }

    setTesting(true);
    addResult(`Checking status for Order ID: ${testOrderId}`);
    
    try {
      const statusResult = await fetchPhonePeOrderStatus(testOrderId, true);
      addResult(`Order Status Result: ${JSON.stringify(statusResult, null, 2)}`);
      
      if (statusResult.status === 1) {
        addResult(`✅ Order Status: ${statusResult.state}`);
        toast.success('Order status checked successfully!');
      } else {
        addResult('❌ Failed to check order status');
        toast.error('Status check failed');
      }
    } catch (error) {
      addResult(`❌ Status Check Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Status check failed');
      
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>PhonePe Payment Test Panel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test PhonePe payment initiation and order status checking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Test Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          
          <div>
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Test Customer"
            />
          </div>
          
          <div>
            <Label htmlFor="customerEmail">Customer Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="customerPhone">Customer Phone</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="9876543210"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button 
            onClick={runPhonePeTest} 
            disabled={testing}
          >
            {testing ? 'Running Test...' : 'Run PhonePe Test'}
          </Button>
          
          <Button 
            onClick={checkOrderStatus} 
            disabled={testing || !testOrderId}
            variant="outline"
          >
            {testing ? 'Checking...' : 'Check Order Status'}
          </Button>
        </div>
        
        {testOrderId && (
          <div className="text-sm text-muted-foreground">
            <strong>Test Order ID:</strong> {testOrderId}
          </div>
        )}

        {results.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded text-sm font-mono space-y-1 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index}>{result}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

// Combined Payment Testing Component
const CombinedPaymentTestPanel = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentTestPanel />
        <PhonePeAuditPanel />
      </div>
    </div>
  );
};

export default CombinedPaymentTestPanel;
