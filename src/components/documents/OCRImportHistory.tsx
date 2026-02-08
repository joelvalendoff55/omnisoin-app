import { useState, useMemo } from 'react';
import { format, subDays, subMonths, isAfter, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  History, 
  Undo2, 
  FileText, 
  Pill, 
  Stethoscope, 
  Scissors,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Filter,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useOCRImportHistory } from '@/hooks/useOCRImportHistory';
import { OCRImportRecord } from '@/lib/ocrImportHistory';

type PeriodFilter = 'all' | '7days' | '30days' | '3months';
type TypeFilter = 'all' | 'medications' | 'diagnoses' | 'procedures';
type StatusFilter = 'all' | 'active' | 'reverted';

interface OCRImportHistoryProps {
  patientId: string;
  onRevertComplete?: () => void;
}

function ImportRecordCard({ 
  record, 
  onRevert, 
  isReverting 
}: { 
  record: OCRImportRecord; 
  onRevert: (id: string) => void;
  isReverting: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isReverted = record.status === 'reverted';
  const totalItems = record.medications_count + record.diagnoses_count + record.procedures_count;

  const handleConfirmRevert = () => {
    setConfirmOpen(false);
    onRevert(record.id);
  };

  return (
    <>
      <div className={`p-4 rounded-lg border ${isReverted ? 'bg-muted/50 border-muted' : 'bg-card border-border'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm truncate">
                {record.document_title || 'Document OCR'}
              </span>
              {isReverted ? (
                <Badge variant="secondary" className="flex-shrink-0">
                  <XCircle className="h-3 w-3 mr-1" />
                  Annulé
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-600 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              Importé le {format(new Date(record.imported_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              {record.importer_name && ` par ${record.importer_name}`}
            </div>

            <div className="flex flex-wrap gap-2">
              {record.medications_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Pill className="h-3 w-3 mr-1" />
                  {record.medications_count} traitement{record.medications_count > 1 ? 's' : ''}
                </Badge>
              )}
              {record.diagnoses_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Stethoscope className="h-3 w-3 mr-1" />
                  {record.diagnoses_count} diagnostic{record.diagnoses_count > 1 ? 's' : ''}
                </Badge>
              )}
              {record.procedures_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Scissors className="h-3 w-3 mr-1" />
                  {record.procedures_count} intervention{record.procedures_count > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {isReverted && record.reverted_at && (
              <div className="text-xs text-muted-foreground mt-2 italic">
                Annulé le {format(new Date(record.reverted_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                {record.reverter_name && ` par ${record.reverter_name}`}
              </div>
            )}
          </div>

          {!isReverted && totalItems > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={isReverting}
              className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {isReverting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-1" />
                  Annuler
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmer l'annulation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va supprimer définitivement les {totalItems} antécédent(s) 
              importé(s) depuis "{record.document_title || 'ce document'}".
              <br /><br />
              <strong>Cette action est irréversible.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, conserver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRevert}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, annuler l'import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function OCRImportHistory({ patientId, onRevertComplete }: OCRImportHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { history, loading, reverting, revertImport } = useOCRImportHistory(patientId);

  const handleRevert = async (importId: string) => {
    const success = await revertImport(importId);
    if (success && onRevertComplete) {
      onRevertComplete();
    }
  };

  // Apply filters
  const filteredHistory = useMemo(() => {
    return history.filter(record => {
      // Period filter
      if (periodFilter !== 'all') {
        const importDate = new Date(record.imported_at);
        const now = new Date();
        let cutoffDate: Date;
        
        switch (periodFilter) {
          case '7days':
            cutoffDate = subDays(startOfDay(now), 7);
            break;
          case '30days':
            cutoffDate = subDays(startOfDay(now), 30);
            break;
          case '3months':
            cutoffDate = subMonths(startOfDay(now), 3);
            break;
          default:
            cutoffDate = new Date(0);
        }
        
        if (!isAfter(importDate, cutoffDate)) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        switch (typeFilter) {
          case 'medications':
            if (record.medications_count === 0) return false;
            break;
          case 'diagnoses':
            if (record.diagnoses_count === 0) return false;
            break;
          case 'procedures':
            if (record.procedures_count === 0) return false;
            break;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (record.status !== statusFilter) return false;
      }

      return true;
    });
  }, [history, periodFilter, typeFilter, statusFilter]);

  const activeCount = history.filter(r => r.status === 'active').length;
  const hasFilters = periodFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setPeriodFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique des imports OCR
                <Badge variant="secondary" className="ml-2">
                  {activeCount} actif{activeCount > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes périodes</SelectItem>
                  <SelectItem value="7days">7 derniers jours</SelectItem>
                  <SelectItem value="30days">30 derniers jours</SelectItem>
                  <SelectItem value="3months">3 derniers mois</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="medications">
                    <span className="flex items-center gap-1">
                      <Pill className="h-3 w-3" /> Traitements
                    </span>
                  </SelectItem>
                  <SelectItem value="diagnoses">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> Diagnostics
                    </span>
                  </SelectItem>
                  <SelectItem value="procedures">
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3 w-3" /> Interventions
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="active">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" /> Actifs
                    </span>
                  </SelectItem>
                  <SelectItem value="reverted">
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Annulés
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Réinitialiser
                </Button>
              )}

              <span className="ml-auto text-xs text-muted-foreground">
                {filteredHistory.length} / {history.length} import{history.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Results */}
            <ScrollArea className="max-h-[400px]">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun import ne correspond aux filtres</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((record) => (
                    <ImportRecordCard
                      key={record.id}
                      record={record}
                      onRevert={handleRevert}
                      isReverting={reverting === record.id}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
