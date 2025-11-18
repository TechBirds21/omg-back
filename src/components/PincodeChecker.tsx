import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, CheckCircle, XCircle } from 'lucide-react';
import { fetchPincodeDetail, PincodeDetail } from '@/lib/api-storefront';
import { useToast } from '@/hooks/use-toast';

interface PincodeCheckerProps {
  onDeliveryInfoUpdate?: (deliveryInfo: any) => void;
  onPincodeChange?: (pincode: string, deliveryInfo: any) => void;
}

const PincodeChecker: React.FC<PincodeCheckerProps> = ({ onDeliveryInfoUpdate, onPincodeChange }) => {
  const [pincode, setPincode] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const { toast } = useToast();

  const handlePincodeCheck = async (pincodeValue?: string) => {
    const currentPincode = pincodeValue || pincode;
    
    if (!currentPincode || currentPincode.length !== 6) {
      if (currentPincode.length > 0 && currentPincode.length !== 6) {
        toast({
          title: "Invalid Pincode",
          description: "Please enter a valid 6-digit pincode.",
          variant: "destructive",
        });
      }
      return;
    }

    setLoading(true);
    try {
      // Try delivery_pincodes table first, then fallback to delivery_areas
      console.log('Fetching pincode details for:', currentPincode);
      const data: PincodeDetail | null = await fetchPincodeDetail(currentPincode).catch((error) => {
        console.error('Error fetching pincode:', error);
        return null;
      });
      
      console.log('Pincode data received:', data);

      setDeliveryInfo(data);
      setChecked(true);
      
      if (data) {
        // Auto-fill delivery information
        if (onDeliveryInfoUpdate) {
          onDeliveryInfoUpdate(data);
        }
        
        // Notify parent component about pincode change with delivery info
        if (onPincodeChange) {
          onPincodeChange(currentPincode, data);
        }

        toast({
          title: "Pincode Found!",
          description: `Delivery to ${data.area}, ${data.city}, ${data.state}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Pincode Not Found",
          description: "This pincode is not in our delivery database. Please contact us for more information.",
          variant: "destructive",
        });
        
        // Still notify parent about pincode change even if not found
        if (onPincodeChange) {
          onPincodeChange(currentPincode, null);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check pincode. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePincodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPincode(numericValue);
    
    // Reset delivery info when pincode changes
    if (checked && numericValue !== pincode) {
      setDeliveryInfo(null);
      setChecked(false);
    }

    // Auto-check when 6 digits are entered
    if (numericValue.length === 6) {
      handlePincodeCheck(numericValue);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Enter Pincode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode</Label>
          <div className="flex space-x-2">
            <Input
              id="pincode"
              value={pincode}
              onChange={(e) => handlePincodeChange(e.target.value)}
              placeholder="Enter 6-digit pincode"
              maxLength={6}
              className="flex-1"
            />
            <Button 
              onClick={() => handlePincodeCheck()}
              disabled={loading || pincode.length !== 6}
              className="px-6"
            >
              {loading ? 'Checking...' : 'Check'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your 6-digit pincode to auto-fill delivery details
          </p>
        </div>

        {checked && (
          <div className="mt-4">
            {deliveryInfo ? (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-700">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Delivery Details Found!</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pincode:</span>
                    <span className="font-medium">{deliveryInfo.pincode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Area:</span>
                    <span className="font-medium">{deliveryInfo.area}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">City:</span>
                    <span className="font-medium">{deliveryInfo.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">State:</span>
                    <span className="font-medium">{deliveryInfo.state}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Country:</span>
                    <span className="font-medium">{deliveryInfo.country}</span>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ We deliver to this location! Details auto-filled below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center text-red-700">
                  <XCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Pincode Not Found</span>
                </div>
                <p className="text-sm text-red-600 mt-2">
                  This pincode is not in our delivery database. Please contact us to check if we can arrange delivery to your area.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PincodeChecker;
