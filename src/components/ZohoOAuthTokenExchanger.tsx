import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ZohoOAuthTokenExchangerProps {
  onTokensGenerated?: (tokens: { access_token?: string; refresh_token?: string }) => void;
}

export const ZohoOAuthTokenExchanger: React.FC<ZohoOAuthTokenExchangerProps> = ({ onTokensGenerated }) => {
  const [authCode, setAuthCode] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'oauth' | 'refresh'>('oauth');

  const getAuthorizationUrl = () => {
    if (!clientId) {
      toast.error('Please enter Client ID first');
      return;
    }
    
    // Official Zoho Pay OAuth scopes from API documentation
    // Reference: https://www.zoho.com/in/payments/api/v1/oauth/
    const scopes = [
      'ZohoPay.payments.CREATE',
      'ZohoPay.payments.READ',
      'ZohoPay.payments.UPDATE',
      'ZohoPay.refunds.CREATE',
      'ZohoPay.refunds.READ'
    ].join(',');
    
    const redirectUri = 'https://omaguva.com/admin/settings';
    const url = `https://accounts.zoho.in/oauth/v2/auth?scope=${encodeURIComponent(scopes)}&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;
    
    window.open(url, '_blank');
    toast.info('Opening Zoho authorization page. Copy the code from the URL after authorization.');
  };

  const exchangeToken = async () => {
    if (!authCode || !clientId || !clientSecret) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
      const response = await fetch(
        `${API_BASE}/payments/zohopay/oauth/exchange`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_code: authCode,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: 'https://omaguva.com/admin/settings',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.access_token) {
        setResult(data);
        toast.success('OAuth token generated successfully!');
        // Call callback if provided
        if (onTokensGenerated) {
          onTokensGenerated({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
        }
      } else {
        const errorMsg = data.detail || data.error || data.message || 'Failed to exchange token';
        setError(`Zoho API Error: ${errorMsg}`);
        toast.error('Failed to generate token');
        console.error('Zoho error response:', data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError('Network error: ' + errorMessage);
      toast.error('Network error occurred: ' + errorMessage);
      console.error('Token exchange error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    if (!refreshToken || !clientId || !clientSecret) {
      setError('Please fill in all fields');
      return;
    }

    setRefreshing(true);
    setError('');
    setResult(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
      const response = await fetch(
        `${API_BASE}/payments/zohopay/oauth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.access_token) {
        setResult(data);
        toast.success('Access token refreshed successfully!');
        // Call callback if provided
        if (onTokensGenerated) {
          onTokensGenerated({
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken,
          });
        }
      } else {
        const errorMsg = data.detail || data.error || data.message || 'Failed to refresh token';
        setError(`Zoho API Error: ${errorMsg}`);
        toast.error('Failed to refresh token');
        console.error('Zoho error response:', data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError('Network error: ' + errorMessage);
      toast.error('Network error occurred: ' + errorMessage);
      console.error('Token refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zoho OAuth Token Manager</CardTitle>
        <CardDescription>
          Generate and refresh Zoho Pay OAuth tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step selector */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={step === 'oauth' ? 'default' : 'ghost'}
            onClick={() => setStep('oauth')}
            className="flex-1"
          >
            1. Get Initial Token
          </Button>
          <Button
            variant={step === 'refresh' ? 'default' : 'ghost'}
            onClick={() => setStep('refresh')}
            className="flex-1"
          >
            2. Refresh Token
          </Button>
        </div>

        {step === 'oauth' ? (
          <>
            <Alert>
              <AlertDescription className="text-sm space-y-2">
                <div><strong>Step 1:</strong> Create OAuth client at Zoho API Console</div>
                <Button 
                  variant="link" 
                  className="p-0 h-auto" 
                  onClick={() => window.open('https://api-console.zoho.in', '_blank')}
                >
                  Open API Console <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
                <div><strong>Step 2:</strong> Enter credentials below</div>
                <div><strong>Step 3:</strong> Get authorization code (expires in 60s!)</div>
                <div><strong>Step 4:</strong> Exchange for tokens immediately</div>
              </AlertDescription>
            </Alert>

        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            placeholder="1005.Z1MZO4SP55447L4EUGGQM54N7RFQXN"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            placeholder="Enter your client secret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
        </div>

            <Button
              onClick={getAuthorizationUrl}
              disabled={!clientId}
              variant="outline"
              className="w-full"
            >
              Get Authorization Code
            </Button>
            
            <div className="space-y-2">
              <Label htmlFor="authCode">Authorization Code (from URL after authorization)</Label>
              <Input
                id="authCode"
                placeholder="1005.xxxxxxxxxxxxx..."
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
              />
            </div>

            <Button
              onClick={exchangeToken}
              disabled={loading || !authCode || !clientId || !clientSecret}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Exchange for Token
            </Button>
          </>
        ) : (
          <>
            <Alert>
              <AlertDescription className="text-sm space-y-2">
                <div><strong>Use your saved Refresh Token</strong> to get a new Access Token</div>
                <div className="text-xs text-muted-foreground">Access tokens expire every hour. Use this to refresh them automatically.</div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="clientId2">Client ID</Label>
              <Input
                id="clientId2"
                placeholder="1005.Z1MZO4SP55447L4EUGGQM54N7RFQXN"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret2">Client Secret</Label>
              <Input
                id="clientSecret2"
                type="password"
                placeholder="Enter your client secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token</Label>
              <Input
                id="refreshToken"
                type="password"
                placeholder="1000.xxxxxxxxxxxxx..."
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
              />
            </div>

            <Button
              onClick={refreshAccessToken}
              disabled={refreshing || !refreshToken || !clientId || !clientSecret}
              className="w-full"
            >
              {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh Access Token
            </Button>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Token Generated Successfully!</span>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Access Token (Use this as API Key)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={result.access_token}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(result.access_token, 'Access Token')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Refresh Token (Save this!)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={result.refresh_token}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(result.refresh_token, 'Refresh Token')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>• Expires in: {result.expires_in} seconds ({Math.floor(result.expires_in / 60)} minutes)</p>
                <p>• Token type: {result.token_type}</p>
                <p>• API Domain: {result.api_domain}</p>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>⚠️ IMPORTANT - Next steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li><strong>Save the Refresh Token</strong> - You'll need it to get new access tokens</li>
                    <li>Copy the Access Token</li>
                    <li>Update ZOHOPAY_API_KEY secret with the Access Token</li>
                    <li>Access tokens expire in 1 hour - use the "Refresh Token" tab to get new ones</li>
                    <li>Consider setting up automatic token refresh in production</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
