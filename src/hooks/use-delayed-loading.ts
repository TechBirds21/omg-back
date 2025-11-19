import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDelayedLoadingOptions {
  minimumDelay?: number;
  preserveData?: boolean;
}

interface UseDelayedLoadingResult<T> {
  isLoading: boolean;
  isRefreshing: boolean;
  data: T | null;
  error: string | null;
  executeWithLoading: (
    asyncOperation: () => Promise<T>,
    options?: { isRefresh?: boolean; preserveData?: boolean }
  ) => Promise<void>;
  setData: (data: T | null) => void;
  clearError: () => void;
}

/**
 * Custom hook to manage loading states with anti-flicker behavior
 * - Delays showing loading states for fast operations (default 300ms)
 * - Supports background refresh indicators
 * - Can preserve existing data during refresh operations
 */
export function useDelayedLoading<T = any>(
  options: UseDelayedLoadingOptions = {}
): UseDelayedLoadingResult<T> {
  const { minimumDelay = 300, preserveData = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOperationInProgress = useRef(false);
  const dataRef = useRef<T | null>(null);

  // Keep dataRef in sync with data state
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithLoading = useCallback(
    async (
      asyncOperation: () => Promise<T>,
      operationOptions: { isRefresh?: boolean; preserveData?: boolean } = {}
    ) => {
      const { isRefresh = false, preserveData: localPreserveData = preserveData } = operationOptions;

      // Clear any previous errors
      setError(null);

      // If this is a refresh and we have data, show refresh indicator instead of full loading
      if (isRefresh && dataRef.current && localPreserveData) {
        setIsRefreshing(true);
      } else {
        // For new loads or when not preserving data, use delayed loading
        isOperationInProgress.current = true;

        // Start timer for minimum delay
        timeoutRef.current = setTimeout(() => {
          if (isOperationInProgress.current) {
            setIsLoading(true);
          }
        }, minimumDelay);

        // If not preserving data on new load, clear it
        if (!isRefresh && !localPreserveData) {
          setData(null);
        }
      }

      try {
        const result = await asyncOperation();
        
        // Clear timeout if operation completed before minimum delay
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Update data
        setData(result);
      } catch (err) {
        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        
      } finally {
        // Clean up loading states
        isOperationInProgress.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [minimumDelay, preserveData] // Now stable dependencies
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    isRefreshing,
    data,
    error,
    executeWithLoading,
    setData,
    clearError,
  };
}
