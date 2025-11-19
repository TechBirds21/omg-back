import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Home,
  ShoppingCart,
  BarChart3,
  Package,
  Users,
  RefreshCw,
  Settings,
  Bell,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';

interface StoreBillingHeaderProps {
  activeView: string;
  setActiveView: (view: 'billing' | 'reports' | 'inventory' | 'customers') => void;
  currentDate: Date;
  itemsCount: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const StoreBillingHeader = ({
  activeView,
  setActiveView,
  currentDate,
  itemsCount,
  onRefresh,
  isRefreshing = false
}: StoreBillingHeaderProps) => {
  return (
    <div className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
      <div className="px-4 md:px-6 lg:px-8 py-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-light text-stone-900 tracking-tight">
                O Maguva POS
              </h1>
              <p className="text-xs text-stone-500 font-light">
                {format(currentDate, 'EEEE, MMMM d, yyyy • HH:mm')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="hidden md:flex"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="ml-2">Refresh</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {activeView === 'billing' && itemsCount > 0 && (
              <Badge variant="secondary" className="hidden md:flex">
                <ShoppingCart className="w-3 h-3 mr-1" />
                {itemsCount} items
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          <Button
            variant={activeView === 'billing' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('billing')}
            className={`flex-shrink-0 ${
              activeView === 'billing'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Sale</span>
            <span className="sm:hidden">Sale</span>
          </Button>

          <Button
            variant={activeView === 'reports' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('reports')}
            className={`flex-shrink-0 ${
              activeView === 'reports'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </Button>

          <Button
            variant={activeView === 'inventory' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('inventory')}
            className={`flex-shrink-0 ${
              activeView === 'inventory'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4 mr-2" />
            Inventory
          </Button>

          <Button
            variant={activeView === 'customers' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('customers')}
            className={`flex-shrink-0 ${
              activeView === 'customers'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Customers
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreBillingHeader;
