// @ts-nocheck
// Analytics and monitoring utilities for comprehensive tracking
import React from 'react';

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  page: string;
  userAgent: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  page: string;
  sessionId: string;
}

export interface BusinessMetric {
  metric: string;
  value: number;
  timestamp: Date;
  context?: Record<string, any>;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private businessMetrics: BusinessMetric[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceTracking();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // User Behavior Tracking
  trackEvent(event: string, properties: Record<string, any> = {}): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: new Date(),
      sessionId: this.sessionId,
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.events.push(analyticsEvent);
    this.sendToAnalytics(analyticsEvent);
  }

  // Page View Tracking
  trackPageView(page: string, properties: Record<string, any> = {}): void {
    this.trackEvent('page_view', {
      page,
      referrer: document.referrer,
      ...properties
    });
  }

  // User Interaction Tracking
  trackClick(element: string, properties: Record<string, any> = {}): void {
    this.trackEvent('click', {
      element,
      ...properties
    });
  }

  trackFormSubmit(formName: string, properties: Record<string, any> = {}): void {
    this.trackEvent('form_submit', {
      form_name: formName,
      ...properties
    });
  }

  trackSearch(query: string, results: number, properties: Record<string, any> = {}): void {
    this.trackEvent('search', {
      query,
      results_count: results,
      ...properties
    });
  }

  // E-commerce Tracking
  trackAddToCart(productId: string, productName: string, price: number, quantity: number = 1): void {
    this.trackEvent('add_to_cart', {
      product_id: productId,
      product_name: productName,
      price,
      quantity,
      currency: 'INR'
    });
  }

  trackRemoveFromCart(productId: string, productName: string, price: number, quantity: number = 1): void {
    this.trackEvent('remove_from_cart', {
      product_id: productId,
      product_name: productName,
      price,
      quantity,
      currency: 'INR'
    });
  }

  trackPurchase(orderId: string, total: number, items: any[], properties: Record<string, any> = {}): void {
    this.trackEvent('purchase', {
      order_id: orderId,
      total,
      currency: 'INR',
      items,
      ...properties
    });
  }

  trackPaymentInitiated(orderId: string, amount: number, paymentMethod: string): void {
    this.trackEvent('payment_initiated', {
      order_id: orderId,
      amount,
      payment_method: paymentMethod,
      currency: 'INR'
    });
  }

  trackPaymentCompleted(orderId: string, amount: number, paymentMethod: string, transactionId: string): void {
    this.trackEvent('payment_completed', {
      order_id: orderId,
      amount,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      currency: 'INR'
    });
  }

  trackPaymentFailed(orderId: string, amount: number, paymentMethod: string, error: string): void {
    this.trackEvent('payment_failed', {
      order_id: orderId,
      amount,
      payment_method: paymentMethod,
      error,
      currency: 'INR'
    });
  }

  // Performance Monitoring
  private initializePerformanceTracking(): void {
    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.trackPerformance('page_load_time', loadTime);
    });

    // Track first contentful paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.trackPerformance('first_contentful_paint', entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    }

    // Track largest contentful paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackPerformance('largest_contentful_paint', entry.startTime);
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }

  trackPerformance(name: string, value: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      page: window.location.pathname,
      sessionId: this.sessionId
    };

    this.performanceMetrics.push(metric);
    this.sendToPerformanceTracking(metric);
  }

  // Business Metrics Tracking
  trackBusinessMetric(metric: string, value: number, context?: Record<string, any>): void {
    const businessMetric: BusinessMetric = {
      metric,
      value,
      timestamp: new Date(),
      context
    };

    this.businessMetrics.push(businessMetric);
    this.sendToBusinessMetrics(businessMetric);
  }

  // Order-related business metrics
  trackOrderCreated(orderId: string, amount: number, customerType: string = 'new'): void {
    this.trackBusinessMetric('order_created', 1, {
      order_id: orderId,
      amount,
      customer_type: customerType
    });
  }

  trackOrderCompleted(orderId: string, amount: number, processingTime: number): void {
    this.trackBusinessMetric('order_completed', 1, {
      order_id: orderId,
      amount,
      processing_time: processingTime
    });
  }

  trackRevenue(amount: number, source: string = 'sales'): void {
    this.trackBusinessMetric('revenue', amount, {
      source,
      currency: 'INR'
    });
  }

  trackCustomerAcquisition(customerId: string, source: string = 'organic'): void {
    this.trackBusinessMetric('customer_acquisition', 1, {
      customer_id: customerId,
      source
    });
  }

  // Error Tracking
  trackError(error: string, context: Record<string, any> = {}): void {
    this.trackEvent('error', {
      error_message: error,
      ...context
    });
  }

  // Data Export
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  getBusinessMetrics(): BusinessMetric[] {
    return [...this.businessMetrics];
  }

  // Send data to external services
  private async sendToAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      // Send to Supabase analytics table
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('analytics_events').insert({
        event: event.event,
        properties: event.properties,
        timestamp: event.timestamp.toISOString(),
        session_id: event.sessionId,
        page: event.page,
        user_agent: event.userAgent
      });
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
    }
  }

  private async sendToPerformanceTracking(metric: PerformanceMetric): Promise<void> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('performance_metrics').insert({
        name: metric.name,
        value: metric.value,
        timestamp: metric.timestamp.toISOString(),
        page: metric.page,
        session_id: metric.sessionId
      });
    } catch (error) {
      console.warn('Failed to send performance metric:', error);
    }
  }

  private async sendToBusinessMetrics(metric: BusinessMetric): Promise<void> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('business_metrics').insert({
        metric: metric.metric,
        value: metric.value,
        timestamp: metric.timestamp.toISOString(),
        context: metric.context
      });
    } catch (error) {
      console.warn('Failed to send business metric:', error);
    }
  }
}

// React hook for analytics
export const useAnalytics = () => {
  const analytics = AnalyticsService.getInstance();

  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackClick: analytics.trackClick.bind(analytics),
    trackFormSubmit: analytics.trackFormSubmit.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackAddToCart: analytics.trackAddToCart.bind(analytics),
    trackRemoveFromCart: analytics.trackRemoveFromCart.bind(analytics),
    trackPurchase: analytics.trackPurchase.bind(analytics),
    trackPaymentInitiated: analytics.trackPaymentInitiated.bind(analytics),
    trackPaymentCompleted: analytics.trackPaymentCompleted.bind(analytics),
    trackPaymentFailed: analytics.trackPaymentFailed.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackBusinessMetric: analytics.trackBusinessMetric.bind(analytics),
    trackOrderCreated: analytics.trackOrderCreated.bind(analytics),
    trackOrderCompleted: analytics.trackOrderCompleted.bind(analytics),
    trackRevenue: analytics.trackRevenue.bind(analytics),
    trackCustomerAcquisition: analytics.trackCustomerAcquisition.bind(analytics),
    trackError: analytics.trackError.bind(analytics)
  };
};

// Higher-order component for automatic page tracking
export const withAnalytics = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const analytics = useAnalytics();

    React.useEffect(() => {
      analytics.trackPageView(window.location.pathname);
    }, [analytics]);

    return <Component {...props} />;
  };
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const analytics = AnalyticsService.getInstance();

  const measurePerformance = (name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    analytics.trackPerformance(name, end - start);
  };

  const measureAsyncPerformance = async (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    analytics.trackPerformance(name, end - start);
    return result;
  };

  return {
    measurePerformance,
    measureAsyncPerformance,
    trackPerformance: analytics.trackPerformance.bind(analytics)
  };
};

export default AnalyticsService;
