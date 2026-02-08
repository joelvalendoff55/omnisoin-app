import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  History,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  PatientConsent,
  ConsentAudit,
  ConsentStatus,
  CONSENT_TYPE_CONFIG,
  CONSENT_STATUS_CONFIG,
  fetchConsentAudit,
} from '@/lib/patientConsents';

interface ConsentHistoryProps {
  consents: PatientConsent[];
  loading: boolean;
  onRevoke: (consentId: string, reason: string) => Promise<void>;
}

const StatusIcon = ({ status }: { status: ConsentStatus }) => {
  switch (status) {
    case 'obtained':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'refused':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'revoked':
      return <Ban className="h-4 w-4 text-slate-600" />;
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-amber-600" />;
  }
};

function ConsentCard({
  consent,
  onRevoke,
}: {
  consent: PatientConsent;
  onRevoke: (consentId: string, reason: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [audit, setAudit] = useState<ConsentAudit[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  const typeConfig = CONSENT_TYPE_CONFIG[consent.consent_type];
  const statusConfig = CONSENT_STATUS_CONFIG[consent.status];

  const loadAudit = async () => {
    if (audit.length > 0) return;
    setLoadingAudit(true);
    try {
      const data = await fetchConsentAudit(consent.id);
      setAudit(data);
    } catch (err) {
      console.error('Error loading audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleExpand = () => {
    if (!expanded) {
      loadAudit();
    }
    setExpanded(!expanded);
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) return;
    setRevoking(true);
    try {
      await onRevoke(consent.id, revokeReason);
      setRevokeDialogOpen(false);
      setRevokeReason('');
    } finally {
      setRevoking(false);
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'consent_created':
        return 'Création';
      case 'consent_obtained':
        return 'Consentement obtenu';
      case 'consent_refused':
        return 'Consentement refusé';
      case 'consent_revoked':
        return 'Consentement révoqué';
      default:
        return action;
    }
  };

  return (
    <>
      <Card className={cn(
        'transition-all border-l-4',
        consent.status === 'obtained' && 'border-l-green-500',
        consent.status === 'refused' && 'border-l-red-500',
        consent.status === 'revoked' && 'border-l-slate-500',
        consent.status === 'pending' && 'border-l-amber-500'
      )}>
        <Collapsible open={expanded} onOpenChange={handleExpand}>
          <CardHeader className="py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs gap-1', statusConfig.color)}>
                    <StatusIcon status={consent.status} />
                    {statusConfig.label}
                  </Badge>
                </div>

                <p className="text-sm font-medium">
                  {consent.template?.title || 'Consentement'}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  {consent.status === 'obtained' && consent.obtained_at && (
                    <>Obtenu le {format(new Date(consent.obtained_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</>
                  )}
                  {consent.status === 'refused' && consent.refused_at && (
                    <>Refusé le {format(new Date(consent.refused_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</>
                  )}
                  {consent.status === 'revoked' && consent.revoked_at && (
                    <>Révoqué le {format(new Date(consent.revoked_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {consent.status === 'obtained' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRevokeDialogOpen(true);
                    }}
                  >
                    Révoquer
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Reasons display */}
              {consent.refused_reason && (
                <div className="mb-4 p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm font-medium text-red-800">Motif du refus :</p>
                  <p className="text-sm text-red-700">{consent.refused_reason}</p>
                </div>
              )}

              {consent.revoked_reason && (
                <div className="mb-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <p className="text-sm font-medium text-slate-800">Motif de révocation :</p>
                  <p className="text-sm text-slate-700">{consent.revoked_reason}</p>
                </div>
              )}

              {/* Audit trail */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Historique des actions
                </h4>

                {loadingAudit ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>
                ) : (
                  <div className="relative border-l-2 border-muted pl-4 space-y-4">
                    {audit.map((entry) => (
                      <div key={entry.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-background border-2 border-primary rounded-full" />
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getActionLabel(entry.action)}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                          </div>
                          {entry.reason && (
                            <p className="text-muted-foreground text-xs mt-1">
                              Motif : {entry.reason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Par : {entry.changed_by_role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Revoke dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Révoquer le consentement
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible et sera enregistrée dans l'audit trail.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              La révocation de ce consentement peut impacter la prise en charge du patient.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="revokeReason">Motif de révocation (obligatoire)</Label>
            <Textarea
              id="revokeReason"
              placeholder="Indiquez le motif de la révocation..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeDialogOpen(false);
                setRevokeReason('');
              }}
              disabled={revoking}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={!revokeReason.trim() || revoking}
            >
              {revoking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer la révocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsentHistory({ consents, loading, onRevoke }: ConsentHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (consents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Aucun consentement enregistré pour ce patient.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {consents.map((consent) => (
        <ConsentCard key={consent.id} consent={consent} onRevoke={onRevoke} />
      ))}
    </div>
  );
}
