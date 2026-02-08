import { useState, useEffect } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Database,
  Lock,
  FileCheck,
  Brain,
  Info,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

interface FeatureFlagConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  warning?: string;
  requiresCompliance?: boolean;
}

const FEATURE_FLAGS_CONFIG: FeatureFlagConfig[] = [
  {
    key: 'health_data_enabled',
    label: 'Données de santé',
    description: 'Active l\'accès aux données patients, transcriptions et documents médicaux. Nécessite les mesures de sécurité RGPD.',
    icon: <Database className="h-5 w-5" />,
    warning: 'L\'activation de cette option nécessite que toutes les mesures de sécurité Sprint 1 soient en place (MFA, RLS, audit logs).',
    requiresCompliance: true,
  },
  {
    key: 'mfa_required',
    label: 'MFA obligatoire',
    description: 'Force l\'authentification multi-facteurs pour les rôles sensibles (admin, médecin).',
    icon: <Lock className="h-5 w-5" />,
  },
  {
    key: 'advanced_audit',
    label: 'Audit avancé',
    description: 'Active les logs d\'audit détaillés avec chaîne de hachage immuable.',
    icon: <FileCheck className="h-5 w-5" />,
  },
  {
    key: 'clinical_suggestions',
    label: 'Suggestions cliniques IA',
    description: 'Active les suggestions d\'aide à la décision basées sur l\'IA (réservé aux praticiens).',
    icon: <Brain className="h-5 w-5" />,
    warning: 'Les suggestions IA sont des aides à la décision et ne remplacent pas le jugement médical.',
  },
];

export default function FeatureFlagsSection() {
  const { structureId } = useStructureId();
  const { flags, loading: flagsLoading, refetch } = useFeatureFlags();
  const [saving, setSaving] = useState<string | null>(null);

  const handleToggleFlag = async (flagKey: string, newValue: boolean) => {
    if (!structureId) return;

    setSaving(flagKey);

    try {
      // Upsert the feature flag
      const { error } = await supabase
        .from('feature_flags')
        .upsert(
          {
            structure_id: structureId,
            flag_name: flagKey,
            is_enabled: newValue,
            description: FEATURE_FLAGS_CONFIG.find(f => f.key === flagKey)?.description || null,
          },
          {
            onConflict: 'structure_id,flag_name',
          }
        );

      if (error) throw error;

      await refetch();

      toast.success(
        newValue 
          ? `"${FEATURE_FLAGS_CONFIG.find(f => f.key === flagKey)?.label}" activé` 
          : `"${FEATURE_FLAGS_CONFIG.find(f => f.key === flagKey)?.label}" désactivé`
      );
    } catch (err) {
      console.error('Error toggling feature flag:', err);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(null);
    }
  };

  if (flagsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-11" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const healthDataEnabled = flags['health_data_enabled'] ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Feature Flags
        </CardTitle>
        <CardDescription>
          Activez ou désactivez les fonctionnalités de la structure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global status banner */}
        <Alert className={healthDataEnabled 
          ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
          : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
        }>
          {healthDataEnabled ? (
            <ShieldCheck className="h-4 w-4 text-green-600" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription className={healthDataEnabled 
            ? 'text-green-800 dark:text-green-200' 
            : 'text-yellow-800 dark:text-yellow-200'
          }>
            {healthDataEnabled 
              ? 'Accès aux données de santé activé. Les utilisateurs peuvent consulter les dossiers patients.'
              : 'Accès aux données de santé désactivé. Les pages patients, transcripts et documents sont bloquées.'
            }
          </AlertDescription>
        </Alert>

        {/* Feature flags list */}
        <div className="space-y-3">
          {FEATURE_FLAGS_CONFIG.map((config) => {
            const isEnabled = flags[config.key] ?? false;
            const isSaving = saving === config.key;

            return (
              <div 
                key={config.key} 
                className={`p-4 border rounded-lg transition-colors ${
                  isEnabled 
                    ? 'border-primary/30 bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isEnabled 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {config.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label 
                          htmlFor={config.key} 
                          className="text-base font-medium cursor-pointer"
                        >
                          {config.label}
                        </Label>
                        {isEnabled && (
                          <Badge variant="default" className="text-xs">
                            Actif
                          </Badge>
                        )}
                        {config.requiresCompliance && (
                          <Badge variant="outline" className="text-xs">
                            Conformité requise
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                      {config.warning && !isEnabled && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>{config.warning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      id={config.key}
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleFlag(config.key, checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info footer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Les feature flags contrôlent l'accès aux fonctionnalités sensibles de la plateforme. 
            Les modifications sont enregistrées et auditées.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
