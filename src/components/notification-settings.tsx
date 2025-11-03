import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import notificationService, { NotificationStatus } from '@/services/notificationService';

interface NotificationSettingsProps {
  className?: string;
}

export default function NotificationSettings({ className }: NotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if notifications are supported
      const supported = notificationService.isSupported();
      setIsSupported(supported);

      if (!supported) {
        setError('Push notifications are not supported in this browser');
        return;
      }

      // Get permission status
      const permission = notificationService.getPermissionStatus();
      setPermissionStatus(permission);

      // Check subscription status
      const subscribed = await notificationService.isSubscribed();
      setIsSubscribed(subscribed);

      // Get notification status from backend
      const status = await notificationService.getNotificationStatus();
      setNotificationStatus(status);

      // Initialize notification service
      await notificationService.initialize();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setError('Failed to initialize notification service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isSubscribed) {
        // Unsubscribe
        const success = await notificationService.unsubscribe();
        if (success) {
          setIsSubscribed(false);
          setNotificationStatus(prev => prev ? { ...prev, hasActiveSubscriptions: false, subscriptionCount: 0 } : null);
          toast.success('Notifications disabled successfully');
        } else {
          throw new Error('Failed to unsubscribe from notifications');
        }
      } else {
        // Subscribe
        const success = await notificationService.subscribe();
        if (success) {
          setIsSubscribed(true);
          setPermissionStatus('granted');
          setNotificationStatus(prev => prev ? { ...prev, hasActiveSubscriptions: true, subscriptionCount: 1 } : null);
          toast.success('Notifications enabled successfully');
        } else {
          throw new Error('Failed to subscribe to notifications');
        }
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to update notification settings');
      toast.error('Failed to update notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const permission = await notificationService.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        toast.success('Notification permission granted');
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      setError('Failed to request notification permission');
      toast.error('Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await notificationService.sendTestNotification(
        'Test Notification',
        'This is a test notification from your CRM'
      );

      toast.success('Test notification sent');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setError('Failed to send test notification');
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      default:
        return 'Not requested';
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Notification settings for your CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about scheduled calls and meetings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Browser Permission</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getPermissionStatusIcon()}
              {getPermissionStatusText()}
            </div>
          </div>
          {permissionStatus !== 'granted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestPermission}
              disabled={isLoading}
            >
              Request Permission
            </Button>
          )}
        </div>

        {/* Notification Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive reminders for scheduled calls and meetings
            </p>
          </div>
          <Switch
            className='cursor-pointer'
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permissionStatus !== 'granted'}
          />
        </div>

        {/* Status Information */}
        {notificationStatus && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="text-sm text-muted-foreground">
              <p>Active subscriptions: {notificationStatus.subscriptionCount}</p>
              <p>Status: {notificationStatus.hasActiveSubscriptions ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        )}

        {/* Test Notification */}
        {isSubscribed && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Test Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send a test notification to verify everything is working
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTestNotification}
              disabled={isLoading}
            >
              Send Test
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• You'll receive notifications 10 minutes, 5 minutes, and 1 minute before scheduled interactions</p>
          <p>• Notifications work even when the app is not open</p>
          <p>• You can disable notifications at any time</p>
        </div>
      </CardContent>
    </Card>
  );
}
