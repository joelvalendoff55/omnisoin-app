"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePatientExamPrescriptions } from '@/hooks/usePatientExamPrescriptions';
import { ExamPrescription, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/exams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TestTube,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  Calendar,
  XCircle,
  AlertTriangle,
  FileText,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PatientExamPrescriptionHistoryProps {
  patientId: string;
}

const STATUS_CONFIG = {
  prescribed: { 
    label: 'Prescrit', 
    variant: 'secondary' as const, 
    icon: Clock,
    color: 'text-muted-foreground',
  },
  scheduled: { 
    label: 'Planifié', 
    variant: 'outline' as const, 
    icon: Calendar,
    color: 'text-blue-600',
  },
  completed: { 
    label: 'Réalisé', 
    variant: 'default' as const, 
    icon: CheckCircle,
    color: 'text-green-600',
  },
  cancelled: { 
    label: 'Annulé', 
    variant: 'destructive' as const, 
    icon: XCircle,
    color: 'text-destructive',
  },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', variant: 'destructive' as const },
  normal: { label: 'Normal', variant: 'secondary' as const },
  low: { label: 'Basse', variant: 'outline' as const },
};

export function PatientExamPrescriptionHistory({ patientId }: PatientExamPrescriptionHistoryProps) {
  const { 
    prescriptions, 
    isLoading, 
    markAsScheduled, 
    markAsCompleted, 
    markAsCancelled,
    isUpdating,
  } = usePatientExamPrescriptions(patientId);
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<ExamPrescription | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [results, setResults] = useState('');

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleScheduleClick = (prescription: ExamPrescription) => {
    setSelectedPrescription(prescription);
    setScheduledDate(prescription.scheduled_date || '');
    setScheduleDialogOpen(true);
  };

  const handleResultsClick = (prescription: ExamPrescription) => {
    setSelectedPrescription(prescription);
    setResults(prescription.results || '');
    setResultsDialogOpen(true);
  };

  const handleScheduleConfirm = () => {
    if (selectedPrescription && scheduledDate) {
      markAsScheduled(selectedPrescription.id, scheduledDate);
      setScheduleDialogOpen(false);
      setSelectedPrescription(null);
    }
  };

  const handleResultsConfirm = () => {
    if (selectedPrescription) {
      markAsCompleted(selectedPrescription.id, results);
      setResultsDialogOpen(false);
      setSelectedPrescription(null);
      setResults('');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentPrescriptions = prescriptions.slice(0, 10);
  const hasMore = prescriptions.length > 10;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Examens complémentaires
            {prescriptions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {prescriptions.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Historique des prescriptions d'examens</CardDescription>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucun examen prescrit pour ce patient</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPrescriptions.map((prescription) => {
                const StatusIcon = STATUS_CONFIG[prescription.status].icon;
                const isExpanded = expandedIds.has(prescription.id);
                const examName = prescription.exam?.name || 'Examen inconnu';
                const examCategory = prescription.exam?.category;

                return (
                  <Collapsible
                    key={prescription.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(prescription.id)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{examName}</span>
                                {examCategory && (
                                  <Badge variant="outline" className="text-xs">
                                    {examCategory}
                                  </Badge>
                                )}
                                <Badge
                                  variant={STATUS_CONFIG[prescription.status].variant}
                                  className="text-xs"
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {STATUS_CONFIG[prescription.status].label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span>
                                  {format(new Date(prescription.created_at), 'dd MMM yyyy', {
                                    locale: fr,
                                  })}
                                </span>
                                {prescription.priority === 'urgent' && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Urgent
                                  </Badge>
                                )}
                                {prescription.results && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <FileText className="h-3 w-3" />
                                    Résultats
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                                disabled={isUpdating}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {prescription.status === 'prescribed' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleScheduleClick(prescription);
                                    }}
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Planifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResultsClick(prescription);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Marquer réalisé
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsCancelled(prescription.id);
                                    }}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Annuler
                                  </DropdownMenuItem>
                                </>
                              )}
                              {prescription.status === 'scheduled' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResultsClick(prescription);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Saisir résultats
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsCancelled(prescription.id);
                                    }}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Annuler
                                  </DropdownMenuItem>
                                </>
                              )}
                              {prescription.status === 'completed' && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResultsClick(prescription);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Modifier résultats
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 border-t">
                          <ScrollArea className="max-h-[300px]">
                            <div className="space-y-3 pt-3">
                              {/* Indication */}
                              <div className="p-2 rounded-md bg-muted/50">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Indication clinique
                                </p>
                                <p className="text-sm">{prescription.indication}</p>
                              </div>

                              {/* Priority */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Priorité:
                                </span>
                                <Badge variant={PRIORITY_CONFIG[prescription.priority].variant}>
                                  {PRIORITY_LABELS[prescription.priority]}
                                </Badge>
                              </div>

                              {/* Scheduled Date */}
                              {prescription.scheduled_date && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Planifié le:</span>
                                  <span>
                                    {format(new Date(prescription.scheduled_date), 'dd MMMM yyyy', {
                                      locale: fr,
                                    })}
                                  </span>
                                </div>
                              )}

                              {/* Completed Date */}
                              {prescription.completed_date && (
                                <div className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-muted-foreground">Réalisé le:</span>
                                  <span>
                                    {format(new Date(prescription.completed_date), 'dd MMMM yyyy', {
                                      locale: fr,
                                    })}
                                  </span>
                                </div>
                              )}

                              {/* Results */}
                              {prescription.results && (
                                <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                  <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1 flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Résultats
                                  </p>
                                  <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                                    {prescription.results}
                                  </p>
                                </div>
                              )}

                              {/* Notes */}
                              {prescription.notes && (
                                <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-sm">
                                  <p className="text-yellow-800 dark:text-yellow-200">
                                    Note: {prescription.notes}
                                  </p>
                                </div>
                              )}

                              {/* Exam Description */}
                              {prescription.exam?.description && (
                                <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-sm">
                                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                    Description de l'examen
                                  </p>
                                  <p className="text-blue-900 dark:text-blue-100">
                                    {prescription.exam.description}
                                  </p>
                                </div>
                              )}

                              {/* Preparation Instructions */}
                              {prescription.exam?.preparation_instructions && (
                                <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-sm">
                                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                                    Instructions de préparation
                                  </p>
                                  <p className="text-amber-900 dark:text-amber-100">
                                    {prescription.exam.preparation_instructions}
                                  </p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>

                          {/* Action buttons */}
                          {prescription.status !== 'cancelled' && prescription.status !== 'completed' && (
                            <div className="flex gap-2 mt-3">
                              {prescription.status === 'prescribed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleScheduleClick(prescription)}
                                  disabled={isUpdating}
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Planifier
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleResultsClick(prescription)}
                                disabled={isUpdating}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {prescription.status === 'scheduled' ? 'Saisir résultats' : 'Marquer réalisé'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}

              {hasMore && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Voir les {prescriptions.length - 10} autres examens
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier l'examen</DialogTitle>
            <DialogDescription>
              {selectedPrescription?.exam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled-date">Date prévue</Label>
              <Input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleScheduleConfirm} disabled={!scheduledDate || isUpdating}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Résultats de l'examen</DialogTitle>
            <DialogDescription>
              {selectedPrescription?.exam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="results">Résultats / Compte-rendu</Label>
              <Textarea
                id="results"
                placeholder="Saisissez les résultats de l'examen..."
                value={results}
                onChange={(e) => setResults(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleResultsConfirm} disabled={isUpdating}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
