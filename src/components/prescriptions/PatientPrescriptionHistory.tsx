"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pill,
  ChevronDown,
  ChevronRight,
  FileDown,
  Printer,
  MoreHorizontal,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { Prescription, Medication } from '@/lib/prescriptions';
import { downloadPrescriptionPdf, printPrescriptionPdf, PrescriptionPdfData } from '@/lib/prescriptionPdf';
import { useSignature } from '@/hooks/usePrescriptions';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useStructureId } from '@/hooks/useStructureId';

interface PatientPrescriptionHistoryProps {
  patientId: string;
  patientData?: {
    first_name: string | null;
    last_name: string | null;
    dob: string | null;
  };
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', variant: 'secondary' as const, icon: Clock },
  signed: { label: 'Signée', variant: 'default' as const, icon: CheckCircle },
  printed: { label: 'Imprimée', variant: 'outline' as const, icon: Printer },
  cancelled: { label: 'Annulée', variant: 'destructive' as const, icon: AlertTriangle },
};

// Hook to fetch prescriptions for a specific patient
function usePatientPrescriptions(patientId: string) {
  return useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          practitioner:team_members(id, job_title, specialty, professional_id)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p) => ({
        ...p,
        medications: Array.isArray(p.medications)
          ? (p.medications as unknown as Medication[])
          : [],
      })) as Prescription[];
    },
    enabled: !!patientId,
  });
}

// Hook to fetch structure details
function useStructureDetails(structureId: string | null) {
  return useQuery({
    queryKey: ['structure', structureId],
    queryFn: async () => {
      if (!structureId) return null;
      const { data, error } = await supabase
        .from('structures')
        .select('*')
        .eq('id', structureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!structureId,
  });
}

export function PatientPrescriptionHistory({
  patientId,
  patientData,
}: PatientPrescriptionHistoryProps) {
  const { data: prescriptions = [], isLoading } = usePatientPrescriptions(patientId);
  const { structureId } = useStructureId();
  const { data: structure } = useStructureDetails(structureId);
  const { teamMembers } = useTeamMembers();
  const { signatureUrl } = useSignature();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDownload = async (prescription: Prescription) => {
    const practitioner = teamMembers?.find((tm) => tm.id === prescription.practitioner_id);

    const pdfData: PrescriptionPdfData = {
      prescription: {
        ...prescription,
        patient: patientData
          ? {
              id: patientId,
              first_name: patientData.first_name,
              last_name: patientData.last_name,
              dob: patientData.dob,
            }
          : undefined,
      },
      structure: {
        name: structure?.name || '',
        address: structure?.address,
        phone: structure?.phone,
        email: structure?.email,
      },
      practitioner: {
        first_name: practitioner?.profile?.first_name || null,
        last_name: practitioner?.profile?.last_name || null,
        specialty: practitioner?.specialty,
        rpps_number: practitioner?.professional_id,
        adeli_number: null,
      },
      signatureUrl,
    };

    await downloadPrescriptionPdf(pdfData);
  };

  const handlePrint = async (prescription: Prescription) => {
    const practitioner = teamMembers?.find((tm) => tm.id === prescription.practitioner_id);

    const pdfData: PrescriptionPdfData = {
      prescription: {
        ...prescription,
        patient: patientData
          ? {
              id: patientId,
              first_name: patientData.first_name,
              last_name: patientData.last_name,
              dob: patientData.dob,
            }
          : undefined,
      },
      structure: {
        name: structure?.name || '',
        address: structure?.address,
        phone: structure?.phone,
        email: structure?.email,
      },
      practitioner: {
        first_name: practitioner?.profile?.first_name || null,
        last_name: practitioner?.profile?.last_name || null,
        specialty: practitioner?.specialty,
        rpps_number: practitioner?.professional_id,
        adeli_number: null,
      },
      signatureUrl,
    };

    await printPrescriptionPdf(pdfData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show recent prescriptions (last 5) with expand option
  const recentPrescriptions = prescriptions.slice(0, 5);
  const hasMore = prescriptions.length > 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Ordonnances
          {prescriptions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {prescriptions.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Historique des prescriptions médicales</CardDescription>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aucune ordonnance pour ce patient</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPrescriptions.map((prescription) => {
              const StatusIcon = STATUS_CONFIG[prescription.status].icon;
              const isExpanded = expandedIds.has(prescription.id);

              return (
                <Collapsible
                  key={prescription.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(prescription.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {format(new Date(prescription.created_at), 'dd MMM yyyy', {
                                  locale: fr,
                                })}
                              </span>
                              <Badge
                                variant={STATUS_CONFIG[prescription.status].variant}
                                className="text-xs"
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {STATUS_CONFIG[prescription.status].label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{prescription.medications.length} médicament(s)</span>
                              {prescription.is_ald && (
                                <Badge variant="destructive" className="text-xs">
                                  ALD
                                </Badge>
                              )}
                              {prescription.is_renewable && (
                                <Badge variant="outline" className="text-xs">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  x{prescription.renewal_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(prescription.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {isExpanded ? 'Réduire' : 'Voir détails'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(prescription);
                              }}
                            >
                              <FileDown className="h-4 w-4 mr-2" />
                              Télécharger PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrint(prescription);
                              }}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t">
                        <ScrollArea className="max-h-[200px]">
                          <div className="space-y-2 pt-3">
                            {prescription.medications.map((med, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-md bg-muted/50 text-sm"
                              >
                                <div className="font-medium flex items-center gap-2">
                                  {med.name}
                                  {med.isNonSubstitutable && (
                                    <Badge variant="outline" className="text-xs text-destructive">
                                      NS
                                    </Badge>
                                  )}
                                </div>
                                {med.dosage && (
                                  <p className="text-muted-foreground">{med.dosage}</p>
                                )}
                                {med.duration && (
                                  <p className="text-muted-foreground text-xs">
                                    Durée: {med.duration}
                                  </p>
                                )}
                                {med.instructions && (
                                  <p className="text-muted-foreground text-xs mt-1">
                                    {med.instructions}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        {prescription.notes && (
                          <div className="mt-3 p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-sm">
                            <p className="text-yellow-800 dark:text-yellow-200">
                              Note: {prescription.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(prescription)}
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(prescription)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Imprimer
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            {hasMore && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Voir les {prescriptions.length - 5} autres ordonnances
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
