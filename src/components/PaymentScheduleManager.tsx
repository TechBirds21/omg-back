import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Save, X, AlertCircle } from 'lucide-react';
import { updatePaymentSchedule, PaymentConfig } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface PaymentScheduleManagerProps {
  paymentConfig: PaymentConfig;
  onScheduleUpdated: () => void;
}

export const PaymentScheduleManager: React.FC<PaymentScheduleManagerProps> = ({
  paymentConfig,
  onScheduleUpdated
}) => {
  const [scheduleEnabled, setScheduleEnabled] = useState(paymentConfig.schedule_enabled || false);
  const [fromDate, setFromDate] = useState(
    paymentConfig.schedule_from_date 
      ? new Date(paymentConfig.schedule_from_date).toISOString().slice(0, 16)
      : ''
  );
  const [toDate, setToDate] = useState(
    paymentConfig.schedule_to_date 
      ? new Date(paymentConfig.schedule_to_date).toISOString().slice(0, 16)
      : ''
  );
  const [timezone, setTimezone] = useState(paymentConfig.schedule_timezone || 'Asia/Kolkata');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if there are unsaved changes
  useEffect(() => {
    const originalEnabled = paymentConfig.schedule_enabled || false;
    const originalFromDate = paymentConfig.schedule_from_date 
      ? new Date(paymentConfig.schedule_from_date).toISOString().slice(0, 16)
      : '';
    const originalToDate = paymentConfig.schedule_to_date 
      ? new Date(paymentConfig.schedule_to_date).toISOString().slice(0, 16)
      : '';
    const originalTimezone = paymentConfig.schedule_timezone || 'Asia/Kolkata';

    const changed = 
      scheduleEnabled !== originalEnabled ||
      fromDate !== originalFromDate ||
      toDate !== originalToDate ||
      timezone !== originalTimezone;

    setHasChanges(changed);
  }, [scheduleEnabled, fromDate, toDate, timezone, paymentConfig]);

  // Check if current time is within schedule
  const isCurrentlyActive = () => {
    if (!scheduleEnabled || !fromDate || !toDate) return false;
    
    const now = new Date();
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return now >= from && now <= to;
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updatePaymentSchedule(paymentConfig.payment_method, {
        schedule_enabled: scheduleEnabled,
        schedule_from_date: scheduleEnabled && fromDate ? new Date(fromDate).toISOString() : null,
        schedule_to_date: scheduleEnabled && toDate ? new Date(toDate).toISOString() : null,
        schedule_timezone: timezone
      });

      toast({
        title: "Schedule Updated",
        description: `Payment schedule for ${paymentConfig.display_name} has been updated successfully.`,
      });

      onScheduleUpdated();
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to update payment schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setScheduleEnabled(paymentConfig.schedule_enabled || false);
    setFromDate(
      paymentConfig.schedule_from_date 
        ? new Date(paymentConfig.schedule_from_date).toISOString().slice(0, 16)
        : ''
    );
    setToDate(
      paymentConfig.schedule_to_date 
        ? new Date(paymentConfig.schedule_to_date).toISOString().slice(0, 16)
        : ''
    );
    setTimezone(paymentConfig.schedule_timezone || 'Asia/Kolkata');
  };

  const getStatusBadge = () => {
    if (!scheduleEnabled) {
      return <Badge variant="secondary">Always Active</Badge>;
    }
    
    if (!fromDate || !toDate) {
      return <Badge variant="outline">Schedule Incomplete</Badge>;
    }
    
    if (isCurrentlyActive()) {
      return <Badge variant="default" className="bg-green-500">Currently Active</Badge>;
    }
    
    const now = new Date();
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (now < from) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    
    if (now > to) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    
    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Schedule
            </CardTitle>
            <CardDescription>
              Configure when {paymentConfig.display_name} should be active
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Schedule Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="schedule-enabled">Enable Time-based Scheduling</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, this payment method will only be active during the specified time period
            </p>
          </div>
          <Switch
            id="schedule-enabled"
            checked={scheduleEnabled}
            onCheckedChange={setScheduleEnabled}
          />
        </div>

        {scheduleEnabled && (
          <>
            {/* From Date */}
            <div className="space-y-2">
              <Label htmlFor="from-date">Active From</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="from-date"
                  type="datetime-local"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label htmlFor="to-date">Active Until</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="to-date"
                  type="datetime-local"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>

            {/* Schedule Status */}
            {fromDate && toDate && (
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Schedule Status</p>
                    <p className="text-sm text-muted-foreground">
                      {isCurrentlyActive() 
                        ? `Currently active until ${new Date(toDate).toLocaleString()}`
                        : new Date(fromDate) > new Date()
                          ? `Will be active from ${new Date(fromDate).toLocaleString()} to ${new Date(toDate).toLocaleString()}`
                          : `Was active from ${new Date(fromDate).toLocaleString()} to ${new Date(toDate).toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Schedule'}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
