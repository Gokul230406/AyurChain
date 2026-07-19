// Service Worker for Offline Farm Certification System
const CACHE_NAME = 'farm-cert-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const CACHE_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/App.tsx',
  // Add other essential files
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('[SW] Installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activated successfully');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If online, return response and potentially cache it
          return response;
        })
        .catch(() => {
          // If offline, return cached data or offline message
          return new Response(
            JSON.stringify({
              offline: true,
              message: 'This request will be synced when online',
              timestamp: Date.now()
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle regular page requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-farm-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    console.log('[SW] Syncing offline data...');
    
    // This will be implemented to sync IndexedDB data
    const db = await openIndexedDB();
    const offlineData = await getOfflineSubmissions(db);
    
    for (const submission of offlineData) {
      try {
        const response = await fetch('/api/herbs/folders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          // Mark as synced and remove from offline storage
          await markAsSynced(db, submission.id);
          console.log('[SW] Synced submission:', submission.id);
        }
      } catch (error) {
        console.error('[SW] Sync failed for submission:', submission.id, error);
      }
    }
    
    console.log('[SW] Sync complete');
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// IndexedDB helpers (will be implemented)
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FarmCertDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create offline submissions store
      if (!db.objectStoreNames.contains('submissions')) {
        const store = db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('synced', 'synced');
      }
    };
  });
}

function getOfflineSubmissions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['submissions'], 'readonly');
    const store = transaction.objectStore('submissions');
    const index = store.index('synced');
    const request = index.getAll(false); // Get unsynced submissions
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function markAsSynced(db, submissionId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['submissions'], 'readwrite');
    const store = transaction.objectStore('submissions');
    const request = store.get(submissionId);
    
    request.onsuccess = () => {
      const submission = request.result;
      submission.synced = true;
      submission.syncedAt = Date.now();
      
      const updateRequest = store.put(submission);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}