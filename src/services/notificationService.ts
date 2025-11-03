import apiClient from '../api/apiClient';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationStatus {
  hasActiveSubscriptions: boolean;
  subscriptionCount: number;
}

class NotificationService {
  private vapidPublicKey: string | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  // Initialize the notification service
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 [FRONTEND] Starting notification service initialization...');
      
      // Check if notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push notifications are not supported in this browser');
        return false;
      }

      console.log('🔔 [FRONTEND] Registering service worker...');
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🔔 [FRONTEND] Service Worker registered:', this.registration);

      console.log('🔔 [FRONTEND] Getting VAPID public key...');
      // Get VAPID public key from backend
      await this.getVapidPublicKey();

      console.log('🔔 [FRONTEND] Notification service initialized successfully:', {
        hasRegistration: !!this.registration,
        hasVapidKey: !!this.vapidPublicKey
      });

      return true;
    } catch (error) {
      console.error('🔔 [FRONTEND] Failed to initialize notification service:', error);
      return false;
    }
  }

  // Get VAPID public key from backend
  private async getVapidPublicKey(): Promise<void> {
    try {
      const response = await apiClient.get('/notifications/vapid-key');
      this.vapidPublicKey = response.data.data.publicKey;
      console.log('VAPID public key retrieved');
    } catch (error) {
      console.error('Failed to get VAPID public key:', error);
      throw error;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  // Check if notifications are supported and permitted
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Subscribe to push notifications
  async subscribe(): Promise<boolean> {
    try {
      console.log('🔔 [FRONTEND] Starting subscription process...');
      
      // Ensure service is initialized
      if (!this.registration || !this.vapidPublicKey) {
        console.log('🔔 [FRONTEND] Service not initialized, initializing now...', {
          hasRegistration: !!this.registration,
          hasVapidKey: !!this.vapidPublicKey
        });
        
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize notification service');
        }
      }

      console.log('🔔 [FRONTEND] Checking permission status...');
      if (this.getPermissionStatus() !== 'granted') {
        console.log('🔔 [FRONTEND] Requesting permission...');
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          console.log('🔔 [FRONTEND] Permission denied:', permission);
          throw new Error('Notification permission denied');
        }
      }

      console.log('🔔 [FRONTEND] Getting push subscription from browser...');
      // Get push subscription
      const subscription = await this.registration?.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey || '')
      });

      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      console.log('🔔 [FRONTEND] Browser subscription obtained:', {
        endpoint: subscription.endpoint,
        hasP256dh: !!subscription.getKey('p256dh'),
        hasAuth: !!subscription.getKey('auth')
      });

      // Convert browser PushSubscription to our format
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
          auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : ''
        }
      };

      console.log('🔔 [FRONTEND] Converted subscription data:', {
        endpoint: subscriptionData.endpoint,
        hasKeys: !!subscriptionData.keys,
        p256dhLength: subscriptionData.keys.p256dh.length,
        authLength: subscriptionData.keys.auth.length
      });

      // Send subscription to backend
      console.log('🔔 [FRONTEND] Sending subscription to backend...');
      await this.sendSubscriptionToBackend(subscriptionData);

      console.log('🔔 [FRONTEND] Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('🔔 [FRONTEND] Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.registration) {
        throw new Error('Notification service not initialized');
      }

      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        // Convert browser PushSubscription to our format
        const subscriptionData: PushSubscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
            auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : ''
          }
        };

        await subscription.unsubscribe();
        await this.removeSubscriptionFromBackend(subscriptionData);
        console.log('Successfully unsubscribed from push notifications');
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Send subscription to backend
  private async sendSubscriptionToBackend(subscription: PushSubscriptionData): Promise<void> {
    try {
      console.log('🔔 [FRONTEND] Preparing API request to /notifications/subscribe');
      
      const requestData = {
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          },
          userAgent: navigator.userAgent
        }
      };

      console.log('🔔 [FRONTEND] Request data:', {
        endpoint: requestData.subscription.endpoint,
        hasKeys: !!requestData.subscription.keys,
        userAgent: requestData.subscription.userAgent
      });

      console.log('🔔 [FRONTEND] Making API call...');
      const response = await apiClient.post('/notifications/subscribe', requestData);
      
      console.log('🔔 [FRONTEND] API response received:', {
        status: response.status,
        success: response.data.success,
        message: response.data.message
      });
    } catch (error: any) {
      console.error('🔔 [FRONTEND] Failed to send subscription to backend:', error);
      if (error.response) {
        console.error('🔔 [FRONTEND] Response error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  // Remove subscription from backend
  private async removeSubscriptionFromBackend(subscription: PushSubscriptionData): Promise<void> {
    try {
      await apiClient.post('/notifications/unsubscribe', {
        endpoint: subscription.endpoint
      });
    } catch (error) {
      console.error('Failed to remove subscription from backend:', error);
      throw error;
    }
  }

  // Get notification status
  async getNotificationStatus(): Promise<NotificationStatus> {
    try {
      const response = await apiClient.get('/notifications/status');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get notification status:', error);
      throw error;
    }
  }

  // Send test notification
  async sendTestNotification(title: string, body: string): Promise<void> {
    try {
      await apiClient.post('/notifications/test', {
        title,
        body
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }

  // Convert VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64urlString: string): Uint8Array {
    console.log('🔔 [FRONTEND] Converting VAPID key:', {
      originalLength: base64urlString.length,
      firstChars: base64urlString.substring(0, 20)
    });

    try {
      // Convert base64url to base64
      const base64String = base64urlString
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed
      const padded = base64String + '='.repeat((4 - base64String.length % 4) % 4);
      
      // Decode the base64 string
      const rawData = window.atob(padded);
      console.log('🔔 [FRONTEND] Decoded raw data length:', rawData.length);
      
      // Convert to Uint8Array
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      console.log('🔔 [FRONTEND] Successfully converted to Uint8Array:', {
        length: outputArray.length,
        firstBytes: Array.from(outputArray.slice(0, 10))
      });

      // Validate the key length (should be 65 bytes for P-256)
      if (outputArray.length !== 65) {
        console.warn('🔔 [FRONTEND] Warning: VAPID key length is not 65 bytes:', outputArray.length);
      }

      return outputArray;
    } catch (error) {
      console.error('🔔 [FRONTEND] Error converting VAPID key:', error);
      console.error('🔔 [FRONTEND] Problematic key:', base64urlString);
      throw error;
    }
  }

  // Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.registration) {
        return false;
      }

      const subscription = await this.registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Setup message listener for service worker messages
  setupMessageListener(callback: (data: any) => void): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
          callback(event.data.data);
        }
      });
    }
  }
}

export default new NotificationService();
