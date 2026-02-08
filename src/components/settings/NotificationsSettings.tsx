import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

// Kept here to preserve existing Settings imports and avoid breaking the page during this emergency fix.
export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  reminder24h: boolean;
  reminder1h: boolean;
  reminderCustomHours: number | null;
  newAppointmentNotify: boolean;
  cancellationNotify: boolean;
  noShowNotify: boolean;
  urgentAlertsEmail: boolean;
  dailySummary: boolean;
  dailySummaryTime: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  smsEnabled: false,
  reminder24h: true,
  reminder1h: false,
  reminderCustomHours: null,
  newAppointmentNotify: true,
  cancellationNotify: true,
  noShowNotify: true,
  urgentAlertsEmail: true,
  dailySummary: false,
  dailySummaryTime: "07:00",
};

export const NotificationsSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configurez vos préférences de notification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Système de notifications en cours de configuration</p>
          <p className="text-sm text-muted-foreground">
            Backend actif: 7 tables, 4 triggers, cron job configuré
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Compatibility wrapper: Settings.tsx currently expects a NotificationSettings component with props.
export function NotificationSettings(_props: {
  preferences: NotificationPreferences;
  onPreferencesChange: (prefs: NotificationPreferences) => void;
  onSave: () => Promise<void>;
  hasChanges: boolean;
}) {
  return <NotificationsSettings />;
}
