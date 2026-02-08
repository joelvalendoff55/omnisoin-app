import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, User, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';
import { PreconsultationPriority, PRIORITY_CONFIG } from '@/lib/preconsultations';

const formSchema = z.object({
  patient_id: z.string().min(1, 'Veuillez sélectionner un patient'),
  priority: z.enum(['normal', 'urgent', 'emergency']),
  initial_symptoms: z.string().min(10, 'Décrivez les symptômes initiaux (min 10 caractères)'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  dob: string | null;
}

interface PreconsultationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => Promise<void>;
}

export function PreconsultationFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: PreconsultationFormDialogProps) {
  const { structureId } = useStructureId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: '',
      priority: 'normal',
      initial_symptoms: '',
      notes: '',
    },
  });

  // Load patients
  useEffect(() => {
    if (!structureId || !open) return;

    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, phone, dob')
          .eq('structure_id', structureId)
          .eq('is_archived', false)
          .order('last_name', { ascending: true })
          .limit(100);

        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error('Error loading patients:', err);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, [structureId, open]);

  // Filter patients by search
  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const selectedPatient = patients.find((p) => p.id === form.watch('patient_id'));

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      setSearchTerm('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Enregistrer l'arrivée d'un patient
          </DialogTitle>
          <DialogDescription>
            Saisissez les informations de préparation organisationnelle pour le patient. 
            Ces notes sont internes et ne constituent pas un diagnostic médical.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Patient Selection */}
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient *</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un patient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {selectedPatient ? (
                      <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                        <div>
                          <p className="font-medium">
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </p>
                          {selectedPatient.phone && (
                            <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            field.onChange('');
                            setSearchTerm('');
                          }}
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="h-[150px] border rounded-md">
                        {loadingPatients ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredPatients.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            Aucun patient trouvé
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {filteredPatients.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                onClick={() => {
                                  field.onChange(patient.id);
                                  setSearchTerm('');
                                }}
                                className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                              >
                                <p className="font-medium">
                                  {patient.first_name} {patient.last_name}
                                </p>
                                {patient.phone && (
                                  <p className="text-sm text-muted-foreground">{patient.phone}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la priorité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className={config.color}>{config.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Emergency Alert */}
            {form.watch('priority') === 'emergency' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Urgence vitale</strong> - Le médecin sera immédiatement notifié.
                </AlertDescription>
              </Alert>
            )}

            {/* Initial Symptoms */}
            <FormField
              control={form.control}
              name="initial_symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symptômes initiaux *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez les symptômes principaux du patient..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Description obligatoire des symptômes rapportés par le patient.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes complémentaires</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations supplémentaires (optionnel)..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Horodatage info */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                L'heure d'arrivée sera automatiquement enregistrée à la validation du formulaire.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer l'arrivée
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
