import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Clock, Loader2 } from 'lucide-react';

const RetailerOrders = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
        <CardContent className="p-16 text-center">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center relative">
            <ShoppingCart className="h-16 w-16 text-purple-600" />
            <div className="absolute -bottom-2 -right-2 p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-purple-800 to-indigo-800 bg-clip-text text-transparent mb-4">
            Retailer Orders Management
          </h1>
          
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full shadow-lg mb-6">
            Coming Soon
          </div>
          
          <p className="text-slate-600 text-lg mb-2">
            This feature is currently under development
          </p>
          <p className="text-slate-500 mb-8">
            Manage and track retailer orders with comprehensive order management capabilities
          </p>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="font-semibold text-blue-800 mb-2">📋 Order Tracking</div>
              <p className="text-sm text-blue-600">Track retailer orders in real-time</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="font-semibold text-purple-800 mb-2">💰 Payment Status</div>
              <p className="text-sm text-purple-600">Monitor payment and fulfillment</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="font-semibold text-green-800 mb-2">📊 Analytics</div>
              <p className="text-sm text-green-600">View retailer order analytics</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
              <div className="font-semibold text-orange-800 mb-2">🚚 Delivery Management</div>
              <p className="text-sm text-orange-600">Manage deliveries to retailers</p>
            </div>
          </div>
          
          <p className="text-slate-400 text-sm mt-8">
            Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetailerOrders;

