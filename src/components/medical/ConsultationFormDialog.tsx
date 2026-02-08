import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Consultation, ConsultationFormData, fetchConsultations } from '@/lib/consultations';
import { PatientTranscript } from '@/lib/transcripts';
import { Antecedent, fetchAntecedents } from '@/lib/antecedents';
import { CotationSection, CotationCode } from './CotationSection';
import { CotationSuggestionsModal } from './CotationSuggestionsModal';
import { PatientConsultationSummary, PatientSummaryData } from './PatientConsultationSummary';
import { ClinicalReflectionBlock } from './ClinicalReflectionBlock';
import { ContentAuthorshipBadge } from './ContentAuthorshipBadge';
import { MedicalValidationButton } from './MedicalValidationButton';
import { useContentAuthorship } from '@/hooks/useContentAuthorship';
import { ValidationEntry } from '@/hooks/useMedicalValidation';

const consultationSchema = z.object({
  consultation_date: z.date(),
  motif: z.string().min(1, 'Motif requis'),
  notes_cliniques: z.string().optional(),
  examen_clinique: z.string().optional(),
  conclusion: z.string().optional(),
  transcript_id: z.string().optional().nullable(),
});

type ConsultationFormValues = z.infer<typeof consultationSchema>;

interface ConsultationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ConsultationFormData) => Promise<void>;
  consultation?: Consultation | null;
  transcripts?: PatientTranscript[];
  patientId?: string;
  patient?: PatientSummaryData | null;
  structureId?: string;
}

