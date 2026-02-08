"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  User,
  Phone,
  Clock,
  Calendar,
  AlertTriangle,
  Stethoscope,
  CheckCircle,
  History,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Preconsultation,
  PreconsultationAudit,
  WaitingStatus,
  PreconsultationPriority,
  WAITING_STATUS_CONFIG,
  PRIORITY_CONFIG,
  getWaitingDuration,
  fetchPreconsultationAudit,
} from '@/lib/preconsultations';

interface PreconsultationDrawerProps {
  preconsultation: Preconsultation | null;
  onClose: () => void;
  onStatusChange: (id: string, status: WaitingStatus) => void;
  onPriorityChange: (id: string, priority: PreconsultationPriority) => void;
}

export function PreconsultationDrawer({
  preconsultation,
  onClose,
  onStatusChange,
  onPriorityChange,
}: PreconsultationDrawerProps) {
  const [audit, setAudit] = useState<PreconsultationAudit[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load audit trail when preconsultation changes
  useEffect(() => {
    if (!preconsultation) {
      setAudit([]);
      return;
    }

    const loadAudit = async () => {
      setLoadingAudit(true);
      try {
        const data = await fetchPreconsultationAudit(preconsultation.id);
        setAudit(data);
      } catch (err) {
        console.error('Error loading audit:', err);
      } finally {
        setLoadingAudit(false);
      }
    };

    loadAudit();
  }, [preconsultation?.id]);

  if (!preconsultation) return null;

  const statusConfig = WAITING_STATUS_CONFIG[preconsultation.waiting_status];
  const priorityConfig = PRIORITY_CONFIG[preconsultation.priority];
  const waitingTime = getWaitingDuration(preconsultation.arrival_time);

  const handleStatusChange = async (status: WaitingStatus) => {
    setActionLoading(true);
    try {
      await onStatusChange(preconsultation.id, status);
    } finally {
      setActionLoading(false);
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'created':
        return 'Création';
      case 'status_changed':
        return 'Changement de statut';
      case 'priority_changed':
        return 'Changement de priorité';
      default:
        return action;
    }
  };

  return (
    <Sheet open={!!preconsultation} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {preconsultation.patient?.first_name} {preconsultation.patient?.last_name}
          </SheetTitle>
          <SheetDescription>Détails de la préparation organisationnelle</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className={cn('gap-1', priorityConfig.bgColor, priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            </div>

            {/* Patient Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Informations patient
              </h3>
              
              {preconsultation.patient?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{preconsultation.patient.phone}</span>
                </div>
              )}

              {preconsultation.patient?.dob && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Né(e) le {format(new Date(preconsultation.patient.dob), 'dd MMMM yyyy', { locale: fr })}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Arrivée à {format(new Date(preconsultation.arrival_time), 'HH:mm', { locale: fr })} - 
                  Attente : {waitingTime.formatted}
                </span>
              </div>
            </div>

            <Separator />

            {/* Symptoms */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Symptômes initiaux
              </h3>
              <p className="text-sm whitespace-pre-wrap">
                {preconsultation.initial_symptoms || 'Non renseigné'}
              </p>
            </div>

            {preconsultation.notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    Notes complémentaires
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{preconsultation.notes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                {preconsultation.waiting_status !== 'waiting' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('waiting')}
                    disabled={actionLoading}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Mettre en attente
                  </Button>
                )}
                {preconsultation.waiting_status !== 'in_progress' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={actionLoading}
                  >
                    <Stethoscope className="h-4 w-4 mr-1" />
                    Démarrer
                  </Button>
                )}
                {preconsultation.waiting_status !== 'completed' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStatusChange('completed')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Terminer
                  </Button>
                )}
              </div>

              {/* Priority buttons */}
              <div className="flex flex-wrap gap-2">
                {preconsultation.priority !== 'normal' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPriorityChange(preconsultation.id, 'normal')}
                  >
                    Priorité normale
                  </Button>
                )}
                {preconsultation.priority !== 'urgent' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-orange-600"
                    onClick={() => onPriorityChange(preconsultation.id, 'urgent')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Urgent
                  </Button>
                )}
                {preconsultation.priority !== 'emergency' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => onPriorityChange(preconsultation.id, 'emergency')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Urgence
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Audit Trail */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique des modifications
              </h3>

              {loadingAudit ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>
              ) : (
                <div className="space-y-2">
                  {audit.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 border rounded-lg bg-muted/30 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{getActionLabel(entry.action)}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.changed_at), 'dd/MM HH:mm', { locale: fr })}
                        </span>
                      </div>
                      
                      {entry.action === 'status_changed' && entry.previous_status && entry.new_status && (
                        <p className="text-muted-foreground">
                          {WAITING_STATUS_CONFIG[entry.previous_status]?.label || entry.previous_status}
                          {' → '}
                          {WAITING_STATUS_CONFIG[entry.new_status]?.label || entry.new_status}
                        </p>
                      )}
                      
                      {entry.action === 'priority_changed' && entry.previous_priority && entry.new_priority && (
                        <p className="text-muted-foreground">
                          {PRIORITY_CONFIG[entry.previous_priority]?.label || entry.previous_priority}
                          {' → '}
                          {PRIORITY_CONFIG[entry.new_priority]?.label || entry.new_priority}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        Par : {entry.changed_by_role}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
