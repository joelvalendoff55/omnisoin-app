import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Shield,
  Lock,
  FileText,
  Users,
  Database,
  Key,
  ClipboardCheck,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchLatestHealthChecks, type HealthCheckType } from '@/lib/systemHealth';
import { useStructureId } from '@/hooks/useStructureId';

interface ReadinessCheck {
  id: string;
  sprint: number;
  category: string;
  label: string;
  description: string;
  healthCheckType?: HealthCheckType;
  link?: string;
  manualCheck?: boolean;
}

const READINESS_CHECKS: ReadinessCheck[] = [
  // Sprint 1: Anti-deletion
  {
    id: 'deletion_prevention',
    sprint: 1,
    category: 'Protection des données',
    label: 'Protection anti-suppression',
    description: 'Les entrées de file d\'attente ne peuvent pas être supprimées sans clôture administrative',
    link: '/queue',
    manualCheck: true,
  },
  {
    id: 'billing_required',
    sprint: 1,
    category: 'Protection des données',
    label: 'Facturation obligatoire',
    description: 'La clôture requiert un statut de facturation valide',
    manualCheck: true,
  },
  // Sprint 2: Status transitions
  {
    id: 'status_transitions',
    sprint: 2,
    category: 'Workflow',
    label: 'Transitions de statut contrôlées',
    description: 'Seules les transitions autorisées sont possibles',
    link: '/queue',
    manualCheck: true,
  },
  {
    id: 'status_audit',
    sprint: 2,
    category: 'Workflow',
    label: 'Audit des changements de statut',
    description: 'Tous les changements sont tracés avec horodatage',
    healthCheckType: 'audit_completeness',
  },
  // Sprint 3: RBAC
  {
    id: 'rbac_enforcement',
    sprint: 3,
    category: 'Contrôle d\'accès',
    label: 'RBAC appliqué',
    description: 'Permissions par rôle sur les champs médicaux',
    healthCheckType: 'rbac_enforcement',
  },
  {
    id: 'medical_fields_protected',
    sprint: 3,
    category: 'Contrôle d\'accès',
    label: 'Champs médicaux protégés',
    description: 'Seuls les médecins peuvent modifier les conclusions',
    link: '/medecin',
    manualCheck: true,
  },
  // Sprint 4: Consent
  {
    id: 'consent_coverage',
    sprint: 4,
    category: 'Consentements',
    label: 'Couverture des consentements',
    description: 'Taux de consentements obtenus ≥ 80%',
    healthCheckType: 'consent_coverage',
  },
  {
    id: 'consent_audit',
    sprint: 4,
    category: 'Consentements',
    label: 'Audit des consentements',
    description: 'Tous les consentements sont tracés',
    manualCheck: true,
  },
  // Sprint 5: Encryption & Isolation
  {
    id: 'data_encryption',
    sprint: 5,
    category: 'Sécurité',
    label: 'Chiffrement des données',
    description: 'Les champs sensibles sont chiffrés',
    healthCheckType: 'data_encryption',
  },
  {
    id: 'structure_isolation',
    sprint: 5,
    category: 'Sécurité',
    label: 'Isolation des structures',
    description: 'Aucun accès cross-structure possible',
    healthCheckType: 'rbac_enforcement',
  },
  // Sprint 6: Immutable logs
  {
    id: 'rls_integrity',
    sprint: 6,
    category: 'Conformité',
    label: 'RLS activé',
    description: 'Toutes les tables ont des politiques RLS',
    healthCheckType: 'rls_integrity',
  },
  {
    id: 'hash_chain_integrity',
    sprint: 6,
    category: 'Conformité',
    label: 'Intégrité Hash Chain',
    description: 'La chaîne de hachage des logs est valide',
    healthCheckType: 'hash_chain_integrity',
  },
  {
    id: 'exports_available',
    sprint: 6,
    category: 'Conformité',
    label: 'Exports RGPD/HAS disponibles',
    description: 'Les exports de conformité peuvent être générés',
    link: '/exports',
    manualCheck: true,
  },
];