export function ConsultationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  consultation,
  transcripts = [],
  patientId,
  patient,
  structureId,
}: ConsultationFormDialogProps) {
  const [cotationCodes, setCotationCodes] = useState<CotationCode[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [antecedents, setAntecedents] = useState<Antecedent[]>([]);
  const [lastConsultation, setLastConsultation] = useState<Consultation | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  const { logAuthorship } = useContentAuthorship();

  // Track field authorship - key is field name, value is source type
  const [fieldAuthorship, setFieldAuthorship] = useState<Record<string, 'ai_generated' | 'human_created' | 'human_modified'>>({
    motif: 'human_created',
    notes_cliniques: 'human_created',
    examen_clinique: 'human_created',
    conclusion: 'human_created',
  });

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      consultation_date: new Date(),
      motif: '',
      notes_cliniques: '',
      examen_clinique: '',
      conclusion: '',
      transcript_id: null,
    },
  });

  const { reset, watch, setValue, handleSubmit, formState: { errors, isSubmitting } } = form;

  // Load patient context (antecedents, last consultation)
  const loadPatientContext = useCallback(async () => {
    if (!patientId) return;
    
    setLoadingContext(true);
    try {
      const [antecedentsData, consultationsData] = await Promise.all([
        fetchAntecedents(patientId),
        fetchConsultations(patientId),
      ]);
      
      setAntecedents(antecedentsData);
      
      // Get the most recent consultation (excluding current one being edited)
      const otherConsultations = consultation 
        ? consultationsData.filter(c => c.id !== consultation.id)
        : consultationsData;
      setLastConsultation(otherConsultations[0] || null);
    } catch (error) {
      console.error('Error loading patient context:', error);
    } finally {
      setLoadingContext(false);
    }
  }, [patientId, consultation]);

  useEffect(() => {
    if (open && patientId) {
      loadPatientContext();
    }
  }, [open, patientId, loadPatientContext]);

  useEffect(() => {
    if (open) {
      if (consultation) {
        reset({
          consultation_date: new Date(consultation.consultation_date),
          motif: consultation.motif || '',
          notes_cliniques: consultation.notes_cliniques || '',
          examen_clinique: consultation.examen_clinique || '',
          conclusion: consultation.conclusion || '',
          transcript_id: consultation.transcript_id,
        });
        // TODO: Load existing cotation codes from consultation if stored
        setCotationCodes([]);
      } else {
        reset({
          consultation_date: new Date(),
          motif: '',
          notes_cliniques: '',
          examen_clinique: '',
          conclusion: '',
          transcript_id: null,
        });
        setCotationCodes([]);
      }
    }
  }, [open, consultation, reset]);

  // Handle field changes to track human modifications
  const handleFieldChange = (fieldName: string) => {
    setFieldAuthorship(prev => ({
      ...prev,
      [fieldName]: prev[fieldName] === 'ai_generated' ? 'human_modified' : 'human_created',
    }));
  };

  // Mark a field as AI-generated (called when AI fills content)
  const markFieldAsAI = (fieldName: string) => {
    setFieldAuthorship(prev => ({
      ...prev,
      [fieldName]: 'ai_generated',
    }));
  };

  const onFormSubmit = async (data: ConsultationFormValues) => {
    // Log authorship for each field before submission
    if (consultation?.id && patientId && structureId) {
      const fieldsToLog = ['motif', 'notes_cliniques', 'examen_clinique', 'conclusion'] as const;
      for (const field of fieldsToLog) {
        const content = data[field];
        if (content) {
          await logAuthorship({
            entityType: 'consultation',
            entityId: consultation.id,
            fieldName: field,
            sourceType: fieldAuthorship[field],
            content,
            patientId,
            structureId,
          });
        }
      }
    }

    await onSubmit({
      consultation_date: data.consultation_date,
      motif: data.motif,
      notes_cliniques: data.notes_cliniques || '',
      examen_clinique: data.examen_clinique || '',
      conclusion: data.conclusion || '',
      transcript_id: data.transcript_id || null,
    });
    onOpenChange(false);
  };

  const handleValidationComplete = (_validation: ValidationEntry) => {
    setIsValidated(true);
  };

  const handleAddCode = (codeData: Omit<CotationCode, 'id'>) => {
    const newCode: CotationCode = {
      ...codeData,
      id: crypto.randomUUID(),
    };
    setCotationCodes(prev => [...prev, newCode]);
  };

  const handleRemoveCode = (id: string) => {
    setCotationCodes(prev => prev.filter(c => c.id !== id));
  };

  const readyTranscripts = transcripts.filter(t => t.status === 'ready');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {consultation ? 'Modifier la consultation' : 'Nouvelle consultation'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Patient Summary Block */}
            {patient && !loadingContext && (
              <PatientConsultationSummary
                patient={patient}
                antecedents={antecedents}
                lastConsultation={lastConsultation}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !watch('consultation_date') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch('consultation_date')
                        ? format(watch('consultation_date'), 'dd/MM/yyyy', { locale: fr })
                        : 'Sélectionner'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watch('consultation_date')}
                      onSelect={(date) => setValue('consultation_date', date || new Date())}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Transcription liée</Label>
                <Select
                  value={watch('transcript_id') || '__none__'}
                  onValueChange={(v) => setValue('transcript_id', v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {readyTranscripts.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          {format(new Date(t.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Motif de consultation *</Label>
                <ContentAuthorshipBadge
                  entityType="consultation"
                  entityId={consultation?.id || 'new'}
                  fieldName="motif"
                  localSourceType={fieldAuthorship.motif}
                />
              </div>
              <Textarea
                {...form.register('motif', {
                  onChange: () => handleFieldChange('motif'),
                })}
                placeholder="Motif de la consultation..."
                rows={2}
              />
              {errors.motif && (
                <p className="text-sm text-destructive">{errors.motif.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Notes cliniques</Label>
                <ContentAuthorshipBadge
                  entityType="consultation"
                  entityId={consultation?.id || 'new'}
                  fieldName="notes_cliniques"
                  localSourceType={fieldAuthorship.notes_cliniques}
                />
              </div>
              <Textarea
                {...form.register('notes_cliniques', {
                  onChange: () => handleFieldChange('notes_cliniques'),
                })}
                placeholder="Observations, historique de la maladie actuelle..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Examen clinique</Label>
                <ContentAuthorshipBadge
                  entityType="consultation"
                  entityId={consultation?.id || 'new'}
                  fieldName="examen_clinique"
                  localSourceType={fieldAuthorship.examen_clinique}
                />
              </div>
              <Textarea
                {...form.register('examen_clinique', {
                  onChange: () => handleFieldChange('examen_clinique'),
                })}
                placeholder="Résultats de l'examen clinique..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conclusion</Label>
                <ContentAuthorshipBadge
                  entityType="consultation"
                  entityId={consultation?.id || 'new'}
                  fieldName="conclusion"
                  localSourceType={fieldAuthorship.conclusion}
                />
              </div>
              <Textarea
                {...form.register('conclusion', {
                  onChange: () => handleFieldChange('conclusion'),
                })}
                placeholder="Diagnostic, plan de traitement..."
                rows={3}
              />
            </div>

            {/* Clinical Reflection Block */}
            <ClinicalReflectionBlock />

            {/* Cotation Section */}
            <CotationSection
              codes={cotationCodes}
              onRemoveCode={handleRemoveCode}
              onOpenSuggestions={() => setSuggestionsOpen(true)}
            />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {/* Medical Validation Button - only for existing consultations */}
              {consultation?.id && patientId && structureId && (
                <MedicalValidationButton
                  consultationId={consultation.id}
                  patientId={patientId}
                  structureId={structureId}
                  consultationContent={{
                    motif: watch('motif'),
                    notes_cliniques: watch('notes_cliniques'),
                    examen_clinique: watch('examen_clinique'),
                    conclusion: watch('conclusion'),
                    consultation_date: watch('consultation_date')?.toISOString(),
                  }}
                  onValidated={handleValidationComplete}
                />
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : consultation ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CotationSuggestionsModal
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        onAddCode={handleAddCode}
        existingCodes={cotationCodes}
      />
    </>
  );
}
