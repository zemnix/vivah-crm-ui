import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import notificationService from '@/services/notificationService';

export function useNotificationInit() {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log('🔔 [HOOK] useNotificationInit effect triggered:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id
    });

    if (isAuthenticated && user) {
      console.log('🔔 [HOOK] User authenticated, initializing notification service...');
      
      // Initialize notification service when user is authenticated
      notificationService.initialize().then((success) => {
        console.log('🔔 [HOOK] Notification service initialization result:', success);
      }).catch((error) => {
        console.error('🔔 [HOOK] Failed to initialize notification service:', error);
      });

      // Setup message listener for notification clicks
      notificationService.setupMessageListener((data) => {
        console.log('🔔 [HOOK] Notification clicked:', data);
        // Handle notification click - could navigate to specific page
        if (data.interactionId) {
          // Navigate to interactions page or specific interaction
          window.location.href = '/staff/interactions';
        }
      });
    } else {
      console.log('🔔 [HOOK] User not authenticated, skipping notification initialization');
    }
  }, [isAuthenticated, user]);

  return {
    isSupported: notificationService.isSupported(),
    permissionStatus: notificationService.getPermissionStatus(),
  };
}
