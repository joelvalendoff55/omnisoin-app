import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, AlertTriangle, Search } from 'lucide-react';
import { PatientAutocomplete, Patient } from '@/components/prescriptions/PatientAutocomplete';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { fetchComplementaryExams, createExamPrescription, ComplementaryExam, ExamPrescription } from '@/lib/exams';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExamPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedPatient?: Patient | null;
}

export function ExamPrescriptionDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedPatient,
}: ExamPrescriptionDialogProps) {
  const { structureId } = useStructureId();
  const { user } = useAuth();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedExam, setSelectedExam] = useState<ComplementaryExam | null>(null);
  const [indication, setIndication] = useState('');
  const [priority, setPriority] = useState<ExamPrescription['priority']>('normal');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load available exams
  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['complementary-exams'],
    queryFn: fetchComplementaryExams,
    enabled: open,
  });

  // Set preselected patient when dialog opens
  useEffect(() => {
    if (open && preselectedPatient) {
      setSelectedPatient(preselectedPatient);
    }
  }, [open, preselectedPatient]);

  // Filter exams by search term
  const filteredExams = exams.filter(exam => 
    exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group exams by category
  const groupedExams = filteredExams.reduce((acc, exam) => {
    const category = exam.category || 'Autres';
    if (!acc[category]) acc[category] = [];
    acc[category].push(exam);
    return acc;
  }, {} as Record<string, ComplementaryExam[]>);

  const resetForm = () => {
    if (!preselectedPatient) {
      setSelectedPatient(null);
    }
    setSelectedExam(null);
    setIndication('');
    setPriority('normal');
    setNotes('');
    setSearchTerm('');
  };

  const handleSave = async () => {
    if (!selectedPatient) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    
    if (selectedPatient.status === 'clos') {
      toast.error('Impossible de prescrire sur un dossier patient clôturé');
      return;
    }
    
    if (!selectedExam) {
      toast.error('Veuillez sélectionner un examen');
      return;
    }

    if (!indication.trim()) {
      toast.error('Veuillez indiquer le motif/indication');
      return;
    }

    if (!structureId || !user?.id) {
      toast.error('Informations de session manquantes');
      return;
    }

    setIsSaving(true);
    try {
      await createExamPrescription(user.id, {
        patient_id: selectedPatient.id,
        exam_id: selectedExam.id,
        structure_id: structureId,
        indication,
        priority,
        notes: notes || undefined,
      });

      toast.success(`${selectedExam.name} prescrit avec succès`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error creating exam prescription:', err);
      toast.error("Erreur lors de la prescription");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary" />
            Prescription d'examen complémentaire
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Patient selection */}
          <PatientAutocomplete
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
            disabled={isSaving}
          />

          {/* Warning for closed patient file */}
          {selectedPatient?.status === 'clos' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Dossier clôturé</strong> — Ce dossier patient est clôturé. 
                Il n'est pas possible de prescrire un examen.
              </AlertDescription>
            </Alert>
          )}

          {/* Exam selection */}
          <div className="space-y-3">
            <Label>Examen complémentaire *</Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un examen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-48 border rounded-lg p-2">
              {examsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : Object.keys(groupedExams).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucun examen trouvé
                </p>
              ) : (
                Object.entries(groupedExams).map(([category, categoryExams]) => (
                  <div key={category} className="mb-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 px-1">
                      {category}
                    </p>
                    <div className="space-y-1">
                      {categoryExams.map((exam) => (
                        <button
                          key={exam.id}
                          type="button"
                          onClick={() => setSelectedExam(exam)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedExam?.id === exam.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{exam.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {exam.code}
                            </Badge>
                          </div>
                          {exam.description && (
                            <p className={`text-xs mt-0.5 ${
                              selectedExam?.id === exam.id 
                                ? 'text-primary-foreground/80' 
                                : 'text-muted-foreground'
                            }`}>
                              {exam.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>

            {selectedExam && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedExam.name}</span>
                  <Badge variant="secondary" className="ml-auto">
                    Sélectionné
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Indication */}
          <div className="space-y-2">
            <Label htmlFor="indication">Indication / Motif *</Label>
            <Textarea
              id="indication"
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              placeholder="Indiquez le motif de la prescription..."
              rows={2}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priorité</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ExamPrescription['priority'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Basse priorité</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes complémentaires</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes pour le laboratoire ou commentaires..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !selectedPatient || !selectedExam || !indication.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Prescrire l'examen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
