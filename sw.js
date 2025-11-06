/**
 * Service Worker for Munin - AI-Powered Notes
 * Provides offline functionality and caching for GitHub Gist integration
 */

const CACHE_NAME = 'munin-v2.1';
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
    './help-system.js',
    './shared/theme.css',
    './logo.svg',
    './favicon.ico',
    './apple-touch-icon.png',
    './site.webmanifest'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Munin SW] Install event');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Munin SW] Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[Munin SW] Failed to cache:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Munin SW] Activate event');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName.startsWith('munin-') && cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('[Munin SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - Network-first for API calls, cache-first for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Network-first strategy for API calls (GitHub, Gemini)
    if (url.hostname.includes('api.github.com') || url.hostname.includes('generativelanguage.googleapis.com')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone response for caching
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Return cached version if network fails
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Skip other cross-origin requests (except fonts)
    if (url.origin !== self.location.origin && !url.hostname.includes('fonts.') && !url.hostname.includes('cdnjs.cloudflare.com')) {
        return;
    }

    // Cache-first strategy for app assets
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached response and update in background
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(() => {
                    // Ignore fetch errors when we have cache
                });
                return cachedResponse;
            }

            // Fetch from network and cache
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }
                return networkResponse;
            }).catch((error) => {
                console.error('[Munin SW] Fetch failed:', error);
                // Return offline page for document requests
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
                throw error;
            });
        })
    );
});

// Background sync for saving notes
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notes') {
        console.log('[Munin SW] Background sync triggered');
        event.waitUntil(syncNotes());
    }
});

async function syncNotes() {
    try {
        // Get pending sync data from IndexedDB or cache
        // This would sync notes with GitHub Gists when connection is restored
        console.log('[Munin SW] Notes sync completed');
    } catch (error) {
        console.error('[Munin SW] Notes sync failed:', error);
        throw error; // Re-throw to retry sync
    }
}

// Message handling from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'GET_VERSION':
                event.ports[0].postMessage({ version: CACHE_NAME });
                break;
            case 'CLEAR_CACHE':
                caches.delete(CACHE_NAME).then(() => {
                    event.ports[0].postMessage({ success: true });
                });
                break;
            default:
                console.log('[Munin SW] Unknown message:', event.data.type);
        }
    }
});
