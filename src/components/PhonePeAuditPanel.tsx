import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchPhonePeAuditStatus } from '@/lib/phonepe-api';

const PhonePeAuditPanel = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [merchantOrderId, setMerchantOrderId] = useState('');

  const runAuditCheck = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please provide both from and to dates');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchPhonePeAuditStatus(fromDate, toDate, merchantOrderId || undefined);
      setResults(result);
      
      if (result.status === 1) {
        toast.success(`Audit check completed. Found ${result.totalTransactions} transactions.`);
      } else {
        toast.error('Audit check failed: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      
      toast.error('Audit failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayDate = (): string => {
    try {
      const result = new Date().toISOString().split('T')[0];
      return result || new Date().toLocaleDateString('en-CA') || '2024-01-01';
    } catch {
      return new Date().toLocaleDateString('en-CA') || '2024-01-01';
    }
  };

  // Helper to get date 7 days ago
  const getWeekAgoDate = (): string => {
    try {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      const result = date.toISOString().split('T')[0];
      return result || date.toLocaleDateString('en-CA') || '2024-01-01';
    } catch {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date.toLocaleDateString('en-CA') || '2024-01-01';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>PhonePe Audit Status API</CardTitle>
        <p className="text-sm text-muted-foreground">
          Check payment status for a date range using PhonePe's Audit API (recommended by PhonePe team)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fromDate">From Date *</Label>
            <Input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-1 text-xs"
              onClick={() => setFromDate(getWeekAgoDate())}
            >
              7 days ago
            </Button>
          </div>
          
          <div>
            <Label htmlFor="toDate">To Date *</Label>
            <Input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-1 text-xs"
              onClick={() => setToDate(getTodayDate())}
            >
              Today
            </Button>
          </div>
          
          <div>
            <Label htmlFor="merchantOrderId">Order ID (Optional)</Label>
            <Input
              id="merchantOrderId"
              value={merchantOrderId}
              onChange={(e) => setMerchantOrderId(e.target.value)}
              placeholder="Filter by specific order"
            />
          </div>
        </div>

        <Button 
          onClick={runAuditCheck} 
          disabled={loading || !fromDate || !toDate}
          className="w-full"
        >
          {loading ? 'Running Audit Check...' : 'Run PhonePe Audit Check'}
        </Button>

        {results && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Audit Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Status:</strong> {results.status === 1 ? 'Success' : 'Failed'}</p>
                <p><strong>Date Range:</strong> {results.fromDate} to {results.toDate}</p>
                <p><strong>Total Transactions:</strong> {results.totalTransactions}</p>
                <p><strong>Remote Status:</strong> {results.remoteStatus}</p>
              </div>

              {results.transactions && results.transactions.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Transactions:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.transactions.map((txn: any, index: number) => (
                      <div key={index} className="bg-muted p-3 rounded text-sm">
                        <p><strong>Order ID:</strong> {txn.merchantOrderId}</p>
                        <p><strong>Transaction ID:</strong> {txn.transactionId}</p>
                        <p><strong>Amount:</strong> ₹{(txn.amount / 100).toFixed(2)}</p>
                        <p><strong>State:</strong> <span className={`px-2 py-1 rounded ${
                          txn.state === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          txn.state === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{txn.state}</span></p>
                        {txn.paymentMode && <p><strong>Payment Mode:</strong> {txn.paymentMode}</p>}
                        {txn.createdAt && <p><strong>Created:</strong> {new Date(txn.createdAt).toLocaleString()}</p>}
                        {txn.completedAt && <p><strong>Completed:</strong> {new Date(txn.completedAt).toLocaleString()}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Raw Response</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default PhonePeAuditPanel;
