"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Users2, 
  User, 
  Building2, 
  Save, 
  AlertTriangle,
  Mail,
  MessageSquare,
  ArrowRight,
  Sparkles,
  SendHorizonal,
  CheckCircle2
} from 'lucide-react';
import { useTeams } from '@/hooks/useTeams';
import { Team, NotificationChannel } from '@/lib/teams';
import { 
  useNotificationRecipients, 
  EventRecipientConfig,
  DEFAULT_TEAM_ASSIGNMENTS as SMART_DEFAULTS
} from '@/hooks/useNotificationRecipients';
import { TeamMultiSelect } from '@/components/shared/TeamMultiSelect';
import { UserMultiSelect } from '@/components/shared/UserMultiSelect';
import { EventKey, EVENT_KEY_LABELS, TargetType } from '@/lib/teams';
import { cn } from '@/lib/utils';
import { testNotificationSystem } from '@/lib/notificationSender';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';

export function NotificationRecipientsSection() {
  const { teams, loading: teamsLoading } = useTeams();
  const { structureId } = useStructureId();
  const [activeChannel, setActiveChannel] = useState<NotificationChannel>('email');
  const { 
    config, 
    loading, 
    updateEvent, 
    toggleEventEnabled,
    save, 
    hasChanges,
    hasNoRecipients 
  } = useNotificationRecipients(activeChannel);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<EventKey | null>(null);
  const [testSuccess, setTestSuccess] = useState<EventKey | null>(null);

  const eventKeys: EventKey[] = [
    'new_appointment',
    'cancel_appointment',
    'no_show',
    'urgent_alert',
    'daily_summary',
  ];

  // Create team name lookup
  const teamNameMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach(t => map.set(t.id, t));
    return map;
  }, [teams]);

  // Find teams by name for smart defaults
  const getTeamIdsByNames = (names: string[]): string[] => {
    return teams
      .filter(t => names.includes(t.name) && t.is_active)
      .map(t => t.id);
  };

  const handleApplySmartDefaults = (eventKey: EventKey) => {
    const defaultTeamNames = SMART_DEFAULTS[eventKey];
    if (defaultTeamNames.length === 0) {
      return;
    }
    const teamIds = getTeamIdsByNames(defaultTeamNames);
    if (teamIds.length > 0) {
      updateEvent(eventKey, 'team', teamIds);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await save();
    setSaving(false);
  };

  const handleTestNotification = async (eventKey: EventKey) => {
    if (!structureId) {
      toast.error('Structure non trouvée');
      return;
    }
    
    setTesting(eventKey);
    setTestSuccess(null);
    
    try {
      const result = await testNotificationSystem(structureId, eventKey);
      
      if (result.success) {
        const emailSent = result.details?.email?.sent ?? (activeChannel === 'email' ? result.sent : 0);
        const smsSent = result.details?.sms?.sent ?? (activeChannel === 'sms' ? result.sent : 0);
        
        if (emailSent > 0 || smsSent > 0) {
          const parts = [];
          if (emailSent > 0) parts.push(`${emailSent} email(s)`);
          if (smsSent > 0) parts.push(`${smsSent} SMS`);
          toast.success(`Test réussi: ${parts.join(' et ')} envoyé(s)`);
          setTestSuccess(eventKey);
          setTimeout(() => setTestSuccess(null), 3000);
        } else {
          toast.info('Aucun destinataire configuré pour cet événement');
        }
      } else {
        toast.error(result.error || 'Échec du test');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Erreur lors du test');
    } finally {
      setTesting(null);
    }
  };

  if (loading || teamsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Destinataires par événement
        </CardTitle>
        <CardDescription>
          Définissez qui reçoit les notifications pour chaque type d'événement. 
          Configurez séparément les destinataires email et SMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as NotificationChannel)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-6 space-y-6">
            {eventKeys.map(eventKey => (
              <EventRecipientRow
                key={eventKey}
                eventKey={eventKey}
                label={EVENT_KEY_LABELS[eventKey]}
                config={config[eventKey]}
                teams={teams}
                teamNameMap={teamNameMap}
                channel="email"
                onChange={(targetType, targetIds) => updateEvent(eventKey, targetType, targetIds)}
                onToggleEnabled={(enabled) => toggleEventEnabled(eventKey, enabled)}
                hasNoRecipients={hasNoRecipients(eventKey)}
                onApplyDefaults={() => handleApplySmartDefaults(eventKey)}
                defaultTeamNames={SMART_DEFAULTS[eventKey]}
                onTest={() => handleTestNotification(eventKey)}
                isTesting={testing === eventKey}
                testSuccess={testSuccess === eventKey}
              />
            ))}
          </TabsContent>

          <TabsContent value="sms" className="mt-6 space-y-6">
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                Les SMS sont envoyés aux numéros de téléphone des profils utilisateurs. 
                Assurez-vous que les numéros sont correctement renseignés dans les profils.
              </AlertDescription>
            </Alert>
            
            {eventKeys.map(eventKey => (
              <EventRecipientRow
                key={eventKey}
                eventKey={eventKey}
                label={EVENT_KEY_LABELS[eventKey]}
                config={config[eventKey]}
                teams={teams}
                teamNameMap={teamNameMap}
                channel="sms"
                onChange={(targetType, targetIds) => updateEvent(eventKey, targetType, targetIds)}
                onToggleEnabled={(enabled) => toggleEventEnabled(eventKey, enabled)}
                hasNoRecipients={hasNoRecipients(eventKey)}
                onApplyDefaults={() => handleApplySmartDefaults(eventKey)}
                defaultTeamNames={SMART_DEFAULTS[eventKey]}
                onTest={() => handleTestNotification(eventKey)}
                isTesting={testing === eventKey}
                testSuccess={testSuccess === eventKey}
              />
            ))}
          </TabsContent>
        </Tabs>

        {hasChanges && (
          <div className="sticky bottom-0 pt-4 bg-background">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2"
              size="lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer les destinataires ({activeChannel === 'email' ? 'Email' : 'SMS'})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EventRecipientRowProps {
  eventKey: EventKey;
  label: string;
  config: EventRecipientConfig;
  teams: Team[];
  teamNameMap: Map<string, Team>;
  channel: NotificationChannel;
  onChange: (targetType: TargetType, targetIds: string[]) => void;
  onToggleEnabled: (enabled: boolean) => void;
  hasNoRecipients: boolean;
  onApplyDefaults: () => void;
  defaultTeamNames: string[];
  onTest: () => void;
  isTesting: boolean;
  testSuccess: boolean;
}

function EventRecipientRow({ 
  eventKey, 
  label, 
  config, 
  teams, 
  teamNameMap,
  channel,
  onChange, 
  onToggleEnabled,
  hasNoRecipients,
  onApplyDefaults,
  defaultTeamNames,
  onTest,
  isTesting,
  testSuccess
}: EventRecipientRowProps) {
  const handleTargetTypeChange = (value: string) => {
    onChange(value as TargetType, []);
  };

  // Build readable summary
  const getSummaryText = (): string => {
    if (!config.isEnabled) return 'Désactivé';
    
    if (config.targetType === 'structure') {
      return 'Toute la structure';
    }
    
    if (config.targetType === 'team') {
      if (config.targetIds.length === 0) return 'Aucune équipe sélectionnée';
      const teamNames = config.targetIds
        .map(id => teamNameMap.get(id)?.name)
        .filter(Boolean)
        .join(', ');
      return teamNames || 'Équipes sélectionnées';
    }
    
    if (config.targetType === 'user') {
      if (config.targetIds.length === 0) return 'Aucun utilisateur sélectionné';
      return `${config.targetIds.length} utilisateur(s)`;
    }
    
    return '';
  };

  const ChannelIcon = channel === 'email' ? Mail : MessageSquare;

  return (
    <div className={cn(
      "p-4 border rounded-lg space-y-4 transition-all",
      !config.isEnabled && "opacity-60 bg-muted/30"
    )}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={config.isEnabled}
            onCheckedChange={onToggleEnabled}
            aria-label={`Activer les notifications ${channel} pour ${label}`}
          />
          <Label className="text-base font-medium">{label}</Label>
        </div>
        <div className="flex items-center gap-2">
          {config.isEnabled && !hasNoRecipients && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTest}
              disabled={isTesting}
              className="gap-1.5 h-8"
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : testSuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <SendHorizonal className="h-3.5 w-3.5" />
              )}
              {isTesting ? 'Envoi...' : testSuccess ? 'Envoyé !' : 'Tester'}
            </Button>
          )}
          <Badge variant={config.isEnabled ? "outline" : "secondary"} className="capitalize">
            {config.targetType === 'structure'
              ? 'Toute la structure'
              : config.targetType === 'team'
              ? `${config.targetIds.length} équipe(s)`
              : `${config.targetIds.length} utilisateur(s)`}
          </Badge>
        </div>
      </div>

      {/* Summary line */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
        <span className="font-medium">{label}</span>
        <ArrowRight className="h-3 w-3" />
        <span>{getSummaryText()}</span>
        {config.isEnabled && <ChannelIcon className="h-3 w-3 ml-auto" />}
      </div>

      {/* Warning if no recipients configured */}
      {hasNoRecipients && config.isEnabled && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Aucun destinataire configuré</span>
            {defaultTeamNames.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onApplyDefaults}
                className="gap-1 h-7"
              >
                <Sparkles className="h-3 w-3" />
                Appliquer défauts ({defaultTeamNames.join(', ')})
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Target type selection - only show if enabled */}
      {config.isEnabled && (
        <>
          <RadioGroup
            value={config.targetType}
            onValueChange={handleTargetTypeChange}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="structure" id={`${eventKey}-${channel}-structure`} />
              <Label htmlFor={`${eventKey}-${channel}-structure`} className="flex items-center gap-1.5 cursor-pointer">
                <Building2 className="h-4 w-4" />
                Toute la structure
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="team" id={`${eventKey}-${channel}-team`} />
              <Label htmlFor={`${eventKey}-${channel}-team`} className="flex items-center gap-1.5 cursor-pointer">
                <Users2 className="h-4 w-4" />
                Équipes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="user" id={`${eventKey}-${channel}-user`} />
              <Label htmlFor={`${eventKey}-${channel}-user`} className="flex items-center gap-1.5 cursor-pointer">
                <User className="h-4 w-4" />
                Individuels
              </Label>
            </div>
          </RadioGroup>

          {config.targetType === 'team' && (
            <TeamMultiSelect
              teams={teams.filter(t => t.is_active)}
              selectedIds={config.targetIds}
              onChange={(ids) => onChange('team', ids)}
              placeholder="Sélectionner les équipes..."
            />
          )}

          {config.targetType === 'user' && (
            <UserMultiSelect
              selectedIds={config.targetIds}
              onChange={(ids) => onChange('user', ids)}
              placeholder="Sélectionner les utilisateurs..."
            />
          )}
        </>
      )}
    </div>
  );
}
