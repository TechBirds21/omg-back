// Utility to retry dynamic imports to avoid transient chunk load errors
export function retryImport<T>(
  factory: () => Promise<T>,
  retries: number = 3,
  intervalMs: number = 1000
): () => Promise<T> {
  return () =>
    new Promise<T>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            
            if (remaining <= 0) {
              
              // Force page reload as last resort for chunk loading errors
              if (error?.message?.includes('dynamically imported module') || 
                  error?.message?.includes('Loading chunk') ||
                  error?.message?.includes('Failed to fetch')) {
                
                window.location.reload();
                return;
              }
              reject(error);
            } else {
              setTimeout(() => attempt(remaining - 1), intervalMs);
            }
          });
      };
      attempt(retries);
    });
}


