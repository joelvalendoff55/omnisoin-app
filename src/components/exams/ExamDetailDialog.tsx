import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExamPrescription, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/exams';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  User,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface ExamDetailDialogProps {
  exam: (ExamPrescription & { patient?: { id: string; first_name: string | null; last_name: string | null } }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (prescriptionId: string, date: string) => void;
  onComplete: (prescriptionId: string, results?: string) => void;
  onCancel: (prescriptionId: string) => void;
  isUpdating?: boolean;
}

const STATUS_CONFIG = {
  prescribed: { label: 'Prescrit', variant: 'secondary' as const, icon: Clock },
  scheduled: { label: 'Planifié', variant: 'outline' as const, icon: CalendarIcon },
  completed: { label: 'Réalisé', variant: 'default' as const, icon: CheckCircle },
  cancelled: { label: 'Annulé', variant: 'destructive' as const, icon: XCircle },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', variant: 'destructive' as const },
  normal: { label: 'Normal', variant: 'secondary' as const },
  low: { label: 'Basse', variant: 'outline' as const },
};

export function ExamDetailDialog({
  exam,
  open,
  onOpenChange,
  onSchedule,
  onComplete,
  onCancel,
  isUpdating = false,
}: ExamDetailDialogProps) {
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [results, setResults] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showResultsForm, setShowResultsForm] = useState(false);

  if (!exam) return null;

  const StatusIcon = STATUS_CONFIG[exam.status].icon;

  const handleSchedule = () => {
    if (scheduledDate) {
      onSchedule(exam.id, scheduledDate.toISOString());
      setScheduledDate(undefined);
      setShowScheduleForm(false);
    }
  };

  const handleComplete = () => {
    onComplete(exam.id, results);
    setResults('');
    setShowResultsForm(false);
  };

  const handleCancel = () => {
    onCancel(exam.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {exam.exam?.name || 'Examen'}
            <Badge variant={STATUS_CONFIG[exam.status].variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {STATUS_CONFIG[exam.status].label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {exam.exam?.category && (
              <Badge variant="outline" className="mr-2">{exam.exam.category}</Badge>
            )}
            Prescrit le {format(new Date(exam.created_at), 'dd MMMM yyyy', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient */}
          {exam.patient && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {exam.patient.first_name} {exam.patient.last_name}
              </span>
            </div>
          )}

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Priorité:</span>
            <Badge variant={PRIORITY_CONFIG[exam.priority].variant}>
              {exam.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {PRIORITY_LABELS[exam.priority]}
            </Badge>
          </div>

          {/* Indication */}
          <div className="p-3 rounded-lg bg-muted/50">
            <Label className="text-xs text-muted-foreground">Indication clinique</Label>
            <p className="text-sm mt-1">{exam.indication}</p>
          </div>

          {/* Scheduled Date */}
          {exam.scheduled_date && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <span>Planifié le:</span>
              <span className="font-medium">
                {format(new Date(exam.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          )}

          {/* Completed Date */}
          {exam.completed_date && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Réalisé le:</span>
              <span className="font-medium">
                {format(new Date(exam.completed_date), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          )}

          {/* Results */}
          {exam.results && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <Label className="text-xs text-green-800 dark:text-green-200 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Résultats
              </Label>
              <p className="text-sm mt-1 text-green-900 dark:text-green-100 whitespace-pre-wrap">
                {exam.results}
              </p>
            </div>
          )}

          {/* Notes */}
          {exam.notes && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <Label className="text-xs text-yellow-800 dark:text-yellow-200">Notes</Label>
              <p className="text-sm mt-1 text-yellow-900 dark:text-yellow-100">{exam.notes}</p>
            </div>
          )}

          {/* Exam Description */}
          {exam.exam?.description && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Label className="text-xs text-blue-800 dark:text-blue-200">Description de l'examen</Label>
              <p className="text-sm mt-1 text-blue-900 dark:text-blue-100">{exam.exam.description}</p>
            </div>
          )}

          {/* Schedule Form */}
          {showScheduleForm && exam.status === 'prescribed' && (
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <Label>Date de réalisation prévue</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex gap-2">
                <Button onClick={handleSchedule} disabled={!scheduledDate || isUpdating}>
                  Confirmer
                </Button>
                <Button variant="outline" onClick={() => setShowScheduleForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Results Form */}
          {showResultsForm && (exam.status === 'prescribed' || exam.status === 'scheduled') && (
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <Label htmlFor="results">Résultats / Compte-rendu</Label>
              <Textarea
                id="results"
                placeholder="Saisissez les résultats de l'examen..."
                value={results}
                onChange={(e) => setResults(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={handleComplete} disabled={isUpdating}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => setShowResultsForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {exam.status === 'prescribed' && !showScheduleForm && !showResultsForm && (
            <>
              <Button variant="outline" onClick={() => setShowScheduleForm(true)} disabled={isUpdating}>
                <CalendarIcon className="h-4 w-4 mr-1" />
                Planifier
              </Button>
              <Button onClick={() => setShowResultsForm(true)} disabled={isUpdating}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Marquer réalisé
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={isUpdating}>
                <XCircle className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </>
          )}
          {exam.status === 'scheduled' && !showResultsForm && (
            <>
              <Button onClick={() => setShowResultsForm(true)} disabled={isUpdating}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Saisir résultats
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={isUpdating}>
                <XCircle className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </>
          )}
          {exam.status === 'completed' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
