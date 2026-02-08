"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { useAutoRecording } from '@/hooks/useAutoRecording';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { TranscriptUploadDialog } from '@/components/transcripts/TranscriptUploadDialog';
import { TranscriptDetailDrawer } from '@/components/transcripts/TranscriptDetailDrawer';
import { ClinicalSuggestionsDrawer } from '@/components/clinical/ClinicalSuggestionsDrawer';
import { PatientTasksList } from '@/components/tasks/TasksList';
import PatientAppointmentsList from '@/components/patients/PatientAppointmentsList';
import { PatientHistoryTab } from '@/components/patients/PatientHistoryTab';
import { AntecedentsSection } from '@/components/medical/AntecedentsSection';
import { ConsultationsSection } from '@/components/medical/ConsultationsSection';
import { TreatmentsSummaryView } from '@/components/medical/TreatmentsSummaryView';
import { PatientPrescriptionHistory } from '@/components/prescriptions/PatientPrescriptionHistory';
import { PatientExamPrescriptionHistory } from '@/components/medical/PatientExamPrescriptionHistory';
import { OCRImportHistory } from '@/components/documents/OCRImportHistory';
import { PatientOriginSection } from '@/components/patient/PatientOriginSection';
import { PatientFileStatusCard } from '@/components/patient/PatientFileStatusCard';
import { VitalSignsSectionSafe } from '@/components/vitals/VitalSignsSection';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Patient } from '@/types/patient';
import { Antecedent } from '@/lib/antecedents';
import { Consultation } from '@/lib/consultations';
import { getOriginLabel } from '@/lib/patientStatus';

