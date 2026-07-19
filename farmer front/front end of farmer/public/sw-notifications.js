// Service Worker for HerbChain Notifications
const CACHE_NAME = 'herbchain-notifications-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('HerbChain notification service worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('HerbChain notification service worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'herbchain-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If HerbChain is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('herbchain') || client.url.includes('localhost')) {
          return client.focus();
        }
      }
      
      // If HerbChain is not open, open it
      if (clients.openWindow) {
        const dashboardUrl = notification.data?.url || self.registration.scope + 'dashboard';
        return clients.openWindow(dashboardUrl);
      }
    })
  );
});

// Handle push events (for future server-side notifications)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'herbchain-push',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Background sync handler
async function handleBackgroundSync() {
  try {
    // This would integrate with your sync logic
    console.log('Performing background sync for HerbChain');
    
    // Send a notification that background sync completed
    self.registration.showNotification('🔄 HerbChain Sync Complete', {
      body: 'Your herb records have been synced to the blockchain in the background.',
      icon: '/favicon.ico',
      tag: 'background-sync-complete',
      requireInteraction: false
    });
  } catch (error) {
    console.error('Background sync failed:', error);
    
    self.registration.showNotification('❌ HerbChain Background Sync Failed', {
      body: 'Failed to sync herb records in the background. Please open the app to retry.',
      icon: '/favicon.ico',
      tag: 'background-sync-failed',
      requireInteraction: true
    });
  }
}