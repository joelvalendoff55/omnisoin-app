import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Phone, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Settings,
  Save,
  TestTube,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConnectionStatus {
  connected: boolean;
  baseUrl?: string;
  lastChecked?: string;
  error?: string;
}

interface ThreeCXConfig {
  serverUrl: string;
  extension: string;
}

// Mock call history
const MOCK_CALL_HISTORY = [
  { id: '1', type: 'incoming', number: '06 12 34 56 78', patient: 'Marie Dupont', duration: 245, timestamp: '2024-01-15T16:30:00' },
  { id: '2', type: 'outgoing', number: '06 98 76 54 32', patient: 'Jean Martin', duration: 180, timestamp: '2024-01-15T15:45:00' },
  { id: '3', type: 'missed', number: '06 11 22 33 44', patient: null, duration: 0, timestamp: '2024-01-15T14:20:00' },
  { id: '4', type: 'incoming', number: '06 55 66 77 88', patient: 'Sophie Bernard', duration: 320, timestamp: '2024-01-15T11:10:00' },
  { id: '5', type: 'outgoing', number: '06 99 88 77 66', patient: 'Pierre Durand', duration: 95, timestamp: '2024-01-15T09:30:00' },
];

export default function ThreeCXSection() {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ThreeCXConfig>({
    serverUrl: '',
    extension: '100',
  });
  const [showConfig, setShowConfig] = useState(false);

  // Load configuration from user_settings
  useEffect(() => {
    const loadConfig = async () => {
      if (!user?.id || !structureId) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings_value')
          .eq('user_id', user.id)
          .eq('structure_id', structureId)
          .eq('settings_key', '3cx_config')
          .maybeSingle();

        if (error) throw error;

        if (data?.settings_value) {
          const savedConfig = data.settings_value as unknown as ThreeCXConfig;
          setConfig({
            serverUrl: savedConfig.serverUrl || '',
            extension: savedConfig.extension || '100',
          });
        }
      } catch (error) {
        console.error('Error loading 3CX config:', error);
      }
    };

    loadConfig();
  }, [user?.id, structureId]);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-3cx-status', {
        body: { type: 'ping' },
      });

      if (error) {
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          setStatus({
            connected: false,
            error: 'Edge function non déployée',
            lastChecked: new Date().toISOString(),
          });
        } else {
          setStatus({
            connected: false,
            error: error.message,
            lastChecked: new Date().toISOString(),
          });
        }
        return;
      }

      setStatus({
        connected: data?.success || false,
        baseUrl: data?.baseUrl,
        lastChecked: new Date().toISOString(),
        error: data?.error,
      });

      if (data?.success) {
        toast.success('3CX connecté', { description: 'La connexion au serveur 3CX est active' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setStatus({
        connected: false,
        error: message,
        lastChecked: new Date().toISOString(),
      });
    } finally {
      setChecking(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-3cx-status', {
        body: { type: 'ping' },
      });

      if (error) {
        toast.error('Test échoué', { 
          description: error.message?.includes('404') 
            ? 'La fonction 3CX n\'est pas déployée' 
            : error.message 
        });
        setStatus({
          connected: false,
          error: error.message,
          lastChecked: new Date().toISOString(),
        });
        return;
      }

      if (data?.success) {
        toast.success('Test réussi', { description: 'Connexion 3CX active' });
        setStatus({
          connected: true,
          baseUrl: data.baseUrl,
          lastChecked: new Date().toISOString(),
        });
      } else {
        toast.error('Test échoué', { description: data?.error || 'Connexion impossible' });
        setStatus({
          connected: false,
          error: data?.error,
          lastChecked: new Date().toISOString(),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error('Erreur de test', { description: message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
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
        .eq('settings_key', '3cx_config')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update({
            settings_value: JSON.parse(JSON.stringify(config)),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('user_settings') as any).insert({
          user_id: user.id,
          structure_id: structureId,
          settings_key: '3cx_config',
          settings_value: JSON.parse(JSON.stringify(config)),
        });

        if (error) throw error;
      }

      toast.success('Configuration sauvegardée', {
        description: 'Les paramètres 3CX ont été mis à jour',
      });
    } catch (error) {
      console.error('Error saving 3CX config:', error);
      toast.error('Erreur', { description: 'Impossible de sauvegarder la configuration' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusBadge = () => {
    if (checking || testing) {
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          {testing ? 'Test en cours...' : 'Vérification...'}
        </Badge>
      );
    }

    if (!status) {
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          Non vérifié
        </Badge>
      );
    }

    if (status.connected) {
      return (
        <Badge className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Connecté
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Non connecté
      </Badge>
    );
  };

  const formatLastChecked = (isoDate?: string) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return format(date, "d MMM 'à' HH:mm", { locale: fr });
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (type: string) => {
    switch (type) {
      case 'incoming':
        return <PhoneIncoming className="h-4 w-4 text-green-600" />;
      case 'outgoing':
        return <PhoneOutgoing className="h-4 w-4 text-blue-600" />;
      case 'missed':
        return <PhoneMissed className="h-4 w-4 text-destructive" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <Phone className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <CardTitle>3CX - Téléphonie</CardTitle>
              <CardDescription>
                Intégration avec le système de téléphonie 3CX
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status Details */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">État de la connexion</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
                className="gap-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Tester la connexion
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkConnection}
                disabled={checking}
              >
                <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serveur 3CX</span>
              <span className={status?.connected ? 'text-green-600' : 'text-muted-foreground'}>
                {status?.baseUrl ? (
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {status.baseUrl}
                  </code>
                ) : (
                  'Non configuré'
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Dernière vérification</span>
              <span>
                {status?.lastChecked
                  ? formatLastChecked(status.lastChecked)
                  : '-'}
              </span>
            </div>

            {status?.error && !status.connected && (
              <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-xs">{status.error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration locale
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
            >
              {showConfig ? 'Masquer' : 'Afficher'}
            </Button>
          </div>
          
          {showConfig && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="server-url">URL du serveur 3CX</Label>
                <Input
                  id="server-url"
                  placeholder="https://votre-serveur.3cx.com"
                  value={config.serverUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Exemple: https://omnisoin.3cx.fr ou votre domaine personnalisé
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extension">Numéro d'extension</Label>
                <Input
                  id="extension"
                  placeholder="100"
                  value={config.extension}
                  onChange={(e) => setConfig(prev => ({ ...prev, extension: e.target.value }))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Votre extension interne pour les appels sortants
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={saving} size="sm">
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Fonctionnalités disponibles</h4>
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-muted'}`} />
              <span className={status?.connected ? '' : 'text-muted-foreground'}>
                Identification de l'appelant
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-muted'}`} />
              <span className={status?.connected ? '' : 'text-muted-foreground'}>
                Click-to-call depuis les fiches patients
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-muted'}`} />
              <span className={status?.connected ? '' : 'text-muted-foreground'}>
                Journal des appels
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Call History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historique des appels
            </h4>
            <Badge variant="outline">{MOCK_CALL_HISTORY.length} appels aujourd'hui</Badge>
          </div>
          
          <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
            {MOCK_CALL_HISTORY.map((call) => (
              <div key={call.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  {getCallIcon(call.type)}
                  <div>
                    <p className="text-sm font-medium">{call.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.patient || 'Numéro inconnu'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatDuration(call.duration)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(call.timestamp), 'HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Note */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note :</strong> Les identifiants 3CX (3CX_BASE_URL, 3CX_CLIENT_ID, 3CX_CLIENT_SECRET) 
            sont configurés de manière sécurisée côté serveur. Contactez l'administrateur pour modifier 
            ces paramètres.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
