import { useEffect, useRef } from 'react';

/**
 * Hook to preserve scroll position during data refreshes
 * This ensures that when data is refreshed, the user stays at the same scroll position
 */
export function useScrollPreservation(isRefreshing: boolean) {
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    // Save scroll position when refresh starts
    if (isRefreshing) {
      scrollPositionRef.current = window.scrollY;
    } else {
      // Restore scroll position when refresh ends
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
  }, [isRefreshing]);

  // Also save scroll position on unmount
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
}