import { fetchUsersByRole, UserWithProfile } from '@/lib/delegations';
import { logActivity } from '@/lib/activity';
import { PatientTranscript } from '@/lib/transcripts';
import { formatAllForOmnidoc, formatPatientIdentity, formatAntecedents, formatTreatments, formatConsultations } from '@/lib/omnidocFormatter';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { ArrowLeft, Calendar, Mail, Phone, User, Stethoscope, Save, Mic, Square, FileText, CheckCircle, AlertCircle, Loader2, History, Lightbulb, Copy, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [practitioners, setPractitioners] = useState<UserWithProfile[]>([]);
  const [transcripts, setTranscripts] = useState<PatientTranscript[]>([]);
  const [antecedents, setAntecedents] = useState<Antecedent[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [transcriptsLoading, setTranscriptsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<PatientTranscript | null>(null);
  const [clinicalDrawerOpen, setClinicalDrawerOpen] = useState(false);
  const canEditPractitioner = isAdmin || isCoordinator;

  // Auto-recording
  const { isRecording, currentSession, startRecording, stopRecording } = useAutoRecording();
  const isRecordingThisPatient = isRecording && currentSession?.patientId === id;

  const handleRecordingToggle = async () => {
    if (!patient) return;
    const patientName = `${patient.first_name} ${patient.last_name}`;
    
    if (isRecordingThisPatient) {
      await stopRecording();
    } else {
      await startRecording(patient.id, patientName);
    }
  };

  const loadPatient = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPatient(data as Patient);
      setSelectedPractitioner(data.primary_practitioner_user_id || '');
    } catch (error) {
      console.error('Error loading patient:', error);
      toast.error('Patient non trouvé');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadPractitioners = useCallback(async () => {
    if (!structureId) return;

    try {
      const data = await fetchUsersByRole(structureId, 'practitioner');
      setPractitioners(data);
    } catch (error) {
      console.error('Error loading practitioners:', error);
    }
  }, [structureId]);

  const loadTranscripts = useCallback(async () => {
    if (!id) return;

    setTranscriptsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_transcripts')
        .select(`
          *,
          patient:patients!patient_id (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTranscripts((data || []) as PatientTranscript[]);
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setTranscriptsLoading(false);
    }
  }, [id]);

  // Load antecedents for copy functionality
  const loadAntecedents = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('patient_antecedents')
        .select('*')
        .eq('patient_id', id)
        .order('actif', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAntecedents((data || []) as Antecedent[]);
    } catch (error) {
      console.error('Error loading antecedents:', error);
    }
  }, [id]);

  // Load consultations for copy functionality
  const loadConsultations = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', id)
        .order('consultation_date', { ascending: false });
      if (error) throw error;
      // Map to Consultation type with empty practitioner for formatting
      const mapped = (data || []).map(row => ({
        ...row,
        practitioner: null,
      })) as unknown as Consultation[];
      setConsultations(mapped);
    } catch (error) {
      console.error('Error loading consultations:', error);
    }
  }, [id]);
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      loadPatient();
      loadTranscripts();
      loadAntecedents();
      loadConsultations();
    }
  }, [user, id, loadPatient, loadTranscripts, loadAntecedents, loadConsultations]);

  useEffect(() => {
    if (structureId) {
      loadPractitioners();
    }
  }, [structureId, loadPractitioners]);

  const handleSavePractitioner = async () => {
    if (!patient || !structureId || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          primary_practitioner_user_id: selectedPractitioner || null,
        })
        .eq('id', patient.id);

      if (error) throw error;

      await logActivity({
        structureId,
        actorUserId: user.id,
        action: 'PATIENT_UPDATED',
        patientId: patient.id,
        metadata: {
          field: 'primary_practitioner_user_id',
          old_value: patient.primary_practitioner_user_id,
          new_value: selectedPractitioner || null,
        },
      });

      setPatient((prev) =>
        prev ? { ...prev, primary_practitioner_user_id: selectedPractitioner || null } : null
      );
      toast.success('Praticien référent mis à jour');
    } catch (error) {
      console.error('Error updating practitioner:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const getUserName = (profile: UserWithProfile | undefined) => {
    if (!profile) return 'Non assigné';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Sans nom';
  };

  const getPractitionerName = (practitionerId: string | null) => {
    if (!practitionerId) return 'Non assigné';
    const practitioner = practitioners.find((p) => p.user_id === practitionerId);
    return getUserName(practitioner);
  };

  const getSexLabel = (sex: string | null) => {
    switch (sex) {
      case 'M':
        return 'Masculin';
      case 'F':
        return 'Féminin';
      case 'O':
        return 'Autre';
      default:
        return null;
    }
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ready':
        return { label: 'Prêt', variant: 'outline' as const, icon: <CheckCircle className="h-3 w-3 text-green-600" /> };
      case 'transcribing':
        return { label: 'En cours', variant: 'default' as const, icon: <Loader2 className="h-3 w-3 animate-spin" /> };
      case 'failed':
        return { label: 'Échec', variant: 'destructive' as const, icon: <AlertCircle className="h-3 w-3" /> };
      default:
        return { label: 'À transcrire', variant: 'secondary' as const, icon: <Mic className="h-3 w-3" /> };
    }
  };

  const isLoading = authLoading || roleLoading || structureLoading || loading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  if (!structureId) {
    return <NoAccessPage />;
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Patient non trouvé</p>
        </div>
      </DashboardLayout>
    );
  }

  const hasChanges = selectedPractitioner !== (patient.primary_practitioner_user_id || '');

  // Generate formatted text for Omnidoc
  const getFullOmnidocText = () => {
    return formatAllForOmnidoc({
      patient,
      practitionerName: getPractitionerName(patient.primary_practitioner_user_id),
      antecedents,
      consultations,
    });
  };

  const getPatientIdentityText = () => {
    return formatPatientIdentity(patient, getPractitionerName(patient.primary_practitioner_user_id));
  };

  const getAntecedentsText = () => {
    const withoutTreatments = antecedents.filter(a => a.type !== 'traitement_en_cours');
    return formatAntecedents(withoutTreatments);
  };

  const getTreatmentsText = () => {
    return formatTreatments(antecedents);
  };

  const getConsultationsText = () => {
    return formatConsultations(consultations);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 data-testid="patient-name" className="text-3xl font-bold">
                {patient.first_name} {patient.last_name}
              </h1>
              {patient.is_archived && (
                <Badge variant="secondary">Archivé</Badge>
              )}
              {patient.status === 'clos' && (
                <Badge variant="outline" className="gap-1">Dossier clôturé</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground">Fiche patient</p>
              {patient.origin && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {getOriginLabel(patient.origin)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <CopyToClipboard
              text={getFullOmnidocText()}
              label="Copier tout pour Omnidoc"
              variant="default"
            />
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setClinicalDrawerOpen(true)}
            >
              <Lightbulb className="h-4 w-4" />
              Aide à la réflexion
            </Button>
            {/* Recording button */}
            <Button 
              variant={isRecordingThisPatient ? "destructive" : "outline"}
              className={cn("gap-2", isRecordingThisPatient && "animate-pulse")}
              onClick={handleRecordingToggle}
            >
              {isRecordingThisPatient ? (
                <>
                  <Square className="h-4 w-4" />
                  Arrêter
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setTranscriptDialogOpen(true)}
            >
              <Mic className="h-4 w-4" />
              Ajouter transcription
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations
              </CardTitle>
              <CopyToClipboard
                text={getPatientIdentityText()}
                size="icon"
                variant="ghost"
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {patient.dob && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date de naissance</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(patient.dob), 'dd MMMM yyyy', { locale: fr })}
                      <span className="text-muted-foreground">
                        ({calculateAge(patient.dob)} ans)
                      </span>
                    </p>
                  </div>
                )}
                {patient.sex && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sexe</p>
                    <p>{getSexLabel(patient.sex)}</p>
                  </div>
                )}
              </div>

              {patient.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {patient.phone}
                  </p>
                </div>
              )}

              {patient.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {patient.email}
                  </p>
                </div>
              )}

              {patient.note_admin && (
                <div>
                  <p className="text-sm text-muted-foreground">Note administrative</p>
                  <p className="text-sm">{patient.note_admin}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Practitioner Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Praticien référent
              </CardTitle>
              <CardDescription>
                {canEditPractitioner
                  ? 'Assignez un praticien référent à ce patient'
                  : 'Praticien en charge de ce patient'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canEditPractitioner ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Praticien</Label>
                    <Select
                      value={selectedPractitioner || '__none__'}
                      onValueChange={(v) => setSelectedPractitioner(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un praticien" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Non assigné</SelectItem>
                        {practitioners.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {getUserName(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasChanges && (
                    <Button onClick={handleSavePractitioner} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-lg font-medium">
                  {getPractitionerName(patient.primary_practitioner_user_id)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Antecedents Section with Copy Button */}
        {structureId && user && (
          <div className="relative">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <CopyToClipboard
                text={getAntecedentsText()}
                size="icon"
                variant="ghost"
                label="Copier les antécédents"
              />
              <CopyToClipboard
                text={getTreatmentsText()}
                size="icon"
                variant="ghost"
                label="Copier les traitements"
              />
            </div>
            <AntecedentsSection
              patientId={patient.id}
              structureId={structureId}
              userId={user.id}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* Treatments Summary with Drug Interactions */}
        <TreatmentsSummaryView 
          patientId={patient.id} 
          patientContext={
            antecedents.filter(a => a.type === 'allergique' && a.actif).length > 0 
              ? `Allergies: ${antecedents.filter(a => a.type === 'allergique' && a.actif).map(a => a.description).join(', ')}` 
              : undefined
          }
        />

        {/* Prescription History Section */}
        <PatientPrescriptionHistory
          patientId={patient.id}
          patientData={{
            first_name: patient.first_name,
            last_name: patient.last_name,
            dob: patient.dob,
          }}
        />

        {/* Exam Prescription History Section */}
        <PatientExamPrescriptionHistory patientId={patient.id} />

        {/* OCR Import History */}
        <OCRImportHistory 
          patientId={patient.id} 
          onRevertComplete={loadAntecedents}
        />

        {/* Vital Signs Section */}
        {structureId && (
          <VitalSignsSectionSafe patientId={patient.id} structureId={structureId} />
        )}

        {/* Patient File Status Card - Only doctors can close/reopen */}
        <PatientFileStatusCard
          patientId={patient.id}
          status={patient.status}
          closedAt={patient.closed_at}
          closedBy={patient.closed_by}
          closedByName={patient.closed_by ? getPractitionerName(patient.closed_by) : undefined}
          onStatusChange={loadPatient}
        />

        {/* Patient Origin Section */}
        <PatientOriginSection
          patientId={patient.id}
          originType={patient.origin_type}
          originReferrerName={patient.origin_referrer_name}
          originNotes={patient.origin_notes}
          onUpdate={loadPatient}
        />

        {/* Consultations Section with Copy Button */}
        {structureId && user && (
          <div className="relative">
            <div className="absolute top-4 right-4 z-10">
              <CopyToClipboard
                text={getConsultationsText()}
                size="icon"
                variant="ghost"
                label="Copier les consultations"
              />
            </div>
            <ConsultationsSection
              patientId={patient.id}
              structureId={structureId}
              userId={user.id}
              transcripts={transcripts}
              onViewTranscript={(id) => {
                const t = transcripts.find(tr => tr.id === id);
                if (t) setSelectedTranscript(t);
              }}
              patient={{
                firstName: patient.first_name,
                lastName: patient.last_name,
                dob: patient.dob,
                sex: patient.sex,
              }}
            />
          </div>
        )}

        {/* Appointments Section */}
        <PatientAppointmentsList patientId={patient.id} />

        {/* Patient Visit History */}
        <Card data-testid="patient-history-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des visites
            </CardTitle>
            <CardDescription>
              Historique des passages en salle d'attente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {structureId && <PatientHistoryTab patientId={patient.id} structureId={structureId} />}
          </CardContent>
        </Card>

        {/* Tasks Section */}
        <PatientTasksList patientId={patient.id} />

        {/* Patient Transcripts Section */}
        <Card data-testid="patient-transcripts-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcriptions
            </CardTitle>
            <CardDescription>
              Enregistrements audio et transcriptions pour ce patient
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transcriptsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transcripts.length === 0 ? (
              <div data-testid="patient-transcripts-empty" className="text-center py-8 text-muted-foreground">
                <Mic className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Aucune transcription</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => setTranscriptDialogOpen(true)}
                >
                  <Mic className="h-4 w-4" />
                  Ajouter une transcription
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {transcripts.map((transcript) => {
                  const config = getStatusConfig(transcript.status);
                  return (
                    <button
                      key={transcript.id}
                      type="button"
                      data-testid="patient-transcript-row"
                      data-transcript-id={transcript.id}
                      data-status={transcript.status}
                      onClick={() => setSelectedTranscript(transcript)}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-full">
                          <Mic className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(transcript.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                          {transcript.duration_seconds && (
                            <p className="text-xs text-muted-foreground">
                              Durée: {Math.floor(transcript.duration_seconds / 60)}:{String(transcript.duration_seconds % 60).padStart(2, '0')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={config.variant} className="gap-1">
                        {config.icon}
                        {config.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transcript upload dialog */}
      {structureId && user && patient && (
        <TranscriptUploadDialog
          open={transcriptDialogOpen}
          onOpenChange={setTranscriptDialogOpen}
          structureId={structureId}
          userId={user.id}
          preselectedPatientId={patient.id}
          onSuccess={() => {
            toast.success('Transcription ajoutée');
            loadTranscripts();
          }}
        />
      )}

      {/* Transcript detail drawer */}
      <TranscriptDetailDrawer
        transcript={selectedTranscript}
        open={selectedTranscript !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTranscript(null);
        }}
        onRefresh={loadTranscripts}
      />

      {/* Clinical Suggestions Drawer */}
      <ClinicalSuggestionsDrawer
        open={clinicalDrawerOpen}
        onOpenChange={setClinicalDrawerOpen}
        patientName={`${patient.first_name} ${patient.last_name}`}
        patientAge={patient.dob ? calculateAge(patient.dob) : undefined}
        patientSex={patient.sex}
        transcriptText={transcripts.find(t => t.status === 'ready')?.transcript_text || undefined}
      />
    </DashboardLayout>
  );
}
