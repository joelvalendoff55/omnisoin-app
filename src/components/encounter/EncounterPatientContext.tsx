"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  User, 
  ExternalLink, 
  History, 
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { PatientAntecedentsSummary } from '@/components/medical/PatientAntecedentsSummary';
import { VitalSignsSectionSafe } from '@/components/vitals';
import type { EncounterWithRelations } from '@/types/encounter';

interface PreviousEncounter {
  id: string;
  started_at: string;
  status: string;
  mode: string;
}

interface EncounterPatientContextProps {
  encounter: EncounterWithRelations;
}

export function EncounterPatientContext({ encounter }: EncounterPatientContextProps) {
  const [previousEncounters, setPreviousEncounters] = useState<PreviousEncounter[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const patient = encounter.patient;
  const patientId = patient?.id;

  // Fetch previous encounters
  useEffect(() => {
    async function fetchPreviousEncounters() {
      if (!patientId) return;
      
      setLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('encounters')
          .select('id, started_at, status, mode')
          .eq('patient_id', patientId)
          .neq('id', encounter.id)
          .order('started_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setPreviousEncounters(data || []);
      } catch (err) {
        console.error('Error fetching previous encounters:', err);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchPreviousEncounters();
  }, [patientId, encounter.id]);

  if (!patient) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucun patient associé</p>
        </CardContent>
      </Card>
    );
  }

  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-4 pr-4">
        {/* Patient header */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {patient.first_name} {patient.last_name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {age !== null && <span>{age} ans</span>}
                    {patient.sex && (
                      <>
                        <span>•</span>
                        <span>{patient.sex === 'M' ? 'Homme' : 'Femme'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Link href={`/patients/${patientId}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Dossier
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {patient.dob && (
              <p className="text-xs text-muted-foreground">
                Né(e) le {format(new Date(patient.dob), "d MMMM yyyy", { locale: fr })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Antecedents summary */}
        {patientId && (
          <PatientAntecedentsSummary patientId={patientId} />
        )}

        {/* Quick vitals display */}
        {patientId && encounter.structure_id && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-pink-500" />
                Dernières constantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VitalSignsSectionSafe
                patientId={patientId}
                structureId={encounter.structure_id}
                compact
              />
            </CardContent>
          </Card>
        )}

        {/* Consultation reason if from queue */}
        {encounter.queue_entry?.reason && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Motif de consultation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{encounter.queue_entry.reason}</p>
            </CardContent>
          </Card>
        )}

        {/* Previous encounters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Épisodes précédents
              {previousEncounters.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {previousEncounters.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : previousEncounters.length > 0 ? (
              <div className="space-y-2">
                {previousEncounters.map((enc) => (
                  <Link
                    key={enc.id}
                    to={`/encounter/${enc.id}`}
                    className="block p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(enc.started_at), "d MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <Badge 
                        variant={enc.status === 'completed' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {enc.status === 'completed' ? 'Terminé' : enc.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun épisode précédent
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assigned team */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Équipe assignée</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {encounter.assigned_practitioner && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Médecin</p>
                  <p className="text-xs text-muted-foreground">
                    {encounter.assigned_practitioner.job_title}
                  </p>
                </div>
              </div>
            )}
            {encounter.assigned_assistant && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Assistant(e)</p>
                  <p className="text-xs text-muted-foreground">
                    {encounter.assigned_assistant.job_title}
                  </p>
                </div>
              </div>
            )}
            {!encounter.assigned_practitioner && !encounter.assigned_assistant && (
              <p className="text-sm text-muted-foreground">Aucune assignation</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
