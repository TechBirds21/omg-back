// @ts-nocheck
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  rows?: number;
  showCards?: boolean;
  cardCount?: number;
  type?: 'default' | 'table' | 'cards' | 'dashboard';
}

/**
 * Reusable loading skeleton component for different layout types
 */
export function LoadingSkeleton({ 
  className, 
  rows = 5, 
  showCards = false, 
  cardCount = 4,
  type = 'default' 
}: LoadingSkeletonProps) {
  if (type === 'dashboard') {
    return (
      <div className={cn("p-6 space-y-6", className)}>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="bg-muted h-8 w-64 rounded animate-pulse"></div>
          
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(cardCount)].map((_, i) => (
              <div key={i} className="bg-muted h-32 rounded-lg animate-pulse"></div>
            ))}
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-muted h-96 rounded-lg animate-pulse"></div>
            <div className="bg-muted h-96 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className={cn("p-6", className)}>
        <div className="space-y-6">
          <div className="bg-muted h-8 w-64 rounded animate-pulse"></div>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}>
            {[...Array(cardCount)].map((_, i) => (
              <div key={i} className="bg-muted h-48 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={cn("p-6", className)}>
        <div className="space-y-6">
          {/* Header and filters skeleton */}
          <div className="flex justify-between items-center">
            <div className="bg-muted h-8 w-64 rounded animate-pulse"></div>
            <div className="bg-muted h-10 w-32 rounded animate-pulse"></div>
          </div>
          
          {/* Filter row skeleton */}
          <div className="flex gap-4">
            <div className="bg-muted h-10 flex-1 rounded animate-pulse"></div>
            <div className="bg-muted h-10 w-48 rounded animate-pulse"></div>
            <div className="bg-muted h-10 w-48 rounded animate-pulse"></div>
          </div>
          
          {/* Table skeleton */}
          <div className="bg-muted h-96 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div className={cn("p-6", className)}>
      <div className="space-y-4">
        <div className="bg-muted h-8 w-64 rounded animate-pulse"></div>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="bg-muted h-16 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

interface BackgroundRefreshIndicatorProps {
  isRefreshing: boolean;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Subtle background refresh indicator for when data is being refreshed
 */
export function BackgroundRefreshIndicator({
  isRefreshing,
  className,
  position = 'top-right',
  size = 'md'
}: BackgroundRefreshIndicatorProps) {
  if (!isRefreshing) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={cn(
      "fixed z-50 flex items-center justify-center",
      "bg-background/80 backdrop-blur-sm border rounded-full p-2",
      "shadow-lg transition-opacity duration-200",
      positionClasses[position],
      className
    )}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      <span className="sr-only">Refreshing data...</span>
    </div>
  );
}

interface InlineLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

/**
 * Inline loading spinner for small loading states
 */
export function InlineLoadingSpinner({
  size = 'md',
  className,
  text
}: InlineLoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}
