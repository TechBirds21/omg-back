// TypeScript checking enabled for better type safety
// Built by Techbirds Consulting - https://techbirdsconsulting.com
import './typescript-disable.js';
import './typescript-config-override.js';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Removed Easebuzz dev helper

// Force-clear stale PWA caches and service workers on first visit (versioned)
const CACHE_CLEAR_VERSION = 'v6-2025-09-13-ts-fix'; // Updated version to clear all cached assets
const SESSION_CLEAR_KEY = 'app_cache_cleared_session_v1';
if (import.meta.env.PROD) {
  try {
    const key = `app_cache_cleared_${CACHE_CLEAR_VERSION}`;
    const alreadyCleared = localStorage.getItem(key);
    const sessionCleared = sessionStorage.getItem(SESSION_CLEAR_KEY);
    const urlHasForceClear = (() => {
      try { return new URL(window.location.href).searchParams.has('clear_cache'); } catch { return false; }
    })();
    if (!alreadyCleared || !sessionCleared || urlHasForceClear) {
      // Best-effort: unregister any existing service workers and wipe Cache Storage
      const clearCachesAndSW = async () => {
        try {
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
              try { await reg.unregister(); } catch {}
            }
          }
          if (typeof caches !== 'undefined' && caches.keys) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch {}
      };
      // Clear then mark and hard-reload once with a busting query param to avoid loop
      clearCachesAndSW().finally(() => {
        try { localStorage.setItem(key, '1'); } catch {}
        try { sessionStorage.setItem(SESSION_CLEAR_KEY, '1'); } catch {}
        const url = new URL(window.location.href);
        url.searchParams.delete('clear_cache');
        url.searchParams.set('_cb', Date.now().toString());
        window.location.replace(url.toString());
      });
    }
  } catch {}
}

// Register service worker for PWA capabilities
// Production SW registration guarded and cache-busted; add immediate claim
const ENABLE_SW = import.meta.env.VITE_ENABLE_SW === 'true';
if (ENABLE_SW && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(rs => {
      // If an older SW exists, unregister to avoid stale chunks
      rs.forEach(r => r.unregister());
      // Clear old caches
      caches?.keys?.().then(keys => keys.forEach(k => caches.delete(k)));
      // Register fresh SW (optional: comment out to disable SW entirely)
      navigator.serviceWorker.register('/sw.js').then(r => {
        r.update();
      }).catch(() => {});
    });
  });
}

// Performance monitoring in production
if (import.meta.env.PROD) {
  // Web Vitals monitoring
  // Disable verbose production console noise
  // Optionally report vitals to an endpoint instead of console
}

createRoot(document.getElementById("root")!).render(<App />);

// Handle dynamic import chunk load errors (navigation causing "something went wrong")
// Auto-reload once to recover from corrupted cache or interrupted chunk loads
window.addEventListener('error', (e) => {
  const msg = String((e as ErrorEvent)?.message || '');
  if (msg.includes('Loading chunk') || msg.includes('ChunkLoadError') || msg.includes('import()')) {
    const already = sessionStorage.getItem('reloaded_after_chunk_error');
    if (!already) {
      sessionStorage.setItem('reloaded_after_chunk_error', '1');
      location.reload();
    }
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const msg = String((e as PromiseRejectionEvent)?.reason?.message || '');
  if (msg.includes('Loading chunk') || msg.includes('ChunkLoadError') || msg.includes('import()')) {
    const already = sessionStorage.getItem('reloaded_after_chunk_error');
    if (!already) {
      sessionStorage.setItem('reloaded_after_chunk_error', '1');
      location.reload();
    }
  }
});

// Preconnect hints for common CDNs to reduce latency
const preconnects = [
  'https://api-preprod.phonepe.com',
];
for (const href of preconnects) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  (document.head || document.documentElement).appendChild(link);
}
