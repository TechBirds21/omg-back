import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Copy,
  ExternalLink,
  TestTube,
  Webhook,
  Shield,
  Settings as SettingsIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ZohoOAuthTokenExchanger } from '@/components/ZohoOAuthTokenExchanger';

interface TokenStatus {
  hasToken: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  timeRemaining: string | null;
}

export const ZohoPayConfig: React.FC = () => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({
    hasToken: false,
    expiresAt: null,
    isExpired: true,
    timeRemaining: null
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [testingPayment, setTestingPayment] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [accountId, setAccountId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadTokenStatus();
    loadConfiguration();
  }, []);

  const loadTokenStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zoho_oauth_tokens')
        .select('access_token, expires_at, refresh_token')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        const isExpired = expiresAt <= now;
        const timeRemaining = isExpired ? null : formatTimeRemaining(expiresAt.getTime() - now.getTime());

        setTokenStatus({
          hasToken: true,
          expiresAt: data.expires_at,
          isExpired,
          timeRemaining
        });
      }
    } catch (error) {
      console.error('Error loading token status:', error);
      setTokenStatus({
        hasToken: false,
        expiresAt: null,
        isExpired: true,
        timeRemaining: null
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConfiguration = async () => {
    try {
      // Load secrets status (we can't read the actual values, just check if they exist)
      const projectId = 'yxaohpktlgkspapnhbwa';
      
      // Set webhook URL
      setWebhookUrl(`https://${projectId}.supabase.co/functions/v1/zohopay-webhook`);
      
      // Check if we have the account ID from environment
      const accountIdFromEnv = import.meta.env.VITE_ZOHOPAY_ACCOUNT_ID || '60056500354';
      setAccountId(accountIdFromEnv);
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('zoho-auto-refresh', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Token Refreshed",
        description: "Access token has been refreshed successfully.",
      });

      await loadTokenStatus();
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh token",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleTestPayment = async () => {
    setTestingPayment(true);
    try {
      const testOrderId = `TEST_${Date.now()}`;
      const { data, error } = await supabase.functions.invoke('zohopay-init', {
        body: {
          amount: 100, // ₹1.00 test payment
          orderId: testOrderId,
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          customerPhone: '9999999999',
          productInfo: 'Test Payment'
        }
      });

      if (error) throw error;

      if (data?.paymentUrl) {
        toast({
          title: "Test Payment Created",
          description: "Payment session created successfully. Opening payment page...",
        });
        window.open(data.paymentUrl, '_blank');
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Error testing payment:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to create test payment",
        variant: "destructive",
      });
    } finally {
      setTestingPayment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const getStatusBadge = () => {
    if (loading) {
      return <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Loading</Badge>;
    }
    if (!tokenStatus.hasToken) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />No Token</Badge>;
    }
    if (tokenStatus.isExpired) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Zoho Pay Configuration
              </CardTitle>
              <CardDescription>
                Manage your Zoho Pay integration, OAuth tokens, and payment settings
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="oauth" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="oauth">OAuth Tokens</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="webhook">Webhooks</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            {/* OAuth Tab */}
            <TabsContent value="oauth" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Access Token Status</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={loadTokenStatus}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh Status
                    </Button>
                  </div>

                  {tokenStatus.hasToken && !tokenStatus.isExpired && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Expires in: {tokenStatus.timeRemaining}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expires at: {tokenStatus.expiresAt ? new Date(tokenStatus.expiresAt).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                  )}

                  {tokenStatus.isExpired && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Access token is expired. Please refresh or generate a new token.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleRefreshToken}
                      disabled={refreshing || !tokenStatus.hasToken}
                      variant="default"
                    >
                      {refreshing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh Token
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-semibold">Generate New OAuth Token</h3>
                  <p className="text-sm text-muted-foreground">
                    Use this to get a fresh OAuth token from Zoho Pay. You'll need to authorize the app and update the secrets.
                  </p>
                  <ZohoOAuthTokenExchanger />
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Important:</strong> After getting new tokens from the OAuth flow, you must update the following secrets:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><code>ZOHOPAY_API_KEY</code> (Access Token)</li>
                      <li><code>ZOHO_REFRESH_TOKEN</code> (Refresh Token)</li>
                      <li><code>ZOHOPAY_SIGNING_KEY</code> (Signing Key)</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="configuration" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <div>
                    <Label>Account ID</Label>
                    <div className="flex gap-2 mt-2">
                      <Input value={accountId} readOnly />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(accountId)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your Zoho Pay account ID (stored in ZOHOPAY_ACCOUNT_ID secret)
                    </p>
                  </div>

                  <div>
                    <Label>Environment</Label>
                    <Input value="Production (payments.zoho.in)" readOnly className="mt-2" />
                  </div>

                  <div>
                    <Label>API Endpoint</Label>
                    <div className="flex gap-2 mt-2">
                      <Input value="https://payments.zoho.in/api/v1/paymentsessions" readOnly />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open('https://www.zoho.com/in/payments/api/v1/', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Alert>
                  <SettingsIcon className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Required Secrets:</strong> Ensure these are configured in your Supabase project:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li><code>ZOHOPAY_API_KEY</code> - OAuth Access Token</li>
                      <li><code>ZOHO_REFRESH_TOKEN</code> - OAuth Refresh Token</li>
                      <li><code>ZOHOPAY_SIGNING_KEY</code> - Webhook Signing Key</li>
                      <li><code>ZOHOPAY_ACCOUNT_ID</code> - Your Account ID</li>
                      <li><code>ZOHO_CLIENT_ID</code> - OAuth Client ID</li>
                      <li><code>ZOHO_CLIENT_SECRET</code> - OAuth Client Secret</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Webhook Tab */}
            <TabsContent value="webhook" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <div>
                    <Label>Webhook URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input value={webhookUrl} readOnly />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(webhookUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure this URL in your Zoho Pay webhook settings
                    </p>
                  </div>

                  <Alert>
                    <Webhook className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Webhook Setup Instructions:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                        <li>Go to Zoho Pay Dashboard → Settings → Webhooks</li>
                        <li>Add a new webhook with the URL above</li>
                        <li>Select events: payment.success, payment.failed</li>
                        <li>Copy the signing key and update ZOHOPAY_SIGNING_KEY secret</li>
                        <li>Save and test the webhook</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-semibold">Recent Webhook Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Check your Edge Function logs for webhook events:
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://supabase.com/dashboard/project/yxaohpktlgkspapnhbwa/functions/zohopay-webhook/logs`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Webhook Logs
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Test Tab */}
            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Test Payment</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a test payment session to verify your Zoho Pay integration. This will create a ₹1.00 test transaction.
                    </p>
                    <Button
                      onClick={handleTestPayment}
                      disabled={testingPayment || tokenStatus.isExpired}
                      className="w-full"
                    >
                      {testingPayment ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Create Test Payment (₹1.00)
                    </Button>
                  </div>

                  {tokenStatus.isExpired && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Cannot test payment - access token is expired. Please refresh or generate a new token.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-semibold">Debug Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Status:</span>
                      <span className="font-mono">{tokenStatus.hasToken ? 'Available' : 'Missing'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Expired:</span>
                      <span className="font-mono">{tokenStatus.isExpired ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account ID:</span>
                      <span className="font-mono">{accountId}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`https://supabase.com/dashboard/project/yxaohpktlgkspapnhbwa/functions/zohopay-init/logs`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Payment Init Logs
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
