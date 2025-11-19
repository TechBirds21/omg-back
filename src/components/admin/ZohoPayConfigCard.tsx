// ZohoPay Configuration Card for Payment Settings
// Allows generating OAuth tokens and storing them in payment_config

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
  Shield,
  Key,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ZohoOAuthTokenExchanger } from '@/components/ZohoOAuthTokenExchanger';
import { updatePaymentConfig, fetchPaymentConfigs } from '@/lib/api-admin';

interface ZohoPayConfigCardProps {
  config: any;
  onConfigUpdate?: () => void;
}

export const ZohoPayConfigCard: React.FC<ZohoPayConfigCardProps> = ({ config, onConfigUpdate }) => {
  const [accountId, setAccountId] = useState('');
  const [domain, setDomain] = useState('IN');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [config]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // Load from encrypted_keys in payment_config
      const encryptedKeys = config?.encrypted_keys || {};
      let configData = {};
      
      if (encryptedKeys.encrypted_data) {
        configData = encryptedKeys.encrypted_data;
      } else if (typeof encryptedKeys === 'object') {
        configData = encryptedKeys;
      }

      let accountId = configData.account_id || '';
      let domain = configData.domain || 'IN';
      let accessToken = configData.access_token || configData.api_key || '';
      let refreshToken = configData.refresh_token || '';

      // If account_id is missing, try to fetch from zoho_oauth_tokens via backend config endpoint
      if (!accountId || !accessToken) {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
          const response = await fetch(`${API_BASE}/payments/zohopay/config`);
          if (response.ok) {
            const backendConfig = await response.json();
            console.log('Backend config from zoho_oauth_tokens:', backendConfig);
            
            // Use backend config as fallback if payment_config is missing fields
            if (!accountId && backendConfig.account_id) {
              accountId = backendConfig.account_id;
            }
            if (!accessToken && backendConfig.api_key) {
              accessToken = backendConfig.api_key;
            }
            if (backendConfig.domain && domain === 'IN') {
              domain = backendConfig.domain;
            }
          }
        } catch (err) {
          console.warn('Could not fetch config from zoho_oauth_tokens:', err);
        }
      }

      setAccountId(accountId);
      setDomain(domain);
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
    } catch (error) {
      console.error('Error loading ZohoPay config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accountId || !accessToken) {
      toast({
        title: "Validation Error",
        description: "Account ID and Access Token are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const configData = {
        account_id: accountId,
        domain: domain,
        access_token: accessToken,
        api_key: accessToken, // Also store as api_key for backward compatibility
        refresh_token: refreshToken || '', // Store refresh token even if empty
      };

      // Update payment config with encrypted keys
      await updatePaymentConfig(config.payment_method, {
        encrypted_keys: {
          encrypted_data: configData,
        },
      });

      toast({
        title: "Configuration Saved",
        description: "ZohoPay configuration has been saved successfully",
      });

      if (onConfigUpdate) {
        await onConfigUpdate();
      }
    } catch (error: any) {
      console.error('Error saving ZohoPay config:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTokenGenerated = (tokens: { access_token?: string; refresh_token?: string }) => {
    if (tokens.access_token) {
      setAccessToken(tokens.access_token);
    }
    if (tokens.refresh_token) {
      setRefreshToken(tokens.refresh_token);
    } else if (tokens.access_token && !tokens.refresh_token) {
      // If we have access token but no refresh token, keep existing refresh token
      // Don't clear it
    }
    toast({
      title: "Tokens Generated",
      description: tokens.refresh_token 
        ? "OAuth tokens (Access & Refresh) have been generated. Please save the configuration."
        : "Access token has been generated. Please save the configuration.",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              ZohoPay Configuration
            </CardTitle>
            <CardDescription>
              Configure your ZohoPay account ID and OAuth tokens
            </CardDescription>
          </div>
          {accessToken ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="credentials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="oauth">OAuth Tokens</TabsTrigger>
          </TabsList>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="accountId">Account ID *</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="accountId"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="Enter your ZohoPay Account ID"
                  />
                  {accountId && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(accountId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your ZohoPay Account ID (found in ZohoPay Dashboard → Settings)
                </p>
              </div>

              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="IN"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Country code (IN for India, US for United States, etc.)
                </p>
              </div>

              <div>
                <Label htmlFor="accessToken">Access Token (API Key) *</Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="accessToken"
                      type={showAccessToken ? "text" : "password"}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Enter OAuth Access Token"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                    >
                      {showAccessToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {accessToken && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(accessToken)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  OAuth Access Token from ZohoPay (generate using OAuth Tokens tab)
                </p>
              </div>

              <div>
                <Label htmlFor="refreshToken">Refresh Token</Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="refreshToken"
                      type={showRefreshToken ? "text" : "password"}
                      value={refreshToken}
                      onChange={(e) => setRefreshToken(e.target.value)}
                      placeholder="Enter OAuth Refresh Token (optional)"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowRefreshToken(!showRefreshToken)}
                    >
                      {showRefreshToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {refreshToken && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(refreshToken)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  OAuth Refresh Token (used to get new access tokens automatically)
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !accountId || !accessToken}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* OAuth Tokens Tab */}
          <TabsContent value="oauth" className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <strong>Generate OAuth Tokens:</strong> Use the tool below to generate new OAuth tokens from ZohoPay.
                After generating tokens, they will be automatically filled in the Credentials tab.
              </AlertDescription>
            </Alert>

            <ZohoOAuthTokenExchanger onTokensGenerated={handleTokenGenerated} />

            <Alert>
              <ExternalLink className="h-4 w-4" />
              <AlertDescription>
                <strong>Need Help?</strong> Visit{' '}
                <a
                  href="https://www.zoho.com/in/payments/api/v1/oauth/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  ZohoPay OAuth Documentation
                </a>
                {' '}for detailed instructions.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

