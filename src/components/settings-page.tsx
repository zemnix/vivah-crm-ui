import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import NotificationSettings from "@/components/notification-settings";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="p-6" data-testid="settings-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your notification preferences
          </p>
        </div>

        <div className="max-w-2xl">
          {/* Push Notification Settings */}
          <NotificationSettings />
        </div>
      </div>
    </DashboardLayout>
  );
}
