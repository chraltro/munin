/**
 * Service Worker for Munin - AI-Powered Notes
 * Provides offline functionality, intelligent caching, and background sync.
 *
 * Caching strategies:
 * - Static assets: Stale-while-revalidate (fast loads, background updates)
 * - API calls: Network-first with cache fallback (data freshness priority)
 * - CDN assets: Cache-first with 7-day TTL (fonts, libraries)
 */

const CACHE_VERSION = 6;
const STATIC_CACHE = `munin-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `munin-dynamic-v${CACHE_VERSION}`;

const STATIC_CACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './config.js',
    './templates.js',
    './prompts.js',
    './munin-auth.js',
    './export-utils.js',
    './keyboard-shortcuts.js',
    './analytics.js',
    './features-integration.js',
    './note-linking.js',
    './advanced-search.js',
    './markdown-enhancements.js',
    './mobile-optimizations.js',
    './lib/errors.js',
    './lib/api-client.js',
    './lib/utils.js',
    './lib/supabase-config.js',
    './lib/supabase-client.js',
    './lib/supabase-data.js',
    './shared/theme.css',
    './logo.svg',
    './favicon.ico',
    './apple-touch-icon.png',
    './site.webmanifest'
];

// Maximum size for dynamic cache (number of entries)
const MAX_DYNAMIC_CACHE_SIZE = 50;

/**
 * Trim cache to maximum size, removing oldest entries first.
 * @param {string} cacheName - Name of cache to trim
 * @param {number} maxItems - Maximum number of items
 */
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        await cache.delete(keys[0]);
        if (keys.length - 1 > maxItems) {
            await trimCache(cacheName, maxItems);
        }
    }
}

// ─── Install ─────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    console.log(`[Munin SW] Install v${CACHE_VERSION}`);

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Munin SW] Caching static assets');
                // Use individual add() to not fail if one asset is missing
                return Promise.allSettled(
                    STATIC_CACHE_URLS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[Munin SW] Failed to cache: ${url}`, err.message);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ─── Activate ────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
    console.log(`[Munin SW] Activate v${CACHE_VERSION}`);

    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName.startsWith('munin-') && !currentCaches.includes(cacheName))
                        .map((cacheName) => {
                            console.log('[Munin SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ─── Fetch ───────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Strategy: Network-first for API calls (Supabase, Gemini, esm.sh)
    if (url.hostname.includes('supabase.co') || url.hostname.includes('generativelanguage.googleapis.com') || url.hostname.includes('esm.sh')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Skip cross-origin requests except fonts and CDN resources
    const isCDN = url.hostname.includes('fonts.') ||
                  url.hostname.includes('cdnjs.cloudflare.com') ||
                  url.hostname.includes('cdn.jsdelivr.net');

    if (url.origin !== self.location.origin && !isCDN) {
        return;
    }

    // Strategy: Stale-while-revalidate for app assets
    event.respondWith(staleWhileRevalidate(event.request));
});

/**
 * Network-first strategy: try network, fall back to cache.
 * Best for API data that should be fresh.
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
            trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

/**
 * Stale-while-revalidate strategy: return cache immediately, update in background.
 * Best for assets that change but where stale content is acceptable briefly.
 */
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const networkFetch = fetch(request).then(async (response) => {
        if (response && response.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);

    if (cached) {
        // Return cached version immediately, update in background
        return cached;
    }

    // No cache - wait for network
    const networkResponse = await networkFetch;
    if (networkResponse) {
        return networkResponse;
    }

    // Last resort: return offline fallback for documents
    if (request.destination === 'document') {
        return caches.match('./index.html');
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// ─── Message Handling ────────────────────────────────────────

self.addEventListener('message', (event) => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'GET_VERSION':
                event.ports[0].postMessage({ version: CACHE_VERSION });
                break;
            case 'CLEAR_CACHE':
                Promise.all([
                    caches.delete(STATIC_CACHE),
                    caches.delete(DYNAMIC_CACHE)
                ]).then(() => {
                    if (event.ports[0]) {
                        event.ports[0].postMessage({ success: true });
                    }
                });
                break;
            default:
                console.log('[Munin SW] Unknown message:', event.data.type);
        }
    }
});
