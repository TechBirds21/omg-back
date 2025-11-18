// Error handling utilities for consistent error management across the application
// @ts-nocheck
import React from 'react';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  context?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Log error with context
  logError(error: Error | AppError, context?: string): AppError {
    const appError: AppError = {
      code: 'error' in error ? error.code || 'UNKNOWN_ERROR' : 'UNKNOWN_ERROR',
      message: error.message,
      details: 'details' in error ? error.details : error,
      timestamp: new Date(),
      context: context || 'Unknown'
    };

    this.errorLog.push(appError);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', appError);
    }

    // Send to external error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(appError);
    }

    return appError;
  }

  // Handle API errors
  handleApiError(error: any, context: string): AppError {
    let appError: AppError;

    if (error.response) {
      // Server responded with error status
      appError = {
        code: `API_ERROR_${error.response.status}`,
        message: error.response.data?.message || error.message,
        details: error.response.data,
        timestamp: new Date(),
        context
      };
    } else if (error.request) {
      // Request was made but no response received
      appError = {
        code: 'NETWORK_ERROR',
        message: 'Network error - no response received',
        details: error.request,
        timestamp: new Date(),
        context
      };
    } else {
      // Something else happened
      appError = {
        code: 'UNKNOWN_API_ERROR',
        message: error.message,
        details: error,
        timestamp: new Date(),
        context
      };
    }

    return this.logError(appError, context);
  }

  // Handle database errors
  handleDatabaseError(error: any, context: string): AppError {
    const appError: AppError = {
      code: 'DATABASE_ERROR',
      message: error.message || 'Database operation failed',
      details: error,
      timestamp: new Date(),
      context
    };

    return this.logError(appError, context);
  }

  // Handle payment errors
  handlePaymentError(error: any, context: string): AppError {
    const appError: AppError = {
      code: 'PAYMENT_ERROR',
      message: error.message || 'Payment processing failed',
      details: error,
      timestamp: new Date(),
      context
    };

    return this.logError(appError, context);
  }

  // Get error log
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Send error to external service
  private async sendToErrorService(error: AppError): Promise<void> {
    try {
      // This would integrate with services like Sentry, LogRocket, etc.
      // For now, we'll just log to console
      console.error('Production error:', error);
      
      // Example integration with external service:
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // });
    } catch (err) {
      console.error('Failed to send error to service:', err);
    }
  }
}

// React hook for error handling
export const useErrorHandler = () => {
  const errorHandler = ErrorHandler.getInstance();

  const handleError = (error: Error | AppError, context?: string) => {
    return errorHandler.logError(error, context);
  };

  const handleApiError = (error: any, context: string) => {
    return errorHandler.handleApiError(error, context);
  };

  const handleDatabaseError = (error: any, context: string) => {
    return errorHandler.handleDatabaseError(error, context);
  };

  const handlePaymentError = (error: any, context: string) => {
    return errorHandler.handlePaymentError(error, context);
  };

  return {
    handleError,
    handleApiError,
    handleDatabaseError,
    handlePaymentError,
    getErrorLog: () => errorHandler.getErrorLog(),
    clearErrorLog: () => errorHandler.clearErrorLog()
  };
};

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: AppError }> },
  { hasError: boolean; error: AppError | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: AppError } {
    const errorHandler = ErrorHandler.getInstance();
    const appError = errorHandler.logError(error, 'ErrorBoundary');
    
    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.logError(error, `ErrorBoundary: ${errorInfo.componentStack}`);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: AppError }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-sm font-medium">!</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
          <p className="text-sm text-gray-500">We're sorry for the inconvenience</p>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-md p-4 mb-4">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Error:</strong> {error.message}
        </p>
        <p className="text-xs text-gray-500">
          <strong>Code:</strong> {error.code}
        </p>
        <p className="text-xs text-gray-500">
          <strong>Context:</strong> {error.context}
        </p>
        <p className="text-xs text-gray-500">
          <strong>Time:</strong> {error.timestamp.toLocaleString()}
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Reload Page
        </button>
        <button
          onClick={() => window.history.back()}
          className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

// Utility functions for common error scenarios
export const createError = (code: string, message: string, details?: any): AppError => ({
  code,
  message,
  details,
  timestamp: new Date()
});

export const isNetworkError = (error: any): boolean => {
  return error.code === 'NETWORK_ERROR' || 
         error.message?.includes('Network Error') ||
         error.message?.includes('fetch');
};

export const isValidationError = (error: any): boolean => {
  return error.code?.includes('VALIDATION') || 
         error.message?.includes('validation') ||
         error.message?.includes('required');
};

export const isAuthError = (error: any): boolean => {
  return error.code?.includes('AUTH') || 
         error.code?.includes('UNAUTHORIZED') ||
         error.message?.includes('unauthorized') ||
         error.message?.includes('authentication');
};
