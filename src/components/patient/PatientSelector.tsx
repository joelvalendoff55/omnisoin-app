"use client";

import { useState, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { usePatientConsultationContext } from '@/hooks/usePatientConsultationContext';
import { Patient } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Search, UserPlus, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function PatientSelector() {
  const { structureId } = useStructureId();
  const { startConsultation, isActive } = usePatientConsultationContext();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      if (!structureId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('structure_id', structureId)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setPatients(data as Patient[]);
      } catch (err) {
        console.error('Error fetching patients:', err);
        toast.error('Erreur lors du chargement des patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [structureId]);

  // Don't show selector if a patient is already active
  if (isActive) {
    return null;
  }

  const filteredPatients = patients.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(searchLower) ||
      p.last_name.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectPatient = (patient: Patient) => {
    startConsultation(patient);
    toast.success(`Consultation démarrée pour ${patient.first_name} ${patient.last_name}`);
  };

  return (
    <Card className="mb-6 border-dashed border-2 border-muted-foreground/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" />
          Sélectionner un patient
        </CardTitle>
        <CardDescription>
          Choisissez un patient pour démarrer une consultation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Patient List */}
        <ScrollArea className="h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {search ? 'Aucun patient trouvé' : 'Aucun patient disponible'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map((patient) => (
                <Button
                  key={patient.id}
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3 hover:bg-primary/10"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Dernière mise à jour:{' '}
                      {new Date(patient.updated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
