"use client";

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, FileDown, Printer, AlertTriangle } from 'lucide-react';
import { PatientAutocomplete, Patient } from './PatientAutocomplete';
import { MedicationForm } from './MedicationForm';
import { SignatureUpload } from './SignatureUpload';
import { usePrescriptions, useSignature } from '@/hooks/usePrescriptions';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Medication } from '@/lib/prescriptions';
import { downloadPrescriptionPdf, printPrescriptionPdf, PrescriptionPdfData } from '@/lib/prescriptionPdf';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useQuery } from '@tanstack/react-query';

interface PrescriptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedPatient?: Patient | null;
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

export function PrescriptionFormDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedPatient,
}: PrescriptionFormDialogProps) {
  const { structureId } = useStructureId();
  const { data: structure } = useStructureDetails(structureId);
  const { user } = useAuth();
  const { teamMembers } = useTeamMembers();
  const { createPrescription, isCreating } = usePrescriptions();
  const { signatureUrl } = useSignature();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isAld, setIsAld] = useState(false);
  const [isRenewable, setIsRenewable] = useState(false);
  const [renewalCount, setRenewalCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  // Preselect patient when opened from a context-aware action (e.g. dashboard quick actions)
  useEffect(() => {
    if (open && preselectedPatient) {
      setSelectedPatient(preselectedPatient);
    }
  }, [open, preselectedPatient]);

  // Get current user's team member profile
  const currentPractitioner = teamMembers?.find(
    (tm) => tm.user_id === user?.id
  );

  const resetForm = () => {
    setSelectedPatient(null);
    setMedications([]);
    setIsAld(false);
    setIsRenewable(false);
    setRenewalCount(1);
    setNotes('');
    setActiveTab('form');
  };

  const handleSave = async (action: 'save' | 'download' | 'print') => {
    if (!selectedPatient) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    
    // Check if patient file is closed
    if (selectedPatient.status === 'clos') {
      toast.error('Impossible de prescrire sur un dossier patient clôturé');
      return;
    }
    
    if (medications.length === 0) {
      toast.error('Ajoutez au moins un médicament');
      return;
    }
    if (!currentPractitioner) {
      toast.error('Profil praticien non trouvé');
      return;
    }

    setIsSaving(true);
    try {
      createPrescription(
        {
          structure_id: structureId!,
          patient_id: selectedPatient.id,
          practitioner_id: currentPractitioner.id,
          medications,
          is_ald: isAld,
          is_renewable: isRenewable,
          renewal_count: isRenewable ? renewalCount : 0,
          notes: notes || undefined,
          status: 'signed',
          created_by: user?.id,
        },
        {
          onSuccess: async (prescription) => {
            // Generate PDF based on action
            const pdfData: PrescriptionPdfData = {
              prescription: {
                ...prescription,
                patient: {
                  id: selectedPatient.id,
                  first_name: selectedPatient.first_name,
                  last_name: selectedPatient.last_name,
                  dob: selectedPatient.dob,
                },
              },
              structure: {
                name: structure?.name || '',
                address: structure?.address,
                phone: structure?.phone,
                email: structure?.email,
              },
              practitioner: {
                first_name: currentPractitioner.profile?.first_name || null,
                last_name: currentPractitioner.profile?.last_name || null,
                specialty: currentPractitioner.specialty,
                rpps_number: currentPractitioner.professional_id,
                adeli_number: null,
              },
              signatureUrl,
            };

            if (action === 'download') {
              await downloadPrescriptionPdf(pdfData);
            } else if (action === 'print') {
              await printPrescriptionPdf(pdfData);
            }

            resetForm();
            onOpenChange(false);
            onSuccess?.();
          },
        }
      );
    } catch (err) {
      console.error('Error saving prescription:', err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isCreating || isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nouvelle ordonnance</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Prescription</TabsTrigger>
            <TabsTrigger value="signature">Signature</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="form" className="m-0 space-y-6">
              <PatientAutocomplete
                selectedPatient={selectedPatient}
                onSelectPatient={setSelectedPatient}
                disabled={isLoading}
              />

              {/* Warning for closed patient file */}
              {selectedPatient?.status === 'clos' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Dossier clôturé</strong> — Ce dossier patient est clôturé. 
                    Il n'est pas possible de créer une nouvelle ordonnance. 
                    Veuillez contacter un médecin pour rouvrir le dossier si nécessaire.
                  </AlertDescription>
                </Alert>
              )}

              <MedicationForm
                medications={medications}
                onMedicationsChange={setMedications}
                isAld={isAld}
                onIsAldChange={setIsAld}
                isRenewable={isRenewable}
                onIsRenewableChange={setIsRenewable}
                renewalCount={renewalCount}
                onRenewalCountChange={setRenewalCount}
                notes={notes}
                onNotesChange={setNotes}
              />
            </TabsContent>

            <TabsContent value="signature" className="m-0">
              <SignatureUpload />
              
              {currentPractitioner && (
                <div className="mt-6 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium mb-2">Informations praticien</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Dr {currentPractitioner.profile?.first_name} {currentPractitioner.profile?.last_name}</p>
                    {currentPractitioner.specialty && <p>{currentPractitioner.specialty}</p>}
                    {currentPractitioner.professional_id && <p>ID: {currentPractitioner.professional_id}</p>}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('save')}
            disabled={isLoading || !selectedPatient || medications.length === 0}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('print')}
            disabled={isLoading || !selectedPatient || medications.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button
            onClick={() => handleSave('download')}
            disabled={isLoading || !selectedPatient || medications.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Télécharger PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
