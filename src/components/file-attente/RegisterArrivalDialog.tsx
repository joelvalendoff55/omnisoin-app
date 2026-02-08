"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { UserPlus, Clock, Search } from 'lucide-react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface RegisterArrivalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: {
    patient_id: string;
    priority: number;
    reason: string;
    notes?: string;
  }) => Promise<void>;
}

export function RegisterArrivalDialog({ open, onOpenChange, onSubmit }: RegisterArrivalDialogProps) {
  const { structureId } = useStructureId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    reason: '',
    priority: '3',
    notes: '',
  });

  // Fetch patients for selection
  useEffect(() => {
    const fetchPatients = async () => {
      if (!structureId || !open) return;
      
      setLoadingPatients(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, phone')
          .eq('structure_id', structureId)
          .eq('is_archived', false)
          .order('last_name', { ascending: true });
        
        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error('Error fetching patients:', err);
        toast.error('Erreur lors du chargement des patients');
      } finally {
        setLoadingPatients(false);
      }
    };
    
    fetchPatients();
  }, [structureId, open]);

  // Filter patients based on search
  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    
    if (!formData.reason.trim()) {
      toast.error('Veuillez indiquer le motif de consultation');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        patient_id: formData.patient_id,
        priority: parseInt(formData.priority),
        reason: formData.reason.trim(),
        notes: formData.notes.trim() || undefined,
      });
      
      toast.success('Arrivée patient enregistrée', {
        description: 'Le patient a été ajouté à la file d\'attente'
      });
      
      onOpenChange(false);
      
      // Reset form
      setFormData({
        patient_id: '',
        reason: '',
        priority: '3',
        notes: '',
      });
      setSearchTerm('');
    } catch (err) {
      console.error('Error registering arrival:', err);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === formData.patient_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Enregistrer arrivée patient</DialogTitle>
              <DialogDescription>
                Ajoutez un patient à la file d'attente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label>Patient *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {loadingPatients ? (
              <div className="text-sm text-muted-foreground py-2">Chargement...</div>
            ) : (
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient">
                    {selectedPatient && `${selectedPatient.first_name} ${selectedPatient.last_name}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {filteredPatients.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Aucun patient trouvé
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        <div className="flex flex-col">
                          <span>{patient.first_name} {patient.last_name}</span>
                          {patient.phone && (
                            <span className="text-xs text-muted-foreground">{patient.phone}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motif de consultation *</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Douleur thoracique, fièvre, renouvellement..."
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Critique - Urgence vitale
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Urgent - À voir rapidement
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Normal - Ordre d'arrivée
                  </div>
                </SelectItem>
                <SelectItem value="4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Différé - Peut attendre
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations complémentaires..."
              rows={2}
            />
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              L'heure d'arrivée sera enregistrée automatiquement et le patient passera au statut "En attente".
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer arrivée'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