export function SystemReadinessChecker() {
  const { structureId } = useStructureId();

  const { data: healthChecks, isLoading } = useQuery({
    queryKey: ['health-checks', structureId],
    queryFn: () => fetchLatestHealthChecks(structureId!),
    enabled: !!structureId,
  });

  if (!structureId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune structure associée
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate status for each check
  const checkStatuses = READINESS_CHECKS.map((check) => {
    if (check.healthCheckType && healthChecks) {
      const hc = healthChecks[check.healthCheckType];
      return {
        ...check,
        status: hc?.status || 'unknown',
      };
    }
    return {
      ...check,
      status: 'manual' as const,
    };
  });

  const passedChecks = checkStatuses.filter((c) => c.status === 'passed').length;
  const manualChecks = checkStatuses.filter((c) => c.status === 'manual').length;
  const failedChecks = checkStatuses.filter(
    (c) => c.status === 'failed' || c.status === 'warning'
  ).length;

  const totalAutomated = READINESS_CHECKS.filter((c) => c.healthCheckType).length;
  const progressPercent = (passedChecks / totalAutomated) * 100;

  // Group by sprint
  const bySpprint = checkStatuses.reduce(
    (acc, check) => {
      if (!acc[check.sprint]) {
        acc[check.sprint] = [];
      }
      acc[check.sprint].push(check);
      return acc;
    },
    {} as Record<number, typeof checkStatuses>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Checklist de Préparation Production
        </CardTitle>
        <CardDescription>
          Vérification des critères de verrouillage des Sprints 1-6
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-lg bg-green-50 text-center">
            <div className="text-2xl font-bold text-green-600">{passedChecks}</div>
            <div className="text-sm text-green-700">Réussis</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-50 text-center">
            <div className="text-2xl font-bold text-yellow-600">{manualChecks}</div>
            <div className="text-sm text-yellow-700">Vérification manuelle</div>
          </div>
          <div className="p-4 rounded-lg bg-red-50 text-center">
            <div className="text-2xl font-bold text-red-600">{failedChecks}</div>
            <div className="text-sm text-red-700">Échoués/Attention</div>
          </div>
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-2xl font-bold">{Math.round(progressPercent)}%</div>
            <div className="text-sm text-muted-foreground">Automatisés OK</div>
          </div>
        </div>

        <Progress value={progressPercent} className="h-2" />

        <Separator />

        {/* Checks by Sprint */}
        {Object.entries(bySpprint).map(([sprint, checks]) => (
          <div key={sprint} className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Sprint {sprint}
            </h4>
            <div className="space-y-2">
              {checks.map((check) => (
                <ReadinessCheckRow key={check.id} check={check} />
              ))}
            </div>
          </div>
        ))}

        <Separator />

        {/* Go/No-Go Decision */}
        <div
          className={cn(
            'p-4 rounded-lg text-center',
            passedChecks === totalAutomated
              ? 'bg-green-100'
              : failedChecks > 0
                ? 'bg-red-100'
                : 'bg-yellow-100'
          )}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {passedChecks === totalAutomated ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-xl font-bold text-green-700">GO PRODUCTION</span>
              </>
            ) : failedChecks > 0 ? (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <span className="text-xl font-bold text-red-700">NO-GO</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <span className="text-xl font-bold text-yellow-700">
                  VÉRIFICATIONS MANUELLES REQUISES
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {passedChecks === totalAutomated
              ? 'Tous les critères automatisés sont satisfaits. Procédez aux vérifications manuelles.'
              : failedChecks > 0
                ? `${failedChecks} critère(s) non satisfait(s). Corriger avant mise en production.`
                : 'Les critères automatisés sont OK. Complétez les vérifications manuelles.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessCheckRow({
  check,
}: {
  check: ReadinessCheck & { status: string };
}) {
  const statusIcon = {
    passed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    failed: <XCircle className="h-5 w-5 text-red-600" />,
    manual: <AlertTriangle className="h-5 w-5 text-blue-600" />,
    unknown: <AlertTriangle className="h-5 w-5 text-muted-foreground" />,
  };

  const statusBadge = {
    passed: <Badge className="bg-green-100 text-green-800">OK</Badge>,
    warning: <Badge className="bg-yellow-100 text-yellow-800">Attention</Badge>,
    failed: <Badge className="bg-red-100 text-red-800">Échec</Badge>,
    manual: <Badge variant="outline">Manuel</Badge>,
    unknown: <Badge variant="secondary">Non testé</Badge>,
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        {statusIcon[check.status as keyof typeof statusIcon]}
        <div>
          <p className="font-medium text-sm">{check.label}</p>
          <p className="text-xs text-muted-foreground">{check.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {statusBadge[check.status as keyof typeof statusBadge]}
        {check.link && (
          <Button variant="ghost" size="sm" asChild>
            <Link to={check.link}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
