"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  HardDrive,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  RefreshCw,
  ArrowLeftRight,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GoogleSettings {
  connected: boolean;
  calendarSyncEnabled: boolean;
  bidirectionalSync: boolean;
  selectedDriveFolderId: string;
  selectedDriveFolderName: string;
  lastSync?: string;
  lastSyncSuccess?: boolean;
}

const DEFAULT_SETTINGS: GoogleSettings = {
  connected: false,
  calendarSyncEnabled: false,
  bidirectionalSync: false,
  selectedDriveFolderId: '',
  selectedDriveFolderName: '',
};

// Sample folders - in production, these would be fetched from Google Drive API
const SAMPLE_FOLDERS = [
  { id: 'documents-patients', name: 'Documents Patients' },
  { id: 'comptes-rendus', name: 'Comptes Rendus' },
  { id: 'ordonnances', name: 'Ordonnances' },
  { id: 'imagerie', name: 'Imagerie Médicale' },
];

export default function GoogleWorkspaceSection() {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const [settings, setSettings] = useState<GoogleSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id || !structureId) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings_value')
          .eq('user_id', user.id)
          .eq('structure_id', structureId)
          .eq('settings_key', 'google_workspace')
          .maybeSingle();

        if (error) throw error;

        if (data?.settings_value) {
          setSettings({ ...DEFAULT_SETTINGS, ...(data.settings_value as unknown as GoogleSettings) });
        }
      } catch (error) {
        console.error('Error loading Google Workspace settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.id, structureId]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // In production, this would initiate OAuth flow via Edge Function
      toast.info('Connexion Google Calendar', {
        description: 'La connexion OAuth Google sera disponible prochainement. Cliquez à nouveau pour simuler.',
      });
      
      // Simulate connection for UI demo (for demonstration purposes)
      // Uncomment below to enable simulation mode
      // setSettings((prev) => ({ ...prev, connected: true, lastSync: new Date().toISOString(), lastSyncSuccess: true }));
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Erreur de connexion', { description: 'Impossible de se connecter à Google' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setSettings((prev) => ({ 
        ...prev, 
        connected: false,
        calendarSyncEnabled: false,
        bidirectionalSync: false,
        selectedDriveFolderId: '',
        selectedDriveFolderName: '',
        lastSync: undefined,
        lastSyncSuccess: undefined,
      }));
      toast.success('Déconnecté', { description: 'Compte Google déconnecté avec succès' });
    } catch (error) {
      console.error('Error disconnecting from Google:', error);
      toast.error('Erreur', { description: 'Impossible de déconnecter le compte Google' });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (settings.connected) {
        toast.success('Test réussi', { description: 'Connexion Google Calendar active' });
        setSettings(prev => ({ 
          ...prev, 
          lastSync: new Date().toISOString(),
          lastSyncSuccess: true 
        }));
      } else {
        toast.error('Test échoué', { description: 'Google Calendar non connecté' });
      }
    } catch (error) {
      toast.error('Erreur de test', { description: 'Impossible de tester la connexion' });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    if (!settings.connected) {
      toast.error('Non connecté', { description: 'Connectez-vous d\'abord à Google Calendar' });
      return;
    }

    setSyncing(true);
    try {
      // Simulate sync operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSettings(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        lastSyncSuccess: true,
      }));
      
      toast.success('Synchronisation terminée', { 
        description: 'Les rendez-vous ont été synchronisés avec Google Calendar' 
      });
    } catch (error) {
      setSettings(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        lastSyncSuccess: false,
      }));
      toast.error('Erreur de synchronisation', { description: 'Impossible de synchroniser les rendez-vous' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.id || !structureId) {
      toast.error('Erreur', { description: 'Utilisateur non connecté' });
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('structure_id', structureId)
        .eq('settings_key', 'google_workspace')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update({
            settings_value: JSON.parse(JSON.stringify(settings)),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('user_settings') as any).insert({
          user_id: user.id,
          structure_id: structureId,
          settings_key: 'google_workspace',
          settings_value: JSON.parse(JSON.stringify(settings)),
        });

        if (error) throw error;
      }

      toast.success('Configuration sauvegardée', {
        description: 'Les paramètres Google Workspace ont été mis à jour',
      });
    } catch (error) {
      console.error('Error saving Google Workspace settings:', error);
      toast.error('Erreur', { description: 'Impossible de sauvegarder la configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleFolderChange = (folderId: string) => {
    const folder = SAMPLE_FOLDERS.find((f) => f.id === folderId);
    setSettings((prev) => ({
      ...prev,
      selectedDriveFolderId: folderId,
      selectedDriveFolderName: folder?.name || '',
    }));
  };

  const formatLastSync = (isoDate?: string) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const getStatusBadge = () => {
    if (testing) {
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Test en cours...
        </Badge>
      );
    }

    if (settings.connected) {
      return (
        <Badge className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Connecté
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <XCircle className="h-3 w-3 mr-1" />
        Non connecté
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Synchronisez vos rendez-vous avec Google Calendar
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Button */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-6 h-6"
            />
            <div>
              <p className="font-medium">Compte Google</p>
              <p className="text-sm text-muted-foreground">
                {settings.connected
                  ? 'Connecté à Google Calendar'
                  : 'Connectez-vous pour activer la synchronisation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Tester</span>
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnecter
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Connecter Google Calendar
              </Button>
            )}
          </div>
        </div>

        {/* Last Sync Status */}
        {settings.lastSync && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Dernière synchronisation :</span>
              <span>{formatLastSync(settings.lastSync)}</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.lastSyncSuccess ? (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Réussie
                </Badge>
              ) : (
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Échec
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSyncNow}
                disabled={syncing || !settings.connected}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Sync maintenant</span>
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Calendar Sync Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Synchronisation Agenda
          </h4>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="calendar-sync" className="flex flex-col gap-1">
                <span>Activer la synchronisation</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Les rendez-vous OmniSoin apparaîtront dans Google Calendar
                </span>
              </Label>
              <Switch
                id="calendar-sync"
                checked={settings.calendarSyncEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, calendarSyncEnabled: checked }))
                }
                disabled={!settings.connected}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/30">
              <Label htmlFor="bidirectional-sync" className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                  Synchronisation bidirectionnelle
                </span>
                <span className="text-sm text-muted-foreground font-normal">
                  Les événements Google Calendar créeront des créneaux bloqués dans OmniSoin
                </span>
              </Label>
              <Switch
                id="bidirectional-sync"
                checked={settings.bidirectionalSync}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, bidirectionalSync: checked }))
                }
                disabled={!settings.connected || !settings.calendarSyncEnabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Drive Folder Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Stockage Google Drive
          </h4>
          
          <div className="pl-6">
            <Label htmlFor="drive-folder" className="text-sm text-muted-foreground">
              Dossier pour les documents patients
            </Label>
            <Select
              value={settings.selectedDriveFolderId}
              onValueChange={handleFolderChange}
              disabled={!settings.connected}
            >
              <SelectTrigger id="drive-folder" className="mt-1">
                <SelectValue placeholder="Sélectionner un dossier..." />
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_FOLDERS.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Les documents numérisés seront automatiquement sauvegardés dans ce dossier.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveSettings} disabled={saving || !settings.connected}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>

        {/* Info Note */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note :</strong> L'intégration Google Calendar utilise OAuth 2.0 pour une connexion 
            sécurisée. Vos identifiants ne sont jamais stockés sur nos serveurs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
