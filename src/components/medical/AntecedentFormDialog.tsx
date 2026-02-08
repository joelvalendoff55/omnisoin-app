"use client";

import { useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  AntecedentType, 
  AntecedentSeverity, 
  ANTECEDENT_TYPE_LABELS, 
  SEVERITY_LABELS,
  Antecedent 
} from '@/lib/antecedents';

const antecedentSchema = z.object({
  type: z.enum(['medical', 'chirurgical', 'familial', 'allergique', 'traitement_en_cours']),
  description: z.string().min(1, 'Description requise'),
  date_debut: z.date().optional().nullable(),
  date_fin: z.date().optional().nullable(),
  actif: z.boolean(),
  severity: z.enum(['leger', 'modere', 'severe']).optional().nullable(),
  notes: z.string().optional(),
});

type AntecedentFormValues = z.infer<typeof antecedentSchema>;

interface AntecedentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AntecedentFormValues) => Promise<void>;
  antecedent?: Antecedent | null;
  defaultType?: AntecedentType;
}

export function AntecedentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  antecedent,
  defaultType = 'medical',
}: AntecedentFormDialogProps) {
  const form = useForm<AntecedentFormValues>({
    resolver: zodResolver(antecedentSchema),
    defaultValues: {
      type: defaultType,
      description: '',
      date_debut: null,
      date_fin: null,
      actif: true,
      severity: null,
      notes: '',
    },
  });

  const { reset, watch, setValue, handleSubmit, formState: { errors, isSubmitting } } = form;
  const watchType = watch('type');
  const showSeverity = watchType === 'allergique';

  useEffect(() => {
    if (open) {
      if (antecedent) {
        reset({
          type: antecedent.type,
          description: antecedent.description,
          date_debut: antecedent.date_debut ? new Date(antecedent.date_debut) : null,
          date_fin: antecedent.date_fin ? new Date(antecedent.date_fin) : null,
          actif: antecedent.actif,
          severity: antecedent.severity,
          notes: antecedent.notes || '',
        });
      } else {
        reset({
          type: defaultType,
          description: '',
          date_debut: null,
          date_fin: null,
          actif: true,
          severity: null,
          notes: '',
        });
      }
    }
  }, [open, antecedent, defaultType, reset]);

  const onFormSubmit = async (data: AntecedentFormValues) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {antecedent ? 'Modifier l\'antécédent' : 'Nouvel antécédent'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as AntecedentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ANTECEDENT_TYPE_LABELS) as AntecedentType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {ANTECEDENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              {...form.register('description')}
              placeholder="Décrivez l'antécédent..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {showSeverity && (
            <div className="space-y-2">
              <Label>Sévérité</Label>
              <Select
                value={watch('severity') || ''}
                onValueChange={(v) => setValue('severity', v as AntecedentSeverity || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la sévérité" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SEVERITY_LABELS) as AntecedentSeverity[]).map((sev) => (
                    <SelectItem key={sev} value={sev}>
                      {SEVERITY_LABELS[sev]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !watch('date_debut') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch('date_debut')
                      ? format(watch('date_debut')!, 'dd/MM/yyyy', { locale: fr })
                      : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch('date_debut') || undefined}
                    onSelect={(date) => setValue('date_debut', date || null)}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !watch('date_fin') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch('date_fin')
                      ? format(watch('date_fin')!, 'dd/MM/yyyy', { locale: fr })
                      : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch('date_fin') || undefined}
                    onSelect={(date) => setValue('date_fin', date || null)}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="actif">Actif</Label>
            <Switch
              id="actif"
              checked={watch('actif')}
              onCheckedChange={(v) => setValue('actif', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...form.register('notes')}
              placeholder="Notes complémentaires..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : antecedent ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
