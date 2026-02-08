import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Mail, MessageSquare, Clock, CalendarClock, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NotificationHistorySection } from './NotificationHistorySection';
import { NotificationRecipientsSection } from './NotificationRecipientsSection';

interface NotificationPreferences {
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

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onPreferencesChange: (prefs: NotificationPreferences) => void;
  onSave: () => Promise<void>;
  hasChanges: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
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
  dailySummaryTime: '07:00',
};

export function NotificationSettings({
  preferences,
  onPreferencesChange,
  onSave,
  hasChanges,
}: NotificationSettingsProps) {
  const [saving, setSaving] = useState(false);

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    onPreferencesChange({ ...preferences, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      toast.success('Préférences de notification sauvegardées');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Canaux de notification
          </CardTitle>
          <CardDescription>
            Choisissez comment recevoir vos notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium">Notifications par email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les alertes et rappels par email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) => updatePref('emailEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <MessageSquare className="h-5 w-5 text-success" />
              </div>
              <div>
                <Label className="font-medium">Notifications SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les rappels par SMS (crédit requis)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Bientôt</Badge>
              <Switch
                checked={preferences.smsEnabled}
                onCheckedChange={(checked) => updatePref('smsEnabled', checked)}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Rappels de rendez-vous
          </CardTitle>
          <CardDescription>
            Configurez les délais de rappel pour les patients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors",
                preferences.reminder24h && "border-primary bg-primary/5"
              )}
              onClick={() => updatePref('reminder24h', !preferences.reminder24h)}
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">24 heures avant</p>
                  <p className="text-xs text-muted-foreground">Rappel standard</p>
                </div>
              </div>
              {preferences.reminder24h && <Check className="h-5 w-5 text-primary" />}
            </div>

            <div 
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors",
                preferences.reminder1h && "border-primary bg-primary/5"
              )}
              onClick={() => updatePref('reminder1h', !preferences.reminder1h)}
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">1 heure avant</p>
                  <p className="text-xs text-muted-foreground">Rappel de dernière minute</p>
                </div>
              </div>
              {preferences.reminder1h && <Check className="h-5 w-5 text-primary" />}
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Rappel personnalisé</Label>
              <p className="text-xs text-muted-foreground">
                Définir un délai de rappel personnalisé (en heures)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={168}
                value={preferences.reminderCustomHours || ''}
                onChange={(e) => updatePref('reminderCustomHours', e.target.value ? parseInt(e.target.value) : null)}
                className="w-20"
                placeholder="Ex: 48"
              />
              <span className="text-sm text-muted-foreground">heures</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alertes et événements
          </CardTitle>
          <CardDescription>
            Notifications pour les événements importants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Nouveau rendez-vous</Label>
              <p className="text-xs text-muted-foreground">
                Notification à chaque nouvelle prise de RDV
              </p>
            </div>
            <Switch
              checked={preferences.newAppointmentNotify}
              onCheckedChange={(checked) => updatePref('newAppointmentNotify', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Annulation de rendez-vous</Label>
              <p className="text-xs text-muted-foreground">
                Alerte lorsqu'un patient annule
              </p>
            </div>
            <Switch
              checked={preferences.cancellationNotify}
              onCheckedChange={(checked) => updatePref('cancellationNotify', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Patients non venus</Label>
              <p className="text-xs text-muted-foreground">
                Alerte en cas de no-show
              </p>
            </div>
            <Switch
              checked={preferences.noShowNotify}
              onCheckedChange={(checked) => updatePref('noShowNotify', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-destructive">Alertes urgentes par email</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir immédiatement les alertes critiques
              </p>
            </div>
            <Switch
              checked={preferences.urgentAlertsEmail}
              onCheckedChange={(checked) => updatePref('urgentAlertsEmail', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé quotidien</CardTitle>
          <CardDescription>
            Recevoir un récapitulatif de votre journée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Switch
                checked={preferences.dailySummary}
                onCheckedChange={(checked) => updatePref('dailySummary', checked)}
              />
            </div>
            {preferences.dailySummary && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Heure d'envoi:</Label>
                <Select
                  value={preferences.dailySummaryTime}
                  onValueChange={(v) => updatePref('dailySummaryTime', v)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">06:00</SelectItem>
                    <SelectItem value="07:00">07:00</SelectItem>
                    <SelectItem value="08:00">08:00</SelectItem>
                    <SelectItem value="18:00">18:00</SelectItem>
                    <SelectItem value="20:00">20:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recipients Section */}
      <NotificationRecipientsSection />

      {/* History Section */}
      <NotificationHistorySection />

      {hasChanges && (
        <div className="sticky bottom-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full shadow-lg"
            size="lg"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder les préférences'}
          </Button>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_PREFERENCES as DEFAULT_NOTIFICATION_PREFERENCES };
export type { NotificationPreferences };
