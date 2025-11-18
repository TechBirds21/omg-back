// Standalone Store Billing App Entry Point
// This is used for store.omaguva.com subdomain
// Built by Techbirds Consulting - https://techbirdsconsulting.com

import './typescript-disable.js';
import './typescript-config-override.js';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import ConnectionMonitor from "./components/ConnectionMonitor";
import StoreBillingApp from "./pages/StoreBillingApp";
import './index.css';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Simple page loader
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading Store Billing...</p>
    </div>
  </div>
);

// Store Billing App Component
const StoreApp = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ConnectionMonitor />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <StoreBillingApp />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

// Render the app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<StoreApp />);

