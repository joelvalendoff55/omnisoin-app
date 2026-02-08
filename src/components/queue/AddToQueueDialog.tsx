"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRIORITY_OPTIONS, QueueEntryInsert } from '@/lib/queue';
import { fetchPatients } from '@/lib/patients';
import { Patient } from '@/types/patient';
import { useStructureId } from '@/hooks/useStructureId';
import ReasonSelect from '@/components/shared/ReasonSelect';

interface AddToQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: Omit<QueueEntryInsert, 'structure_id'>) => Promise<void>;
}

export function AddToQueueDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddToQueueDialogProps) {
  const { structureId } = useStructureId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [patientId, setPatientId] = useState<string>('');
  const [priority, setPriority] = useState<number>(3);
  const [reason, setReason] = useState<string>('');
  const [reasonId, setReasonId] = useState<string>('');
  const [assistantNotes, setAssistantNotes] = useState<string>('');

  useEffect(() => {
    const loadPatients = async () => {
      if (!open || !structureId) return;
      
      setLoading(true);
      try {
        const data = await fetchPatients(false);
        setPatients(data);
      } catch (err) {
        console.error('Error loading patients:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [open, structureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId) return;

    setSubmitting(true);
    try {
      await onSubmit({
        patient_id: patientId,
        priority,
        reason: reason.trim() || undefined,
        reason_id: reasonId || undefined,
        assistant_notes: assistantNotes.trim() || undefined,
      });
      
      // Reset form
      setPatientId('');
      setPriority(3);
      setReason('');
      setReasonId('');
      setAssistantNotes('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error submitting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter à la file d'attente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger id="patient">
                <SelectValue placeholder={loading ? 'Chargement...' : 'Sélectionner un patient'} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priorité</Label>
            <Select 
              value={priority.toString()} 
              onValueChange={(v) => setPriority(parseInt(v))}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason_id">Motif de consultation</Label>
            <ReasonSelect
              value={reasonId}
              onValueChange={(value) => setReasonId(value)}
              showDuration
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Notes complémentaires</Label>
            <Textarea
              id="reason"
              placeholder="Détails supplémentaires..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assistant_notes">Notes assistante (pour le médecin)</Label>
            <Textarea
              id="assistant_notes"
              placeholder="Observations, constantes, informations importantes pour le médecin..."
              value={assistantNotes}
              onChange={(e) => setAssistantNotes(e.target.value)}
              rows={3}
              className="bg-primary/5 border-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Ces notes seront visibles par le médecin dans son tableau de bord
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!patientId || submitting}
              data-testid="queue-add-button"
            >
              {submitting ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
