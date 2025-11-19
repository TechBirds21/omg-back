import React, { useState, useEffect } from 'react';
import { AlertCircle, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Connection monitor - test Python API instead of Supabase
async function testApiConnection(): Promise<boolean> {
  try {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
    const response = await fetch(`${API_BASE}/store/categories`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface ConnectionMonitorProps {
  showWhenConnected?: boolean;
}

export const ConnectionMonitor: React.FC<ConnectionMonitorProps> = ({ 
  showWhenConnected = false 
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = async () => {
    try {
      const isConnected = await testApiConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      setLastChecked(new Date());
    } catch (error) {
      setConnectionStatus('disconnected');
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Check when the page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Don't show anything if connected and showWhenConnected is false
  if (connectionStatus === 'connected' && !showWhenConnected) {
    return null;
  }

  // Don't show during initial check
  if (connectionStatus === 'checking') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {connectionStatus === 'connected' ? (
        <Alert className="border-green-200 bg-green-50">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Database connected
            {lastChecked && (
              <span className="text-xs block mt-1">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium">Connection Issue</div>
            <div className="text-sm">
              Unable to connect to database. Please check your internet connection.
            </div>
            {lastChecked && (
              <span className="text-xs block mt-1">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
            <button 
              onClick={checkConnection}
              className="text-xs underline mt-2 hover:no-underline"
            >
              Retry connection
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ConnectionMonitor;
