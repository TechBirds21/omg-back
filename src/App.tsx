// Built by Techbirds Consulting - https://techbirdsconsulting.com
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useLayoutEffect, Suspense, lazy, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { retryImport } from "@/lib/retryImport";
import { useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "./components/CartProvider";
import { WishlistProvider } from "./components/WishlistProvider";
import AdminAuth from "./components/AdminAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import ConnectionMonitor from "./components/ConnectionMonitor";

// Lazy load components for better performance
const Index = lazy(retryImport(() => import("./pages/Index")));
const Collections = lazy(retryImport(() => import("./pages/Collections")));
const NewCollections = lazy(retryImport(() => import("./pages/NewCollections")));
const ProductDetail = lazy(retryImport(() => import("./pages/ProductDetail")));
const Contact = lazy(retryImport(() => import("./pages/Contact")));
const NotFound = lazy(retryImport(() => import("./pages/NotFound")));
const ShippingInfo = lazy(retryImport(() => import("./pages/ShippingInfo")));
const ReturnsExchanges = lazy(retryImport(() => import("./pages/ReturnsExchanges")));
const PrivacyPolicy = lazy(retryImport(() => import("./pages/PrivacyPolicy")));
const TermsOfService = lazy(retryImport(() => import("./pages/TermsOfService")));
const Cart = lazy(retryImport(() => import("./pages/Cart")));
const Checkout = lazy(retryImport(() => import("./pages/Checkout")));
const Wishlist = lazy(retryImport(() => import("./pages/Wishlist")));
const OrderSuccess = lazy(retryImport(() => import("./pages/OrderSuccess")));
const TrackOrder = lazy(retryImport(() => import("./pages/TrackOrder")));
const Account = lazy(retryImport(() => import("./pages/Account")));
const OrderDetail = lazy(retryImport(() => import("./pages/OrderDetail")));
const PaymentSuccess = lazy(retryImport(() => import("./pages/PaymentSuccess")));
const PaymentFailure = lazy(retryImport(() => import("./pages/PaymentFailure")));
const About = lazy(retryImport(() => import("./pages/About")));
const BestSellers = lazy(retryImport(() => import("./pages/BestSellers")));
const Offers = lazy(retryImport(() => import("./pages/Offers")));
const Admin = lazy(retryImport(() => import("./pages/Admin")));
const AdminLogin = lazy(retryImport(() => import("./pages/AdminLogin")));
const AdminProtectedRoute = lazy(retryImport(() => import("./components/AdminProtectedRoute")));
const PaymentTest = lazy(retryImport(() => import("./pages/PaymentTest")));

// Lazy load admin pages
const Dashboard = lazy(retryImport(() => import("./pages/admin/Dashboard")));
const Orders = lazy(retryImport(() => import("./pages/admin/Orders")));
const Products = lazy(retryImport(() => import("./pages/admin/Products")));
const Categories = lazy(retryImport(() => import("./pages/admin/Categories")));
const Customers = lazy(retryImport(() => import("./pages/admin/Customers")));
const Vendors = lazy(retryImport(() => import("./pages/admin/Vendors")));
const Inventory = lazy(retryImport(() => import("./pages/admin/Inventory")));
const Deliveries = lazy(retryImport(() => import("./pages/admin/Deliveries")));
const DeliveryAreas = lazy(retryImport(() => import("./pages/admin/DeliveryAreas")));
const VendorOrders = lazy(retryImport(() => import("./pages/admin/VendorOrders")));
const VendorPerformance = lazy(retryImport(() => import("./pages/admin/VendorPerformance")));
const OffersAdmin = lazy(retryImport(() => import("./pages/admin/Offers")));
const Analytics = lazy(retryImport(() => import("./pages/admin/Analytics")));
const StockAlerts = lazy(retryImport(() => import("./pages/admin/StockAlerts")));
const PendingCancelledOrders = lazy(retryImport(() => import("./pages/admin/PendingCancelledOrders")));
const Testimonials = lazy(retryImport(() => import("./pages/admin/Testimonials")));
const CAReport = lazy(retryImport(() => import("./pages/admin/CAReport")));
const AboutAdmin = lazy(retryImport(() => import("./pages/admin/About")));
const Settings = lazy(retryImport(() => import("./pages/admin/Settings")));
const StoreSales = lazy(retryImport(() => import("./pages/admin/StoreSales")));
const Chat = lazy(retryImport(() => import("./pages/admin/Chat")));
const ContactSubmissions = lazy(retryImport(() => import("./pages/admin/ContactSubmissions")));
const Accounts = lazy(retryImport(() => import("./pages/admin/Accounts")));
const StoreBillingApp = lazy(retryImport(() => import("./pages/StoreBillingApp")));

// Optimized query client with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Component to scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  useEffect(() => {
    const prefetch = () => {
      const tasks = [
        () => import("./pages/Index"),
        () => import("./pages/Collections"),
        () => import("./pages/ProductDetail"),
        () => import("./pages/Checkout"),
        () => import("./pages/Account"),
      ];
      for (const t of tasks) {
        try { t(); } catch { /* ignore */ }
      }
    };
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(prefetch, { timeout: 2000 });
    } else {
      setTimeout(prefetch, 1200);
    }
  }, []);

  // Log a site visit once per session with coarse geolocation
  useEffect(() => {
    const key = `site_visit_logged_v1`;
    let shouldLog = true;
    try {
      const last = Number(sessionStorage.getItem(key) || '0');
      const now = Date.now();
      // Re-log if older than 1 hour
      if (last && now - last < 60 * 60 * 1000) shouldLog = false;
    } catch {}
    if (!shouldLog) return;
    const logVisit = async () => {
      // Visit tracking disabled - migrated to Python backend
      // TODO: Implement visit tracking via Python API if needed
      try { sessionStorage.setItem(key, String(Date.now())); } catch {}
      return;
      
      /* Original Supabase visit tracking - disabled
      try {
        // Track site visits for analytics
        // @ts-ignore - visits table
        const { error } = await supabase
          .from('visits')
          .insert({
            path: window.location.pathname,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString(),
            session_id: sessionStorage.getItem('session_id') || 'anonymous'
          });
        
        if (error) {
          console.warn('Failed to track visit:', error.message);
        }
      } catch (error) {
        console.warn('Visit tracking error:', error);
      }
      */
    };
    logVisit();
  }, []);

  // Presence: track online users across site
  useEffect(() => {
      try {
        const sidKey = 'site_session_id';
        let sid = sessionStorage.getItem(sidKey) || '';
        if (!sid) {
          sid = (crypto && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `sid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          sessionStorage.setItem(sidKey, sid);
        }
        const ch = supabase.channel('site-presence', { config: { presence: { key: sid } } });
        ch.on('presence', { event: 'sync' }, () => {
          try {
            const state = ch.presenceState() as Record<string, any[]>;
            const count = Object.values(state).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
            (window as any).__online_count = count;
          } catch {}
        });
        ch.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            try { await ch.track({ online_at: new Date().toISOString(), path: window.location.pathname }); } catch {}
          }
        });
        return () => { try { ch.unsubscribe(); } catch {} };
      } catch {
        return () => {};
      }
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WishlistProvider>
              <CartProvider>
                <ConnectionMonitor />
                <Toaster />
                <Sonner />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AdminAuth>
                    <ScrollToTop />
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/new-collections" element={<NewCollections />} />
                      <Route path="/collections" element={<Collections />} />
                      <Route path="/offers" element={<Offers />} />
                      <Route path="/best-sellers" element={<BestSellers />} />
                      <Route path="/product/:name" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/wishlist" element={<Wishlist />} />
                      <Route path="/track-order" element={<TrackOrder />} />
                      <Route path="/order-success" element={<OrderSuccess />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/account/order/:orderId" element={<OrderDetail />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/shipping-info" element={<ShippingInfo />} />
                      <Route path="/returns-exchanges" element={<ReturnsExchanges />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-service" element={<TermsOfService />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/payment-success" element={<PaymentSuccess />} />
                      <Route path="/payment-failure" element={<PaymentFailure />} />
                      <Route path="/admin-login" element={<AdminLogin />} />
                      <Route path="/store-billing" element={<StoreBillingApp />} />
                      <Route path="/billing" element={<StoreBillingApp />} />
                      <Route path="/admin" element={<AdminProtectedRoute><Admin /></AdminProtectedRoute>}>
                        <Route index element={<Dashboard />} />
                        <Route path="orders" element={<Orders />} />
                        <Route path="products" element={<Products />} />
                        <Route path="categories" element={<Categories />} />
                        <Route path="pending-cancelled-orders" element={<PendingCancelledOrders />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="vendors" element={<Vendors />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="deliveries" element={<Deliveries />} />
                        <Route path="delivery-areas" element={<DeliveryAreas />} />
                        <Route path="vendor-orders" element={<VendorOrders />} />
                        <Route path="vendor-performance" element={<VendorPerformance />} />
                        <Route path="offers" element={<OffersAdmin />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="stock-alerts" element={<StockAlerts />} />
                        <Route path="testimonials" element={<Testimonials />} />
                        <Route path="ca-report" element={<CAReport />} />
                        <Route path="about" element={<AboutAdmin />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="store-sales" element={<StoreSales />} />
                      <Route path="chat" element={<Chat />} />
                      <Route path="contact-submissions" element={<ContactSubmissions />} />
                      <Route path="accounts" element={<Accounts />} />
                      </Route>
                      <Route path="/payment-test" element={<PaymentTest />} />
                      <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AdminAuth>
                </BrowserRouter>
              </CartProvider>
            </WishlistProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
