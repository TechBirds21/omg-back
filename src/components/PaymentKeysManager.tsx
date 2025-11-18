import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Eye, EyeOff, Save, AlertCircle } from 'lucide-react';
import { updatePaymentGatewayKeys, getPaymentGatewayKeys } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PaymentKeysManagerProps {
  paymentMethod: string;
  displayName: string;
  onKeysUpdated?: () => void;
}

interface PaymentKeys {
  merchantKey?: string;
  salt?: string;
  apiKey?: string;
  secretKey?: string;
  [key: string]: any;
}

const PaymentKeysManager: React.FC<PaymentKeysManagerProps> = ({
  paymentMethod,
  displayName,
  onKeysUpdated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [keys, setKeys] = useState<PaymentKeys>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const getKeyFields = () => {
    switch (paymentMethod) {
      case 'phonepe':
        return [
          { key: 'clientId', label: 'Client ID', type: 'text', required: true },
          { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
          { key: 'merchantId', label: 'Merchant ID', type: 'text' },
          { key: 'merchantUserId', label: 'Merchant User ID', type: 'text' },
          { key: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'production'], required: true }
        ];
      case 'easebuzz':
        return [
          { key: 'merchantKey', label: 'Merchant Key', type: 'text', required: true },
          { key: 'salt', label: 'Salt', type: 'password', required: true },
          { key: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'production'], required: true },
          { key: 'useLegacyEndpoint', label: 'Use Legacy Endpoint', type: 'select', options: ['true', 'false'], required: true }
        ];
      case 'zohopay':
        return [
          { key: 'apiKey', label: 'API Key', type: 'password', required: true },
          { key: 'signingKey', label: 'Signing Key', type: 'password', required: true },
          { key: 'accountId', label: 'Account ID', type: 'text', required: true },
          { key: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'production'], required: true }
        ];
      default:
        return [
          { key: 'apiKey', label: 'API Key', type: 'password' },
          { key: 'secretKey', label: 'Secret Key', type: 'password' }
        ];
    }
  };

  const handleLoadKeys = async () => {
    if (!adminPassword.trim()) {
      setError('Please enter admin password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const existingKeys = await getPaymentGatewayKeys(paymentMethod, adminPassword);
      if (existingKeys) {
        setKeys(existingKeys);
        setSuccess('Keys loaded successfully');
      } else {
        setKeys({});
        setSuccess('No existing keys found');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!adminPassword.trim()) {
      setError('Please enter admin password');
      return;
    }

    // Validate required fields
    const keyFields = getKeyFields();
    const missingFields = keyFields
      .filter(field => field.required && !keys[field.key])
      .map(field => field.label);

    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updatePaymentGatewayKeys(paymentMethod, keys, adminPassword);
      setSuccess('Keys updated successfully');
      toast({
        title: "Success",
        description: `${displayName} keys have been updated successfully.`,
      });
      
      if (onKeysUpdated) {
        onKeysUpdated();
      }
      
      // Clear password after successful save
      setAdminPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update keys');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChange = (key: string, value: string) => {
    setKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetForm = () => {
    setAdminPassword('');
    setKeys({});
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          Manage Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage {displayName} Keys
          </DialogTitle>
          <DialogDescription>
            Update payment gateway credentials for {displayName}. You need admin password to access this feature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Admin Password */}
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Admin Password</Label>
            <div className="relative">
              <Input
                id="adminPassword"
                type={showPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Load Existing Keys */}
          <div className="flex gap-2">
            <Button
              onClick={handleLoadKeys}
              disabled={loading || !adminPassword.trim()}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Load Existing Keys
            </Button>
          </div>

          {/* Key Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gateway Configuration</CardTitle>
              <CardDescription>
                Enter the required credentials for {displayName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getKeyFields().map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === 'select' ? (
                    <select
                      id={field.key}
                      value={keys[field.key] || ''}
                      onChange={(e) => handleKeyChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={field.required}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option === 'true' ? 'Yes' : option === 'false' ? 'No' : option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={field.key}
                      type={field.type}
                      value={keys[field.key] || ''}
                      onChange={(e) => handleKeyChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label}`}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSaveKeys}
              disabled={loading || !adminPassword.trim()}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Keys
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentKeysManager;
