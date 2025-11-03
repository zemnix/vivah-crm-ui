// Service Worker for Push Notifications
const CACHE_NAME = 'crm-notifications-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'CRM Notification',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'crm-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        data: data.data || {}
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Handle notification click
  const notificationData = event.notification.data || {};
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // If there's already a window open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          
          // Send message to the client about the notification click
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData
          });
          
          return;
        }
      }
      
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        let url = '/';
        
        // Navigate to specific page based on notification data
        if (notificationData.interactionId) {
          url = `/interactions`;
        }
        
        return self.clients.openWindow(url);
      }
    })
  );
});

// Background sync for failed notifications
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Handle any pending notification tasks
      console.log('Processing background sync for notifications')
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
